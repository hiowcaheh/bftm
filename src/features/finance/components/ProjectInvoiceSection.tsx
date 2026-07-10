import { useMemo, useState } from 'react';
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { Banknote, CheckCircle2, Send, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { date as fmtDate, hours as fmtHours, money, moneyWhole } from '@/lib/format';
import { projectCost, projectValue } from '../api';
import { useFinanceSummary, useUpdateProjectInvoice } from '../hooks';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Finanse projektu na żywo: wartość, koszty (praca + paragony), zysk
 * oraz fakturowanie — „wysłana dnia / termin / opłacona".
 */
export function ProjectInvoiceSection({ projectId }: { projectId: string }) {
  const now = new Date();
  const summary = useFinanceSummary(iso(startOfMonth(now)), iso(endOfMonth(now)));
  const invoice = useUpdateProjectInvoice(projectId);

  const [sentOpen, setSentOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [sentDate, setSentDate] = useState(iso(now));
  const [dueDate, setDueDate] = useState(iso(addDays(now, 30)));
  const [amount, setAmount] = useState('');
  const [paidDate, setPaidDate] = useState(iso(now));

  const p = useMemo(
    () => (summary.data ?? []).find((row) => row.project_id === projectId) ?? null,
    [summary.data, projectId],
  );
  if (!p) return null;

  const value = projectValue(p);
  const cost = projectCost(p);
  const profit = value - cost;
  const state = p.invoice_paid_at ? 'paid' : p.invoice_sent_at ? 'sent' : 'none';

  const openSent = () => {
    setSentDate(iso(now));
    setDueDate(iso(addDays(now, 30)));
    setAmount(String(Math.round(p.invoice_amount ?? value)));
    setSentOpen(true);
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="size-5 text-accent" strokeWidth={1.8} />
          <h2 className="text-base font-semibold">Finanse projektu</h2>
        </div>
        {state === 'paid' && <Badge tone="success">Opłacony</Badge>}
        {state === 'sent' && <Badge tone="warning">Czeka na płatność</Badge>}
      </div>

      <div className="tabular-nums rounded-xl bg-surface p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Wartość (z dodatkowymi)</span>
          <span>{moneyWhole(value)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">
            Koszt pracy ({fmtHours(p.hours_total)})
          </span>
          <span>{moneyWhole(p.labor_cost_total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Paragony</span>
          <span>{moneyWhole(p.expenses_total)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold">
          <span>Zostaje</span>
          <span className={cn(profit >= 0 ? 'text-success' : 'text-error')}>
            {profit >= 0 ? '+' : ''}
            {moneyWhole(profit)}
          </span>
        </div>
      </div>

      {state !== 'none' && (
        <p className="text-xs text-text-secondary">
          Faktura {p.invoice_amount != null ? `na ${money(p.invoice_amount)} ` : ''}
          wysłana {p.invoice_sent_at ? fmtDate(p.invoice_sent_at) : ''}
          {p.invoice_due_at ? `, termin ${fmtDate(p.invoice_due_at)}` : ''}
          {p.invoice_paid_at ? ` — opłacona ${fmtDate(p.invoice_paid_at)}` : ''}
        </p>
      )}

      {state === 'none' && (
        <Button
          variant="secondary"
          fullWidth
          icon={<Send className="size-5" />}
          onClick={openSent}
        >
          Faktura wysłana
        </Button>
      )}
      {state === 'sent' && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            icon={<Undo2 className="size-5" />}
            loading={invoice.isPending}
            onClick={() =>
              invoice.mutate({
                invoice_sent_at: null,
                invoice_due_at: null,
                invoice_paid_at: null,
                invoice_amount: null,
              })
            }
          >
            Cofnij
          </Button>
          <Button
            icon={<CheckCircle2 className="size-5" />}
            onClick={() => {
              setPaidDate(iso(now));
              setPaidOpen(true);
            }}
          >
            Opłacona
          </Button>
        </div>
      )}
      {state === 'paid' && (
        <Button
          variant="secondary"
          fullWidth
          icon={<Undo2 className="size-5" />}
          loading={invoice.isPending}
          onClick={() => invoice.mutate({ invoice_paid_at: null })}
        >
          Cofnij „opłacona"
        </Button>
      )}

      <Sheet open={sentOpen} onClose={() => setSentOpen(false)} title="Faktura wysłana">
        <div className="flex flex-col gap-4">
          <Input
            label="Kwota faktury (kr)"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="Data wysłania"
              value={sentDate}
              onChange={(e) => {
                setSentDate(e.target.value);
                if (e.target.value) {
                  setDueDate(iso(addDays(new Date(e.target.value), 30)));
                }
              }}
            />
            <DateField
              label="Termin płatności"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <Button
            size="lg"
            fullWidth
            loading={invoice.isPending}
            onClick={() => {
              const parsed = Number(amount.trim().replace(',', '.'));
              invoice.mutate(
                {
                  invoice_sent_at: sentDate,
                  invoice_due_at: dueDate || null,
                  invoice_amount: Number.isNaN(parsed) ? null : parsed,
                },
                { onSuccess: () => setSentOpen(false) },
              );
            }}
          >
            Zapisz
          </Button>
        </div>
      </Sheet>

      <Sheet open={paidOpen} onClose={() => setPaidOpen(false)} title="Faktura opłacona">
        <div className="flex flex-col gap-4">
          <DateField
            label="Data wpływu pieniędzy"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
          />
          <Button
            size="lg"
            fullWidth
            loading={invoice.isPending}
            onClick={() =>
              invoice.mutate(
                { invoice_paid_at: paidDate },
                { onSuccess: () => setPaidOpen(false) },
              )
            }
          >
            Zapisz
          </Button>
        </div>
      </Sheet>
    </Card>
  );
}
