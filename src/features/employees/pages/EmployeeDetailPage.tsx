import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  Clock3,
  IdCard,
  KeyRound,
  Phone,
  Shirt,
  ShieldCheck,
  Trash2,
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
import { CopyButton } from '@/components/ui/CopyButton';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { money } from '@/lib/format';
import { format } from 'date-fns';
import { useI18n } from '@/lib/i18n/context';
import type { PermissionMap } from '@/lib/permissions';
import { useSession } from '@/features/auth/SessionProvider';
import {
  useAddCompensation,
  useCompensation,
  useDeleteEmployee,
  useEmployee,
  useEmployeeActivity,
  useEmployeePrivate,
  useResetPassword,
  useSaveEmployeePrivate,
  useSetActive,
  useUpdateEmployee,
  useUpdatePermissions,
} from '../hooks';
import { PERMISSION_GROUPS } from '../permissionLabels';
import { generateTempPassword } from '../types';
import { TempPasswordDialog } from '../components/TempPasswordDialog';
import { OnlineBadge } from '../components/OnlineBadge';

const ACTIVITY_KEYS: Record<string, string> = {
  login: 'emp.actLogin',
  create: 'emp.actCreate',
  reset_password: 'emp.actReset',
  deactivate: 'emp.actDeactivate',
  reactivate: 'emp.actReactivate',
};

