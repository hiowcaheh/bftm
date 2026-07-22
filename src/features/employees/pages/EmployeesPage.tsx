import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Users, UserPlus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SearchBar } from '@/components/ui/SearchBar';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useEmployees } from '../hooks';
import { AddEmployeeSheet } from '../components/AddEmployeeSheet';
import { AnnouncementSheet } from '../components/AnnouncementSheet';

export default function EmployeesPage() {
  const { user } = useSession();
  const t = useT();
  const employees = useEmployees();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = employees.data ?? [];
    if (!q) return list;
    return list.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.phone ?? '').includes(q),
    );
  }, [employees.data, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder={t('emp.search')} />
        </div>
        {isAdmin && (
          <button
            type="button"
            aria-label={t('emp.announceTitle')}
            onClick={() => setAnnounceOpen(true)}
            className="press flex size-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-(--shadow-card)"
          >
            <Megaphone className="size-5 text-text-secondary" strokeWidth={1.8} />
          </button>
        )}
      </div>

      {employees.isLoading && <SkeletonList rows={4} />}

      {!employees.isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          message={search ? t('emp.noneMatch') : t('emp.empty')}
          action={
            isAdmin && !search ? (
              <Button icon={<UserPlus className="size-5" />} onClick={() => setAddOpen(true)}>
                {t('emp.addEmployee')}
              </Button>
            ) : undefined
          }
        />
      )}

      {filtered.length > 0 && (
        <ListGroup>
          {filtered.map((emp) => (
            <ListRow
              key={emp.id}
              leading={<Avatar name={emp.full_name} path={emp.avatar_path} />}
              title={
                <span className="flex items-center gap-2">
                  {emp.full_name}
                  {/* badge Admin tylko na własnym wierszu — inni adminowie bez oznaczenia */}
                  {emp.role === 'admin' && emp.id === user?.id && (
                    <Badge tone="accent">Admin</Badge>
                  )}
                  {!emp.active && <Badge tone="error">{t('emp.inactive')}</Badge>}
                </span>
              }
              subtitle={emp.phone || emp.email}
              chevron
              onClick={() => navigate(`/pracownicy/${emp.id}`)}
            />
          ))}
        </ListGroup>
      )}

      {isAdmin && <FAB label={t('emp.addEmployee')} onClick={() => setAddOpen(true)} />}
      <AddEmployeeSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <AnnouncementSheet open={announceOpen} onClose={() => setAnnounceOpen(false)} />
    </div>
  );
}
