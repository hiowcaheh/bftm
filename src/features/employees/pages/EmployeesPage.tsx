import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SearchBar } from '@/components/ui/SearchBar';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useSession } from '@/features/auth/SessionProvider';
import { useEmployees } from '../hooks';
import { AddEmployeeSheet } from '../components/AddEmployeeSheet';

export default function EmployeesPage() {
  const { user } = useSession();
  const employees = useEmployees();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
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
      <SearchBar value={search} onChange={setSearch} placeholder="Szukaj pracownika…" />

      {employees.isLoading && <SkeletonList rows={4} />}

      {!employees.isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          message={
            search
              ? 'Nikt nie pasuje do wyszukiwania.'
              : 'Nie ma jeszcze żadnych pracowników — dodaj pierwszego.'
          }
          action={
            isAdmin && !search ? (
              <Button icon={<UserPlus className="size-5" />} onClick={() => setAddOpen(true)}>
                Dodaj pracownika
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
              leading={<Avatar name={emp.full_name} />}
              title={
                <span className="flex items-center gap-2">
                  {emp.full_name}
                  {emp.role === 'admin' && <Badge tone="accent">Admin</Badge>}
                  {!emp.active && <Badge tone="error">Nieaktywny</Badge>}
                </span>
              }
              subtitle={emp.phone || emp.email}
              chevron
              onClick={() => navigate(`/pracownicy/${emp.id}`)}
            />
          ))}
        </ListGroup>
      )}

      {isAdmin && <FAB label="Dodaj pracownika" onClick={() => setAddOpen(true)} />}
      <AddEmployeeSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
