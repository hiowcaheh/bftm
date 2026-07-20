import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import { CheckCircle2, FileText, Lightbulb, Plus, Trash2, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { date as fmtDate, hours as fmtHours, money, moneyWhole } from '@/lib/format';
import { useT } from '@/lib/i18n/context';
import type { AllInvoice, InvoiceSuggestion } from '../api';
import {
  useAllInvoices,
  useDeleteProjectInvoice,
  useFinanceSummary,
  useInvoiceHours,
  useInvoiceSuggestions,
  useMarkInvoicePaid,
  useSaveProjectInvoice,
  useUninvoicedHours,
} from '../hooks';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Finanse → Faktury projektów: wszystkie faktury w jednym miejscu
 * + podpowiedzi „do zafakturowania" (zatwierdzone godziny / pozostałe fastpris).
 * Faktura z godzin oznacza wpisy jako zafakturowane (RPC invoice_project_hours);
 * skasowanie faktury przywraca je (trigger w bazie).
 */
export function InvoicesSection() {
  const t = useT();
  const suggestions = useInvoiceSuggestions();
  const invoices = useAllInvoices();
  const summary = useFinanceSummary('2000-01-01', '2100-01-01');
  const invoiceHours = useInvoiceHours();
  const save = useSaveProjectInvoice();
  const markPaid = useMarkInvoicePaid();
  const remove = useDeleteProjectInvoice();

  // faktura z godzin (podpowiedź godzinowa)
  const [hoursSheet, setHoursSheet] = useState<InvoiceSuggestion | null>(null);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  // faktura ręczna / fastpris
  const [manualOpen, setManualOpen] = useState(false);
  const [manualProject, setManualProject] = useState('');
  const [editing, setEditing] = useState<AllInvoice | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sentDate, setSentDate] = useState(iso(new Date()));
  const [dueDate, setDueDate] = useState(iso(addDays(new Date(), 30)));
  const [paidSheet, setPaidSheet] = useState<AllInvoice | null>(null);
  const [paidDate, setPaidDate] = useState(iso(new Date()));
  const [toDelete, setToDelete] = useState<AllInvoice | null>(null);

  const previewHours = useUninvoicedHours(hoursSheet?.projectId ?? null, periodFrom, periodTo);
  const previewAmount =
    hoursSheet && hoursSheet.hours > 0
      ? (previewHours.data ?? 0) * (hoursSheet.amount / hoursSheet.hours)
      : 0;

  useEffect(() => {
    if (hoursSheet) {
      setPeriodFrom(hoursSheet.from);
      setPeriodTo(hoursSheet.to);
      setNote('');
      setSentDate(iso(new Date()));
      setDueDate(iso(addDays(new Date(), 30)));
    }
  }, [hoursSheet]);

  const openManual = (inv: AllInvoice | null, suggestion?: InvoiceSuggestion) => {
    setEditing(inv);
    setManualProject(inv?.project_id ?? suggestion?.projectId ?? '');
    setAmount(inv ? String(inv.amount) : suggestion ? String(Math.round(suggestion.amount)) : '');
    setNote(inv?.note ?? '');
    setSentDate(inv?.sent_at ?? iso(new Date()));
    setDueDate(inv?.due_at ?? iso(addDays(new Date(), 30)));
    setManualOpen(true);
  };

  const submitManual = () => {
    const parsed = Number(amount.trim().replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0 || !sentDate || !manualProject) return;
    save.mutate(
      {
        id: editing?.id ?? null,
        payload: {
          project_id: manualProject,
          amount: parsed,
          sent_at: sentDate,
          due_at: dueDate || null,
          note: note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setManualOpen(false);
          setEditing(null);
        },
      },
    );
  };

  const submitHours = () => {
    if (!hoursSheet || !periodFrom || !periodTo || (previewHours.data ?? 0) <= 0) return;
    invoiceHours.mutate(
      {
        projectId: hoursSheet.projectId,
        from: periodFrom,
        to: periodTo,
        sentAt: sentDate,
        dueAt: dueDate || null,
        note: note.trim() || null,
      },
      { onSuccess: () => setHoursSheet(null) },
    );
  };

  const list = invoices.data ?? [];
  const sugg = suggestions.data ?? [];
  const today = iso(new Date());
  const projectOptions = (summary.data ?? []).map((p) => ({
    value: p.project_id,
    label: p.name,
  }));

  const invoiceBadge = (inv: AllInvoice) =>
    inv.paid_at ? (
      <Badge tone="success">{t('fin.paidBadge')}</Badge>
    ) : inv.due_at && inv.due_at < today ? (
      <Badge tone="error">{t('fin.overdueBadge')}</Badge>
    ) : (
      <Badge tone="warning">{t('fin.waitingBadge')}</Badge>
    );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t('fin.invoicesSection')}</h2>
        <Button
          variant="ghost"
          size="sm"
          icon={<Plus className="size-4" />}
          onClick={() => openManual(null)}
        >
          {t('fin.invoiceBtn')}
        </Button>
      </div>

      {/* Podpowiedzi: co można zafakturować */}
      {sugg.length > 0 && (
        <Card className="flex flex-col gap-2 border-l-4 border-warning p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="size-5 text-warning" strokeWidth={1.8} />
            {t('fin.toInvoice')}
          </p>
          {sugg.map((s) => (
            <button
              key={`${s.projectId}-${s.kind}`}
              type="button"
              className="press flex items-center gap-3 rounded-xl bg-surface p-3 text-left"
              onClick={() => (s.kind === 'hours' ? setHoursSheet(s) : openManual(null, s))}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color ?? 'var(--color-accent)' }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="tabular-nums text-xs text-text-secondary">
                  {s.kind === 'hours'
                    ? t('fin.suggHours', { h: fmtHours(s.hours), amount: moneyWhole(s.amount) })
                    : t('fin.suggFixed', { amount: moneyWhole(s.amount) })}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                {t('fin.invoiceNow')}
              </span>
            </button>
          ))}
        </Card>
      )}

      {/* Wszystkie faktury */}
      {list.length === 0 && sugg.length === 0 ? (
        <Card className="flex items-center gap-3 p-4 text-sm text-text-secondary">
          <FileText className="size-5 shrink-0" strokeWidth={1.8} />
          {t('fin.noInvoices')}
        </Card>
      ) : (
        list.length > 0 && (
          <Card className="flex flex-col gap-2 p-3">
            {list.map((inv) => (
              <button
                key={inv.id}
                type="button"
                className="press flex items-center gap-3 rounded-xl bg-surface p-3 text-left"
                onClick={() => openManual(inv)}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: inv.project?.color ?? 'var(--color-accent)' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {inv.project?.name ?? '—'}
                    <span className="tabular-nums font-semibold"> • {money(inv.amount)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {[
                      inv.note,
                      t('fin.sentAt', { date: fmtDate(inv.sent_at) }),
                      inv.paid_at
                        ? t('fin.paidAt', { date: fmtDate(inv.paid_at) })
                        : inv.due_at
                          ? t('fin.dueAt', { date: fmtDate(inv.due_at) })
                          : null,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                </div>
                {invoiceBadge(inv)}
              </button>
            ))}
          </Card>
        )
      )}

      {/* Faktura z godzin — okres + podgląd na żywo */}
      <Sheet
        open={hoursSheet !== null}
        onClose={() => setHoursSheet(null)}
        title={t('fin.invoiceFromHours')}
      >
        {hoursSheet && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">{hoursSheet.name}</p>
            <div className="grid grid-cols-2 gap-3">
              <DateField
                label={t('fin.periodFrom')}
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
              <DateField
                label={t('fin.periodTo')}
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>
            <div className="tabular-nums rounded-xl bg-surface p-3 text-sm">
              {(previewHours.data ?? 0) > 0 ? (
                <span className="font-semibold">
                  {t('fin.willInvoice', {
                    h: fmtHours(previewHours.data ?? 0),
                    amount: moneyWhole(previewAmount),
                  })}
                </span>
              ) : (
                <span className="text-text-secondary">{t('fin.noApprovedInPeriod')}</span>
              )}
            </div>
            <Input
              label={t('fin.noteField')}
              placeholder={t('fin.notePh')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <DateField
                label={t('fin.sentDate')}
                value={sentDate}
                onChange={(e) => {
                  setSentDate(e.target.value);
                  if (e.target.value) setDueDate(iso(addDays(new Date(e.target.value), 30)));
                }}
              />
              <DateField
                label={t('fin.dueDate')}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <Button
              size="lg"
              fullWidth
              loading={invoiceHours.isPending}
              disabled={(previewHours.data ?? 0) <= 0}
              onClick={submitHours}
            >
              {t('fin.addInvoice')}
            </Button>
          </div>
        )}
      </Sheet>

      {/* Faktura ręczna / edycja */}
      <Sheet
        open={manualOpen}
        onClose={() => {
          setManualOpen(false);
          setEditing(null);
        }}
        title={editing ? t('fin.editInvoice') : t('fin.newInvoice')}
      >
        <div className="flex flex-col gap-4">
          <Select
            label={t('fin.projectField')}
            options={projectOptions}
            placeholder={t('fin.projectPh')}
            value={manualProject}
            disabled={!!editing}
            onChange={(e) => setManualProject(e.target.value)}
          />
          <Input
            label={t('fin.amountField')}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label={t('fin.noteField')}
            placeholder={t('fin.notePh')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label={t('fin.sentDate')}
              value={sentDate}
              onChange={(e) => {
                setSentDate(e.target.value);
                if (e.target.value && !editing) {
                  setDueDate(iso(addDays(new Date(e.target.value), 30)));
                }
              }}
            />
            <DateField
              label={t('fin.dueDate')}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <Button size="lg" fullWidth loading={save.isPending} onClick={submitManual}>
            {editing ? t('ts.saveChanges') : t('fin.addInvoice')}
          </Button>
          {editing && !editing.paid_at && (
            <Button
              icon={<CheckCircle2 className="size-5" />}
              fullWidth
              onClick={() => {
                setPaidDate(iso(new Date()));
                setPaidSheet(editing);
                setManualOpen(false);
              }}
            >
              {t('fin.markPaid')}
            </Button>
          )}
          {editing?.paid_at && (
            <Button
              variant="secondary"
              fullWidth
              icon={<Undo2 className="size-5" />}
              loading={markPaid.isPending}
              onClick={() =>
                markPaid.mutate(
                  { id: editing.id, paidAt: null },
                  {
                    onSuccess: () => {
                      setManualOpen(false);
                      setEditing(null);
                    },
                  },
                )
              }
            >
              {t('fin.undoPaid')}
            </Button>
          )}
          {editing && (
            <Button
              variant="destructive"
              fullWidth
              icon={<Trash2 className="size-5" />}
              onClick={() => setToDelete(editing)}
            >
              {t('fin.deleteInvoice')}
            </Button>
          )}
        </div>
      </Sheet>

      {/* Data wpłaty */}
      <Sheet
        open={paidSheet !== null}
        onClose={() => setPaidSheet(null)}
        title={t('fin.invoicePaidTitle')}
      >
        <div className="flex flex-col gap-4">
          <DateField
            label={t('fin.paidDateField')}
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
          />
          <Button
            size="lg"
            fullWidth
            loading={markPaid.isPending}
            onClick={() => {
              if (paidSheet) {
                markPaid.mutate(
                  { id: paidSheet.id, paidAt: paidDate },
                  {
                    onSuccess: () => {
                      setPaidSheet(null);
                      setEditing(null);
                    },
                  },
                );
              }
            }}
          >
            {t('common.save')}
          </Button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={toDelete !== null}
        title={t('fin.deleteInvoiceTitle')}
        description={
          toDelete
            ? `${t('fin.deleteInvoiceDesc', { amount: money(toDelete.amount) })} ${t('fin.deleteInvoiceHours')}`
            : ''
        }
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete.id, {
              onSuccess: () => {
                setToDelete(null);
                setManualOpen(false);
                setEditing(null);
              },
            });
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
