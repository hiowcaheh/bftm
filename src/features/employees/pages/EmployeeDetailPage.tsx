import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  Clock3,
  KeyRound,
  Phone,
  ShieldCheck,
  UserX,
  UserCheck,
  Mail,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { DateField } from '@/components/ui/DateField';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { money } from '@/lib/format';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { PermissionMap } from '@/lib/permissions';
import { useSession } from '@/features/auth/SessionProvider';
import {
  useAddCompensation,
  useCompensation,
  useEmployee,
  useEmployeeActivity,
  useResetPassword,
  useSetActive,
  useUpdateEmployee,
  useUpdatePermissions,
} from '../hooks';
import { PERMISSION_GROUPS } from '../permissionLabels';
import { generateTempPassword } from '../types';
import { TempPasswordDialog } from '../components/TempPasswordDialog';

const ACTIVITY_LABELS: Record<string, string> = {
  login: 'Logowanie do aplikacji',
  create: 'Utworzenie konta',
  reset_password: 'Reset hasła przez administratora',
  deactivate: 'Dezaktywacja konta',
  reactivate: 'Reaktywacja konta',
};

export default function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const isAdmin = user?.role === 'admin';

  const employee = useEmployee(id);
  const compensation = useCompensation(id, isAdmin);
  const activity = useEmployeeActivity(id, isAdmin);
  const updateEmployee = useUpdateEmployee(id);
  const updatePermissions = useUpdatePermissions(id);
  const resetPassword = useResetPassword();
  const setActive = useSetActive();
  const addCompensation = useAddCompensation(id);

  const [perms, setPerms] = useState<PermissionMap>({});
  const [phone, setPhone] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmActive, setConfirmActive] = useState(false);
  const [newWage, setNewWage] = useState('');
  const [wageFrom, setWageFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (employee.data) {
      setPerms((employee.data.permissions ?? {}) as PermissionMap);
      setPhone(employee.data.phone ?? '');
    }
  }, [employee.data]);

  if (employee.isLoading) return <SkeletonList rows={5} />;
  if (!employee.data) {
    return <p className="py-16 text-center text-sm text-text-secondary">Nie znaleziono pracownika.</p>;
  }
  const emp = employee.data;
  const currentWage = compensation.data?.[0];

  const togglePerm = (flag: keyof PermissionMap, value: boolean) => {
    const next = { ...perms, [flag]: value };
    setPerms(next);
    updatePermissions.mutate(next);
  };

  const doReset = () => {
    const pwd = generateTempPassword();
    resetPassword.mutate(
      { id, tempPassword: pwd },
      { onSuccess: () => setTempPassword(pwd) },
    );
    setConfirmReset(false);
  };

  const submitWage = () => {
    const wage = Number(newWage.replace(',', '.'));
    if (Number.isNaN(wage) || wage < 0) return;
    addCompensation.mutate(
      { wage, validFrom: wageFrom },
      { onSuccess: () => setNewWage('') },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate('/pracownicy')}
        className="press flex items-center gap-1 self-start text-sm font-medium text-text-secondary"
      >
        <ArrowLeft className="size-4" /> Pracownicy
      </button>

      <Card className="flex items-center gap-4 p-4">
        <Avatar name={emp.full_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{emp.full_name}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={emp.role === 'admin' ? 'accent' : 'neutral'}>
              {emp.role === 'admin' ? 'Administrator' : 'Pracownik'}
            </Badge>
            <Badge tone={emp.active ? 'success' : 'error'}>
              {emp.active ? 'Aktywny' : 'Nieaktywny'}
            </Badge>
            {emp.must_change_password && <Badge tone="warning">Czeka na zmianę hasła</Badge>}
          </div>
        </div>
      </Card>

      <ListGroup>
        <ListRow
          leading={<Mail className="size-5 text-text-secondary" />}
          title={emp.email}
          subtitle="E-mail (login)"
        />
        <ListRow
          leading={<Phone className="size-5 text-text-secondary" />}
          title={
            isAdmin ? (
              <input
                value={phone}
                placeholder="Dodaj numer telefonu"
                className="w-full bg-transparent text-[1rem] outline-none"
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => {
                  if ((emp.phone ?? '') !== phone.trim()) {
                    updateEmployee.mutate({ phone: phone.trim() || null });
                  }
                }}
              />
            ) : (
              emp.phone || '—'
            )
          }
          subtitle="Telefon"
        />
      </ListGroup>

      {isAdmin && emp.role !== 'admin' && (
        <>
          <Card className="flex flex-col gap-1 p-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="size-5 text-accent" strokeWidth={1.8} />
              <h2 className="text-base font-semibold">Uprawnienia</h2>
            </div>
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label} className="mb-2">
                <p className="mb-1 text-xs font-semibold tracking-wide text-text-secondary uppercase">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <div key={item.flag} className="flex min-h-12 items-center gap-3 py-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {item.label}
                        {item.sensitive && (
                          <Badge tone="warning" className="ml-2">
                            wrażliwe
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-text-secondary">{item.description}</p>
                    </div>
                    <Switch
                      checked={perms[item.flag] === true}
                      onChange={(v) => togglePerm(item.flag, v)}
                      label={item.label}
                    />
                  </div>
                ))}
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <Banknote className="size-5 text-accent" strokeWidth={1.8} />
              <h2 className="text-base font-semibold">Stawka godzinowa</h2>
            </div>
            <p className="tabular-nums text-lg font-semibold">
              {currentWage ? `${money(currentWage.hourly_wage)} / h` : 'Nie ustawiono'}
              {currentWage && (
                <span className="ml-2 text-xs font-normal text-text-secondary">
                  od {format(new Date(currentWage.valid_from), 'dd.MM.yyyy')}
                </span>
              )}
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Nowa stawka (kr/h)"
                  inputMode="decimal"
                  value={newWage}
                  onChange={(e) => setNewWage(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <DateField
                  label="Obowiązuje od"
                  value={wageFrom}
                  onChange={(e) => setWageFrom(e.target.value)}
                />
              </div>
              <Button
                className="mb-0"
                loading={addCompensation.isPending}
                disabled={!newWage.trim()}
                onClick={submitWage}
              >
                Zapisz
              </Button>
            </div>
            {(compensation.data?.length ?? 0) > 1 && (
              <div className="mt-1 border-t border-line pt-2">
                <p className="mb-1 text-xs font-semibold text-text-secondary">Historia</p>
                {compensation.data?.slice(1).map((c) => (
                  <p key={c.id} className="tabular-nums text-xs text-text-secondary">
                    {money(c.hourly_wage)} / h — od {format(new Date(c.valid_from), 'dd.MM.yyyy')}
                  </p>
                ))}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <Clock3 className="size-5 text-accent" strokeWidth={1.8} />
              <h2 className="text-base font-semibold">Aktywność konta</h2>
            </div>
            {activity.data?.length ? (
              <div className="flex flex-col">
                {activity.data.map((a) => (
                  <div key={a.id} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="text-sm">{ACTIVITY_LABELS[a.action] ?? a.action}</span>
                    <span className="tabular-nums shrink-0 text-xs text-text-secondary">
                      {format(new Date(a.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                Brak zarejestrowanej aktywności — pojawi się przy pierwszym logowaniu.
              </p>
            )}
          </Card>

          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              icon={<KeyRound className="size-5" />}
              onClick={() => setConfirmReset(true)}
            >
              Resetuj hasło
            </Button>
            <Button
              variant={emp.active ? 'destructive' : 'primary'}
              icon={emp.active ? <UserX className="size-5" /> : <UserCheck className="size-5" />}
              loading={setActive.isPending}
              onClick={() => setConfirmActive(true)}
            >
              {emp.active ? 'Dezaktywuj konto' : 'Aktywuj konto'}
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Zresetować hasło?"
        description={`Wygenerujemy nowe hasło tymczasowe dla ${emp.full_name}. Stare hasło i aktywne sesje przestaną działać, a przy następnym logowaniu system wymusi ustawienie własnego hasła.`}
        confirmLabel="Resetuj"
        onConfirm={doReset}
        onCancel={() => setConfirmReset(false)}
      />
      <ConfirmDialog
        open={confirmActive}
        title={emp.active ? 'Dezaktywować konto?' : 'Aktywować konto?'}
        description={
          emp.active
            ? `${emp.full_name} natychmiast straci dostęp do aplikacji — logowanie zostanie zablokowane, a aktywne sesje wygaszone. Dane (godziny, wpisy) zostają.`
            : `${emp.full_name} odzyska możliwość logowania.`
        }
        confirmLabel={emp.active ? 'Dezaktywuj' : 'Aktywuj'}
        destructive={emp.active}
        onConfirm={() => {
          setActive.mutate({ id, active: !emp.active });
          setConfirmActive(false);
        }}
        onCancel={() => setConfirmActive(false)}
      />
      <TempPasswordDialog
        open={tempPassword !== null}
        password={tempPassword ?? ''}
        email={emp.email}
        onClose={() => setTempPassword(null)}
      />
    </div>
  );
}
