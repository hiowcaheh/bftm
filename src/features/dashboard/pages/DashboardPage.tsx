import { HardHat, Clock, Receipt, Banknote, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FAB } from '@/components/ui/FAB';
import { toast } from '@/components/ui/Toast';
import { hours, moneyWhole } from '@/lib/format';

/**
 * Pulpit — w Etapie 1 dane demonstracyjne pokazujące docelowy układ.
 * Prawdziwe KPI z Supabase (qk.dashboard.*) wchodzą w Etapach 5–9.
 */
const demoKpi = [
  { label: 'Aktywne projekty', value: '3', icon: HardHat },
  { label: 'Godziny w tym miesiącu', value: hours(164.5), icon: Clock },
  { label: 'Koszty w tym miesiącu', value: moneyWhole(23400), icon: Receipt },
  { label: 'Wartość w toku', value: moneyWhole(486000), icon: Banknote },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pulpit</h1>
          <p className="text-xs text-text-secondary">Dane demonstracyjne — Etap 1</p>
        </div>
        <Badge tone="accent">Demo</Badge>
      </header>

      <section className="grid grid-cols-2 gap-3" aria-label="Wskaźniki">
        {demoKpi.map((kpi) => (
          <Card key={kpi.label} className="flex flex-col gap-2 p-4">
            <kpi.icon className="size-5 text-accent" strokeWidth={1.8} />
            <span className="tabular-nums text-lg font-semibold">{kpi.value}</span>
            <span className="text-xs text-text-secondary">{kpi.label}</span>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Dziś w pracy</h2>
        <Card className="p-4 text-sm text-text-secondary">
          Sekcja pojawi się w Etapie 5 razem z dziennikiem godzin — pokaże, kto dziś wpisał
          godziny i kto jest nieobecny.
        </Card>
      </section>

      <FAB label="Dodaj godziny" onClick={() => toast.info('Dodawanie godzin — Etap 5')} icon={<Plus className="size-7" />} />
    </div>
  );
}
