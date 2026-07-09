import { useNavigate } from 'react-router-dom';
import { HardHat, Clock, Receipt, Banknote, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FAB } from '@/components/ui/FAB';
import { toast } from '@/components/ui/Toast';
import { hours, moneyWhole } from '@/lib/format';
import { useDashboardKpi } from '../hooks';

/**
 * Pulpit — kafel „Aktywne projekty" liczy prawdziwe dane; pozostałe KPI
 * podłączą się w Etapach 5–9 wraz z godzinami, kosztami i finansami.
 */
export default function DashboardPage() {
  const kpi = useDashboardKpi();
  const navigate = useNavigate();

  const tiles = [
    {
      label: 'Aktywne projekty',
      value: kpi.data ? String(kpi.data.activeProjects) : '—',
      icon: HardHat,
      demo: false,
      onClick: () => navigate('/projekty'),
    },
    {
      label: 'Godziny w tym miesiącu',
      value: hours(0),
      icon: Clock,
      demo: true,
      onClick: () => navigate('/godziny'),
    },
    {
      label: 'Koszty w tym miesiącu',
      value: moneyWhole(0),
      icon: Receipt,
      demo: true,
      onClick: () => navigate('/koszty'),
    },
    {
      label: 'Wartość w toku',
      value: moneyWhole(0),
      icon: Banknote,
      demo: true,
      onClick: () => navigate('/projekty'),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">Pulpit</h1>
      </header>

      <section className="grid grid-cols-2 gap-3" aria-label="Wskaźniki">
        {tiles.map((tile) => (
          <Card
            key={tile.label}
            interactive
            className="flex flex-col gap-2 p-4"
            onClick={tile.onClick}
          >
            <div className="flex items-center justify-between">
              <tile.icon className="size-5 text-accent" strokeWidth={1.8} />
              {tile.demo && <Badge>wkrótce</Badge>}
            </div>
            <span className="tabular-nums text-lg font-semibold">{tile.value}</span>
            <span className="text-xs text-text-secondary">{tile.label}</span>
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

      <FAB
        label="Dodaj godziny"
        onClick={() => toast.info('Dodawanie godzin — Etap 5')}
        icon={<Plus className="size-7" />}
      />
    </div>
  );
}