export default function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { t, dateLocale } = useI18n();
  const isAdmin = user?.role === 'admin';

  const employee = useEmployee(id);
  const compensation = useCompensation(id, isAdmin);
  const activity = useEmployeeActivity(id, isAdmin);
  const updateEmployee = useUpdateEmployee(id);
  const updatePermissions = useUpdatePermissions(id);
  const resetPassword = useResetPassword();
  const setActive = useSetActive();
  const deleteEmployee = useDeleteEmployee();
  const addCompensation = useAddCompensation(id);

  const privateData = useEmployeePrivate(id, isAdmin);
  const savePrivate = useSaveEmployeePrivate(id);
  const [perms, setPerms] = useState<PermissionMap>({});
  const [phone, setPhone] = useState('');
  const [pnr, setPnr] = useState('');
  const [sizes, setSizes] = useState({ shirt: '', pants: '', shoes: '' });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmActive, setConfirmActive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [logPage, setLogPage] = useState(0);
  const [newWage, setNewWage] = useState('');
  const [wageFrom, setWageFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (employee.data) {
      setPerms((employee.data.permissions ?? {}) as PermissionMap);
      setPhone(employee.data.phone ?? '');
    }
  }, [employee.data]);

  useEffect(() => {
    if (privateData.data) {
      setPnr(privateData.data.personnummer);
      setSizes({
        shirt: privateData.data.shirt_size,
        pants: privateData.data.pants_size,
        shoes: privateData.data.shoe_size,
      });
    }
  }, [privateData.data]);

  if (employee.isLoading) return <SkeletonList rows={5} />;
  if (!employee.data) {
    return <p className="py-16 text-center text-sm text-text-secondary">{t('emp.notFound')}</p>;
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
        <ArrowLeft className="size-4" /> {t('nav.employees')}
      </button>

      <Card className="flex items-center gap-4 p-4">
        <Avatar name={emp.full_name} path={emp.avatar_path} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{emp.full_name}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {emp.role === 'admin' && <Badge tone="accent">Admin</Badge>}
            <OnlineBadge lastSeen={emp.last_seen_at} />
            {!emp.active && <Badge tone="error">{t('emp.inactive')}</Badge>}
            {emp.must_change_password && <Badge tone="warning">{t('emp.waitingPwChange')}</Badge>}
          </div>
        </div>
      </Card>

      <ListGroup>
        <ListRow
          leading={<Mail className="size-5 text-text-secondary" />}
          title={emp.email}
          subtitle={t('emp.emailLogin')}
          trailing={
            emp.email ? (
              <div className="flex items-center gap-1.5">
                <a
                  href={`mailto:${emp.email}`}
                  aria-label={t('emp.writeEmail')}
                  className="press flex size-9 items-center justify-center rounded-lg bg-surface text-accent"
                >
                  <Mail className="size-4" />
                </a>
                <CopyButton value={emp.email} label="e-mail" />
              </div>
            ) : undefined
          }
        />
        <ListRow
          leading={<Phone className="size-5 text-text-secondary" />}
          title={
            isAdmin ? (
              <input
                value={phone}
                placeholder={t('emp.addPhone')}
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
          subtitle={t('emp.phone')}
          trailing={
            emp.phone ? (
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${emp.phone}`}
                  aria-label={t('emp.call')}
                  className="press flex size-9 items-center justify-center rounded-lg bg-surface text-accent"
                >
                  <Phone className="size-4" />
                </a>
                <CopyButton value={emp.phone} label="numer" />
              </div>
            ) : undefined
          }
        />
        {isAdmin && (
          <ListRow
            leading={<IdCard className="size-5 text-text-secondary" />}
            title={
              <input
                value={pnr}
                placeholder="ÅÅÅÅMMDD-XXXX"
                inputMode="numeric"
                className="w-full bg-transparent text-[1rem] outline-none"
                onChange={(e) => setPnr(e.target.value)}
                onBlur={() => {
                  if ((privateData.data?.personnummer ?? '') !== pnr.trim()) {
                    savePrivate.mutate({ personnummer: pnr });
                  }
                }}
              />
            }
            subtitle="Personnummer"
          />
        )}
        {isAdmin && (
          <ListRow
            leading={<Shirt className="size-5 text-text-secondary" />}
            title={
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['shirt', 'koszulka', 'shirt_size'],
                    ['pants', 'spodnie', 'pants_size'],
                    ['shoes', 'buty', 'shoe_size'],
                  ] as const
                ).map(([key, placeholder, column]) => (
                  <input
                    key={key}
                    value={sizes[key]}
                    placeholder={placeholder}
                    style={{ outline: 'none' }}
                    className="w-full rounded-lg bg-surface px-2 py-1 text-center text-[1rem] transition-shadow focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-accent/40"
                    onChange={(e) => setSizes((s) => ({ ...s, [key]: e.target.value }))}
                    onBlur={() => {
                      const saved = privateData.data?.[column] ?? '';
                      if (saved !== sizes[key].trim()) {
                        savePrivate.mutate({ [column]: sizes[key] });
                      }
                    }}
                  />
                ))}
              </div>
            }
            subtitle={t('emp.sizes')}
          />
        )}
      </ListGroup>

      {isAdmin && emp.role !== 'admin' && (
        <>
          <Card className="flex flex-col gap-1 p-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="size-5 text-accent" strokeWidth={1.8} />
              <h2 className="text-base font-semibold">{t('emp.permissions')}</h2>
            </div>
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.key} className="mb-2">
                <p className="mb-1 text-xs font-semibold tracking-wide text-text-secondary uppercase">
                  {t(`permg.${group.key}`)}
                </p>
                {group.items.map((item) => (
                  <div key={item.flag} className="flex min-h-12 items-center gap-3 py-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {t(`perm.${item.flag}`)}
                        {item.sensitive && (
                          <Badge tone="warning" className="ml-2">
                            {t('emp.sensitive')}
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-text-secondary">{t(`perm.${item.flag}Desc`)}</p>
                    </div>
                    <Switch
                      checked={perms[item.flag] === true}
                      onChange={(v) => togglePerm(item.flag, v)}
                      label={t(`perm.${item.flag}`)}
                      hideLabel
                    />
                  </div>
                ))}
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <Banknote className="size-5 text-accent" strokeWidth={1.8} />
              <h2 className="text-base font-semibold">{t('emp.wage')}</h2>
            </div>
            <p className="tabular-nums text-lg font-semibold">
              {currentWage ? `${money(currentWage.hourly_wage)} / h` : t('emp.wageNotSet')}
              {currentWage && (
                <span className="ml-2 text-xs font-normal text-text-secondary">
                  {t('emp.from', { date: format(new Date(currentWage.valid_from), 'dd.MM.yyyy') })}
                </span>
              )}
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label={t('emp.newWage')}
                  inputMode="decimal"
                  value={newWage}
                  onChange={(e) => setNewWage(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <DateField
                  label={t('emp.validFrom')}
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
                {t('common.save')}
              </Button>
            </div>
            {(compensation.data?.length ?? 0) > 1 && (
              <div className="mt-1 border-t border-line pt-2">
                <p className="mb-1 text-xs font-semibold text-text-secondary">{t('emp.history')}</p>
                {compensation.data?.slice(1).map((c) => (
                  <p key={c.id} className="tabular-nums text-xs text-text-secondary">
                    {money(c.hourly_wage)} / h —{' '}
                    {t('emp.from', { date: format(new Date(c.valid_from), 'dd.MM.yyyy') })}
                  </p>
                ))}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <Clock3 className="size-5 text-accent" strokeWidth={1.8} />
              <h2 className="text-base font-semibold">{t('emp.accountActivity')}</h2>
            </div>
            {activity.data?.length ? (
              (() => {
                const PER_PAGE = 10;
                const pageCount = Math.ceil(activity.data.length / PER_PAGE);
                const page = Math.min(logPage, pageCount - 1);
                const rows = activity.data.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
                return (
                  <>
                    <div className="flex flex-col">
                      {rows.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-baseline justify-between gap-3 py-1.5"
                        >
                          <span className="text-sm">{ACTIVITY_KEYS[a.action] ? t(ACTIVITY_KEYS[a.action]!) : a.action}</span>
                          <span className="tabular-nums shrink-0 text-xs text-text-secondary">
                            {format(new Date(a.created_at), 'dd.MM.yyyy HH:mm', { locale: dateLocale })}
                          </span>
                        </div>
                      ))}
                    </div>
                    {pageCount > 1 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {Array.from({ length: pageCount }, (_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setLogPage(i)}
                            className={
                              'tabular-nums press flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium ' +
                              (i === page
                                ? 'bg-accent text-white'
                                : 'bg-surface text-text-secondary')
                            }
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <p className="text-sm text-text-secondary">{t('emp.noActivity')}</p>
            )}
          </Card>

          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              icon={<KeyRound className="size-5" />}
              onClick={() => setConfirmReset(true)}
            >
              {t('emp.resetPw')}
            </Button>
            <Button
              variant={emp.active ? 'destructive' : 'primary'}
              icon={emp.active ? <UserX className="size-5" /> : <UserCheck className="size-5" />}
              loading={setActive.isPending}
              onClick={() => setConfirmActive(true)}
            >
              {emp.active ? t('emp.deactivate') : t('emp.activate')}
            </Button>
            <Button
              variant="destructive"
              icon={<Trash2 className="size-5" />}
              loading={deleteEmployee.isPending}
              onClick={() => setConfirmDelete(true)}
            >
              {t('emp.deleteEmployee')}
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmReset}
        title={t('emp.resetTitle')}
        description={t('emp.resetDesc', { name: emp.full_name })}
        confirmLabel={t('emp.resetConfirm')}
        onConfirm={doReset}
        onCancel={() => setConfirmReset(false)}
      />
      <ConfirmDialog
        open={confirmActive}
        title={emp.active ? t('emp.deactivateTitle') : t('emp.activateTitle')}
        description={
          emp.active
            ? t('emp.deactivateDesc', { name: emp.full_name })
            : t('emp.activateDesc', { name: emp.full_name })
        }
        confirmLabel={emp.active ? t('emp.deactivate') : t('emp.activate')}
        destructive={emp.active}
        onConfirm={() => {
          setActive.mutate({ id, active: !emp.active });
          setConfirmActive(false);
        }}
        onCancel={() => setConfirmActive(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t('emp.deleteTitle')}
        description={t('emp.deleteDesc', { name: emp.full_name })}
        confirmLabel={t('emp.deleteConfirm')}
        destructive
        loading={deleteEmployee.isPending}
        onConfirm={() => {
          deleteEmployee.mutate(id, {
            onSuccess: () => {
              setConfirmDelete(false);
              navigate('/pracownicy', { replace: true });
            },
          });
        }}
        onCancel={() => setConfirmDelete(false)}
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
