import { useEffect, useMemo, useState } from 'react';
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { Banknote, CheckCircle2, Plus, Trash2, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { date as fmtDate, hours as fmtHours, money, moneyWhole } from '@/lib/format';
import { useT } from '@/lib/i18n/context';
import { projectCost, projectValue, type ProjectInvoice } from '../api';
import {
  useDeleteProjectInvoice,
  useFinanceSummary,
  useMarkInvoicePaid,
  useProjectInvoices,
  useSaveProjectInvoice,
} from '../hooks';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Finanse projektu na żywo + fakturowanie etapami: projekt może mieć
 * wiele faktur (np. za kolejne etapy), każda z własnym terminem i statusem.
 */
export function ProjectInvoiceSection({ projectId }: { projectId: string }) {
  const t = useT();
  const now = new Date();
  const summary = useFinanceSummary(iso(startOfMonth(now)), iso(endOfMonth(now)));
  const invoices = useProjectInvoices(projectId);
  const save = useSaveProjectInvoice();
  const markPaid = useMarkInvoicePaid();
  const remove = useDeleteProjectInvoice();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectInvoice | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sentDate, setSentDate] = useState(iso(now));
  const [dueDate, setDueDate] = useState(iso(addDays(now, 30)));
  const [paidSheet, setPaidSheet] = useState<ProjectInvoice | null>(null);
  const [paidDate, setPaidDate] = useState(iso(now));
  const [toDelete, setToDelete] = useState<ProjectInvoice | null>(null);

  const p = useMemo(
    () => (summary.data ?? []).find((row) => row.project_id === projectId) ?? null,
    [summary.data, projectId],
  );

  const list = invoices.data ?? [];
  const value = p ? projectValue(p) : 0;
  const invoicedTotal = list.reduce((s, i) => s + i.amount, 0);

  useEffect(() => {
    if (formOpen) {
      setAmount(
        editing
          ? String(editing.amount)
          : String(Math.max(Math.round(value - invoicedTotal), 0) || ''),
      );
      setNote(editing?.note ?? '');
      setSentDate(editing?.sent_at ?? iso(new Date()));
      setDueDate(editing?.due_at ?? iso(addDays(new Date(), 30)));
    }
    // wartości „prefill" celowo tylko przy otwarciu formularza
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen, editing]);

  if (!p) return null;

  const cost = projectCost(p);
  const profit = value - cost;
  const paidTotal = list
    .filter((i) => i.paid_at)
    .reduce((s, i) => s + i.amount, 0);
  const awaiting = invoicedTotal - paidTotal;

  const submit = () => {
    const parsed = Number(amount.trim().replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0 || !sentDate) return;
    save.mutate(
      {
        id: editing?.id ?? null,
        payload: {
          project_id: projectId,
          amount: parsed,
          sent_at: sentDate,
          due_at: dueDate || null,
          note: note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setFormOpen(false);
          setEditing(null);
        },
      },
    );
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="size-5 text-accent" strokeWidth={1.8} />
          <h2 className="text-base font-semibold">{t('fin.projectFinance')}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Plus className="size-4" />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          {t('fin.invoiceBtn')}
        </Button>
      </div>

      <div className="tabular-nums rounded-xl bg-surface p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">{t('fin.valueWithExtras')}</span>
          <span>{moneyWhole(value)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">
            {t('fin.laborCost', { hours: fmtHours(p.hours_total) })}
          </span>
          <span>{moneyWhole(p.labor_cost_total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">{t('fin.receipts')}</span>
          <span>{moneyWhole(p.expenses_total)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold">
          <span>{t('fin.remains')}</span>
          <span className={cn(profit >= 0 ? 'text-success' : 'text-error')}>
            {profit >= 0 ? '+' : ''}
            {moneyWhole(profit)}
          </span>
        </div>
      </div>

      {list.length > 0 && (
        <>
          <p className="tabular-nums text-xs text-text-secondary">
            {t('fin.invoicedOf', { a: moneyWhole(invoicedTotal), b: moneyWhole(value) })}
            {awaiting > 0 ? ` • ${t('fin.awaitingLc', { amount: moneyWhole(awaiting) })}` : ''}
          </p>
          <div className="flex flex-col gap-2">
            {list.map((inv) => (
              <button
                key={inv.id}
                type="button"
                className="press flex items-center gap-3 rounded-xl bg-surface p-3 text-left"
                onClick={() => {
                  setEditing(inv);
                  setFormOpen(true);
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="tabular-nums text-sm font-semibold">{money(inv.amount)}</p>
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
                {inv.paid_at ? (
                  <Badge tone="success">{t('fin.paidBadge')}</Badge>
                ) : (
                  <Badge tone="warning">{t('fin.waitingBadge')}</Badge>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <Sheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? t('fin.editInvoice') : t('fin.newInvoice')}
      >
        <div className="flex flex-col gap-4">
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
          <Button size="lg" fullWidth loading={save.isPending} onClick={submit}>
            {editing ? t('ts.saveChanges') : t('fin.addInvoice')}
          </Button>
          {editing && !editing.paid_at && (
            <Button
              icon={<CheckCircle2 className="size-5" />}
              fullWidth
              onClick={() => {
                setPaidDate(iso(new Date()));
                setPaidSheet(editing);
                setFormOpen(false);
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
                      setFormOpen(false);
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
        description={toDelete ? t('fin.deleteInvoiceDesc', { amount: money(toDelete.amount) }) : ''}
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete.id, {
              onSuccess: () => {
                setToDelete(null);
                setFormOpen(false);
                setEditing(null);
              },
            });
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </Card>
  );
}
