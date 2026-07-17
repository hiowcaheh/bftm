import { useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { money } from '@/lib/format';
import { useT } from '@/lib/i18n/context';
import { useFinanceSettings, useSaveFinanceSettings } from '../hooks';

const toNumber = (v: string) => Number(v.trim().replace(',', '.'));

/**
 * Ustawienia → Finanse (tylko właściciel): narzuty pracodawcy używane
 * do liczenia pełnego kosztu godziny w raportach.
 */
export function FinanceSection() {
  const t = useT();
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
        <h2 className="text-base font-semibold">{t('setc.finTitle')}</h2>
      </div>

      <Input
        label="Arbetsgivaravgifter (%)"
        inputMode="decimal"
        value={employerFee}
        onChange={(e) => setEmployerFee(e.target.value)}
        hint={t('setc.feeHint')}
      />
      <Input
        label={t('setc.overheadLabel')}
        inputMode="decimal"
        value={overhead}
        onChange={(e) => setOverhead(e.target.value)}
        hint={t('setc.overheadHint')}
      />

      <div className="flex flex-col gap-2 rounded-xl bg-surface p-3">
        <Switch
          checked={includeVacation}
          onChange={setIncludeVacation}
          label={t('setc.vacToggle')}
        />
        <p className="text-xs text-text-secondary">{t('setc.vacDesc')}</p>
        {includeVacation && (
          <Input
            label="Semesterersättning (%)"
            inputMode="decimal"
            value={vacationPay}
            onChange={(e) => setVacationPay(e.target.value)}
            hint={t('setc.vacHint')}
          />
        )}
      </div>

      {multiplier && (
        <p className="tabular-nums rounded-xl bg-surface p-3 text-xs text-text-secondary">
          {t('setc.multiplierInfo', {
            mult: multiplier.toFixed(4).replace('.', ','),
            example: money(210 * multiplier),
          })}
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
        {t('setc.saveParams')}
      </Button>
    </Card>
  );
}
