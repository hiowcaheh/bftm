import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { money } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import type { AllInvoice } from '../api';

/**
 * Wszystkie opłacone faktury: filtr klienta i miesiąca wpłaty, suma, strony.
 * Na stronie tyle faktur, ile mieści się bez przewijania — mierzymy wysokość
 * listy i wiersza (telefon ~5–6, większy ekran więcej).
 */
export function PaidInvoicesSheet({
  open,
  onClose,
  invoices,
  renderRow,
}: {
  open: boolean;
  onClose: () => void;
  /** już posortowane: najnowsza wpłata na górze */
  invoices: AllInvoice[];
  renderRow: (inv: AllInvoice) => ReactNode;
}) {
  const { t, tp, dateLocale } = useI18n();
  const [client, setClient] = useState('');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(5);
  const listRef = useRef<HTMLDivElement>(null);

  const clientOptions = useMemo(() => {
    const names = new Set<string>();
    for (const i of invoices) if (i.project?.client?.name) names.add(i.project.client.name);
    return [
      { value: '', label: t('fin.anyClient') },
      ...[...names].sort().map((n) => ({ value: n, label: n })),
    ];
  }, [invoices, t]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    for (const i of invoices) if (i.paid_at) months.add(i.paid_at.slice(0, 7));
    return [
      { value: '', label: t('fin.anyMonth') },
      ...[...months]
        .sort()
        .reverse()
        .map((m) => ({ value: m, label: format(parseISO(`${m}-01`), 'LLLL yyyy', { locale: dateLocale }) })),
    ];
  }, [invoices, t, dateLocale]);

  const filtered = invoices.filter(
    (i) =>
      (!client || i.project?.client?.name === client) &&
      (!month || i.paid_at?.startsWith(month)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pages - 1);
  const shown = filtered.slice(current * perPage, current * perPage + perPage);
  const sum = filtered.reduce((s, i) => s + Number(i.amount), 0);

  // Ile wierszy mieści się w liście bez przewijania (+1 px na linię między wierszami)
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!open || !list) return;
    const measure = () => {
      const row = list.querySelector<HTMLElement>('[data-row]');
      if (!row) return;
      const fits = Math.floor((list.clientHeight - 2 + 1) / (row.offsetHeight + 1));
      setPerPage(Math.max(3, fits));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [open, filtered.length > 0]);

  return (
    <Sheet open={open} onClose={onClose} title={t('fin.paidInvoices')} height="tall">
      <div className="flex h-full flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label={t('fin.anyClient')}
            value={client}
            options={clientOptions}
            onChange={(e) => (setClient(e.target.value), setPage(0))}
          />
          <Select
            aria-label={t('fin.anyMonth')}
            value={month}
            options={monthOptions}
            onChange={(e) => (setMonth(e.target.value), setPage(0))}
          />
        </div>
        <div className="flex justify-between text-xs text-text-secondary">
          <span>{tp('fin.invoiceCount', filtered.length).replace('{n}', String(filtered.length))}</span>
          <span className="tabular-nums">
            {t('fin.totalSum', { sum: '' })}
            <b className="font-semibold text-text">{money(sum)}</b>
          </span>
        </div>
        <div ref={listRef} className="min-h-0 flex-1 overflow-hidden">
          {shown.length > 0 ? (
            <div className="flex flex-col divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
              {shown.map((inv) => (
                <div key={inv.id} data-row>
                  {renderRow(inv)}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-text-secondary">{t('fin.noPaidMatch')}</p>
          )}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label={t('fin.prevPage')}
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
              className="press flex size-10 items-center justify-center rounded-full bg-surface disabled:opacity-35"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="tabular-nums min-w-16 text-center text-sm font-semibold">
              {t('fin.pageOf', { p: current + 1, n: pages })}
            </span>
            <button
              type="button"
              aria-label={t('fin.nextPage')}
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
              className="press flex size-10 items-center justify-center rounded-full bg-surface disabled:opacity-35"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
