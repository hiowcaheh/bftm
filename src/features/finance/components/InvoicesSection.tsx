import { useState } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { CheckCircle2, ChevronRight, FileText, Plus, ReceiptText, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { date as fmtDate, hours as fmtHours, money, moneyWhole } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import type { AllInvoice, InvoiceSuggestion } from '../api';
import {
  useAllInvoices,
  useDeleteProjectInvoice,
  useFinanceSummary,
  useInvoiceSuggestions,
  useMarkInvoicePaid,
  useSaveProjectInvoice,
} from '../hooks';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Finanse → Faktury projektów: wszystkie faktury w jednym miejscu
 * + podpowiedzi „do zafakturowania" (zatwierdzone godziny / pozostałe fastpris).
 * Faktura z godzin oznacza wpisy jako zafakturowane (RPC invoice_project_hours);
 * skasowanie faktury przywraca je (trigger w bazie).
 */
export function InvoicesSection() {
  const { t, tp, dateLocale } = useI18n();
  const suggestions = useInvoiceSuggestions();
  const invoices = useAllInvoices();
  const summary = useFinanceSummary('2000-01-01', '2100-01-01');
  const save = useSaveProjectInvoice();
  const markPaid = useMarkInvoicePaid();
  const remove = useDeleteProjectInvoice();

  // faktura ręczna / z podpowiedzi (edytowalna: kwota, data, notatka)
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

  const list = invoices.data ?? [];
  const sugg = suggestions.data ?? [];
  const today = iso(new Date());
  const projectOptions = (summary.data ?? []).map((p) => ({
    value: p.project_id,
    label: p.name,
  }));

  // Chronologia wpływów: najbliższy termin na górze (bez terminu — na końcu),
  // opłacone — najnowsza wpłata na górze.
  const byDueAsc = (a: AllInvoice, b: AllInvoice) =>
    (a.due_at ?? '9999-12-31').localeCompare(b.due_at ?? '9999-12-31');
  const byPaidDesc = (a: AllInvoice, b: AllInvoice) =>
    (b.paid_at ?? '').localeCompare(a.paid_at ?? '');

  // grupowanie faktur wg statusu — żeby od razu było widać które czekają
  const groups: Array<{
    key: string;
    label: string;
    dot: string;
    items: AllInvoice[];
  }> = [
    {
      key: 'overdue',
      label: t('fin.grpOverdue'),
      dot: 'bg-error',
      items: list.filter((i) => !i.paid_at && i.due_at && i.due_at < today).sort(byDueAsc),
    },
    {
      key: 'waiting',
      label: t('fin.grpWaiting'),
      dot: 'bg-warning',
      items: list.filter((i) => !i.paid_at && !(i.due_at && i.due_at < today)).sort(byDueAsc),
    },
    {
      key: 'paid',
      label: t('fin.grpPaid'),
      dot: 'bg-success',
      items: list.filter((i) => i.paid_at).sort(byPaidDesc),
    },
  ].filter((g) => g.items.length > 0);

  // Licznik dni po prawej: ile do terminu / ile po terminie / ile od wpłaty.
  const daysChip = (inv: AllInvoice): { text: string; className: string } | null => {
    const now = new Date();
    const word = (n: number) => tp('ts.day', n);
    if (inv.paid_at) {
      const n = differenceInCalendarDays(now, parseISO(inv.paid_at));
      return {
        text: n <= 0 ? t('fin.today') : t('fin.daysAgo', { n, d: word(n) }),
        className: 'bg-success-soft text-success',
      };
    }
    if (!inv.due_at) return null;
    const n = differenceInCalendarDays(parseISO(inv.due_at), now);
    if (n < 0) {
      return {
        text: t('fin.overdueDays', { n: -n, d: word(-n) }),
        className: 'bg-error-soft text-error',
      };
    }
    if (n <= 1) {
      return { text: n === 0 ? t('fin.today') : t('fin.tomorrow'), className: 'bg-warning text-white' };
    }
    return { text: t('fin.inDays', { n, d: word(n) }), className: 'bg-warning-soft text-warning' };
  };

  const invoiceRow = (inv: AllInvoice) => {
    // Kalendarzyk: nieopłacona → termin płatności, opłacona → dzień wpłaty.
    const day = parseISO(inv.paid_at ?? inv.due_at ?? inv.sent_at);
    const band = inv.paid_at
      ? 'bg-success'
      : inv.due_at && inv.due_at < today
        ? 'bg-error'
        : 'bg-warning';
    const chip = daysChip(inv);
    return (
      <button
        key={inv.id}
        type="button"
        className="press flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => openManual(inv)}
      >
        <div className="w-11 shrink-0 overflow-hidden rounded-[10px] bg-white text-center shadow-[0_0_0_1px_var(--color-line),0_1px_2px_rgba(0,0,0,0.06)]">
          <div
            className={cn(
              'pt-0.5 pb-px text-[9.5px] font-extrabold tracking-[0.08em] text-white uppercase',
              band,
            )}
          >
            {format(day, 'LLL', { locale: dateLocale }).replace('.', '')}
          </div>
          <div className="tabular-nums pt-1 pb-1.5 text-[19px] leading-none font-bold">
            {format(day, 'd')}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: inv.project?.color ?? 'var(--color-accent)' }}
            />
            <span className="truncate">{inv.project?.name ?? '—'}</span>
          </p>
          {/* Kwota w drugiej linii — przy długiej nazwie projektu nie jest ucinana */}
          <p className="mt-0.5 truncate text-xs text-text-secondary">
            <span className="tabular-nums text-[13px] font-bold text-text">{money(inv.amount)}</span>
            {' • '}
            {[t('fin.sentAt', { date: fmtDate(inv.sent_at) }), inv.note].filter(Boolean).join(' • ')}
          </p>
        </div>
        {chip && (
          <span
            className={cn(
              'tabular-nums shrink-0 rounded-full px-2.5 py-1 text-[13px] font-bold whitespace-nowrap',
              chip.className,
            )}
          >
            {chip.text}
          </span>
        )}
      </button>
    );
  };

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

      {list.length === 0 && sugg.length === 0 ? (
        <Card className="flex items-center gap-3 p-4 text-sm text-text-secondary">
          <FileText className="size-5 shrink-0" strokeWidth={1.8} />
          {t('fin.noInvoices')}
        </Card>
      ) : (
        <Card className="flex flex-col divide-y divide-line overflow-hidden p-0">
          {/* Podpowiedzi AI: co można zafakturować */}
          {sugg.length > 0 && (
            <div className="flex flex-col gap-2 bg-gradient-to-b from-accent-soft/40 to-transparent p-4">
              <div className="flex items-center gap-2">
                <ReceiptText className="size-5 text-accent" strokeWidth={1.8} />
                <p className="text-sm font-semibold">{t('fin.toInvoice')}</p>
              </div>
              {sugg.map((s) => (
                <button
                  key={`${s.projectId}-${s.kind}`}
                  type="button"
                  className="press flex items-center gap-3 rounded-xl bg-white/70 p-3 text-left shadow-(--shadow-card)"
                  onClick={() => openManual(null, s)}
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
                  <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white">
                    {t('fin.invoiceNow')}
                    <ChevronRight className="size-3.5" strokeWidth={2.4} />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Faktury pogrupowane statusem */}
          {groups.map((g) => (
            <div key={g.key} className="flex flex-col">
              <div className="flex items-center gap-2 bg-surface/50 px-4 py-2">
                <span className={cn('size-2 rounded-full', g.dot)} />
                <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  {g.label}
                </span>
                <span className="tabular-nums text-xs text-text-secondary/60">
                  {g.items.length}
                </span>
              </div>
              <div className="flex flex-col divide-y divide-line/60">
                {g.items.map(invoiceRow)}
              </div>
            </div>
          ))}
        </Card>
      )}


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
