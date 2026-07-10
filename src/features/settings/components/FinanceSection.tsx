import { useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { money } from '@/lib/format';
import { useFinanceSettings, useSaveFinanceSettings } from '../hooks';

const toNumber = (v: string) => Number(v.trim().replace(',', '.'));

/**
 * Ustawienia → Finanse (tylko właściciel): narzuty pracodawcy używane
 * do liczenia pełnego kosztu godziny w raportach.
 */
export function FinanceSection() {
  const settings = useFinanceSettings(true);
  const save = useSaveFinanceSettings();

  const [employerFee, setEmployerFee] = useState('');
  const [vacationPay, setVacationPay] = useState('');
  const [overhead, setOverhead] = useState('');
  const [includeVacation, setIncludeVacation] = useState(false);

  useEffect(() => {
    if (settings.data) {
      setEmployerFee(String(settings.data.employer_fee_pct));
      setVacationPay(String(settings.data.vacation_pay_pct));
      setOverhead(String(settings.data.overhead_pct));
      setIncludeVacation(settings.data.include_vacation_in_labor_cost);
    }
  }, [settings.data]);

  const fee = toNumber(employerFee);
  const vac = toNumber(vacationPay);
  const ovh = toNumber(overhead);
  const valid = [fee, vac, ovh].every((n) => !Number.isNaN(n) && n >= 0 && n < 200);
  const multiplier = valid
    ? (includeVacation ? 1 + vac / 100 : 1) * (1 + fee / 100) * (1 + ovh / 100)
    : null;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Percent className="size-5 text-accent" strokeWidth={1.8} />
        <h2 className="text-base font-semibold">Finanse — koszt pracodawcy</h2>
      </div>

      <Input
        label="Arbetsgivaravgifter (%)"
        inputMode="decimal"
        value={employerFee}
        onChange={(e) => setEmployerFee(e.target.value)}
        hint="Składki pracodawcy od pensji (2026: 31,42%)"
      />
      <Input
        label="Dodatkowy narzut firmy (%)"
        inputMode="decimal"
        value={overhead}
        onChange={(e) => setOverhead(e.target.value)}
        hint="Opcjonalny własny narzut (ubezpieczenia, narzędzia, auto…)"
      />

      <div className="flex flex-col gap-2 rounded-xl bg-surface p-3">
        <Switch
          checked={includeVacation}
          onChange={setIncludeVacation}
          label="Doliczaj rezerwę urlopową do kosztu godziny"
        />
        <p className="text-xs text-text-secondary">
          Wyłączone: koszt godziny = brutto + arbetsgivaravgifter, dokładnie jak na
          lönespecifikation. Włączone: do każdej godziny doliczana jest rezerwa na
          semesterersättning — pełny koszt ekonomiczny, przydatny przy kalkulacji ofert.
        </p>
        {includeVacation && (
          <Input
            label="Semesterersättning (%)"
            inputMode="decimal"
            value={vacationPay}
            onChange={(e) => setVacationPay(e.target.value)}
            hint="Ustawowo min. 12%"
          />
        )}
      </div>

      {multiplier && (
        <p className="tabular-nums rounded-xl bg-surface p-3 text-xs text-text-secondary">
          Godzina pracownika kosztuje firmę <b>×{multiplier.toFixed(4).replace('.', ',')}</b>{' '}
          stawki brutto. Przykład: stawka 210 kr/h → {money(210 * multiplier)}/h.
          Tak liczone są koszty pracy w zakładce Finanse.
        </p>
      )}

      <Button
        size="lg"
        fullWidth
        disabled={!valid}
        loading={save.isPending}
        onClick={() =>
          save.mutate({
            employer_fee_pct: fee,
            vacation_pay_pct: vac,
            overhead_pct: ovh,
            include_vacation_in_labor_cost: includeVacation,
          })
        }
      >
        Zapisz parametry
      </Button>
    </Card>
  );
}
