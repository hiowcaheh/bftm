import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Archive, Info } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SkeletonList } from '@/components/ui/Skeleton';
import { date } from '@/lib/format';
import { useT } from '@/lib/i18n/context';
import { renderRichText } from '@/lib/richText';
import { useSession } from '@/features/auth/SessionProvider';
import { useEmployees } from '../hooks';

/** Archiwum byłych pracowników (0080) — tylko admin; dane osób zostają. */
export default function EmployeesArchivePage() {
  const { user } = useSession();
  const t = useT();
  const navigate = useNavigate();
  const employees = useEmployees();

  if (user && user.role !== 'admin') return <Navigate to="/pracownicy" replace />;

  const archived = (employees.data ?? [])
    .filter((e) => e.archived_at)
    .sort((a, b) => (b.archived_at ?? '').localeCompare(a.archived_at ?? ''));

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate('/pracownicy')}
        className="press flex items-center gap-1 self-start text-sm font-medium text-text-secondary"
      >
        <ArrowLeft className="size-4" /> {t('nav.employees')}
      </button>

      <Card className="flex items-start gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info-soft text-info">
          <Info className="size-[18px]" />
        </span>
        <p className="text-sm">{renderRichText(t('emp.archiveInfo'))}</p>
      </Card>

      {employees.isLoading && <SkeletonList rows={3} />}

      {!employees.isLoading && archived.length === 0 && (
        <EmptyState icon={Archive} message={t('emp.archiveEmpty')} />
      )}

      {archived.length > 0 && (
        <ListGroup>
          {archived.map((emp) => (
            <ListRow
              key={emp.id}
              leading={<Avatar name={emp.full_name} path={emp.avatar_path} />}
              title={emp.full_name}
              subtitle={t('emp.archivedSince', { date: date(emp.archived_at!) })}
              chevron
              onClick={() => navigate(`/pracownicy/${emp.id}`)}
            />
          ))}
        </ListGroup>
      )}
    </div>
  );
}
