import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Contact, UserPlus, Building2, User } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SearchBar } from '@/components/ui/SearchBar';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useSession } from '@/features/auth/SessionProvider';
import { useT } from '@/lib/i18n/context';
import { useClients } from '../hooks';
import { ClientFormSheet } from '../components/ClientFormSheet';

export default function ClientsPage() {
  const clients = useClients();
  const navigate = useNavigate();
  const { can } = useSession();
  const t = useT();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const canEdit = can('clients_edit');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = clients.data ?? [];
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.address ?? '').toLowerCase().includes(q),
    );
  }, [clients.data, search]);

  return (
    <div className="flex flex-col gap-4">
      <SearchBar value={search} onChange={setSearch} placeholder={t('cli.search')} />

      {clients.isLoading && <SkeletonList rows={4} />}

      {!clients.isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Contact}
          message={search ? t('cli.noneMatch') : t('cli.empty')}
          action={
            canEdit && !search ? (
              <Button icon={<UserPlus className="size-5" />} onClick={() => setFormOpen(true)}>
                {t('cli.addClient')}
              </Button>
            ) : undefined
          }
        />
      )}

      {filtered.length > 0 && (
        <ListGroup>
          {filtered.map((c) => (
            <ListRow
              key={c.id}
              leading={
                <div className="flex size-10 items-center justify-center rounded-xl bg-surface">
                  {c.type === 'company' ? (
                    <Building2 className="size-5 text-text-secondary" strokeWidth={1.8} />
                  ) : (
                    <User className="size-5 text-text-secondary" strokeWidth={1.8} />
                  )}
                </div>
              }
              title={
                <span className="flex items-center gap-2">
                  {c.name}
                  {c.reverse_vat && <Badge tone="info">omvänd moms</Badge>}
                  {c.rot_eligible && <Badge tone="success">ROT</Badge>}
                </span>
              }
              subtitle={c.phone || c.email || c.address || undefined}
              chevron
              onClick={() => navigate(`/klienci/${c.id}`)}
            />
          ))}
        </ListGroup>
      )}

      {canEdit && <FAB label={t('cli.addClient')} onClick={() => setFormOpen(true)} />}
      <ClientFormSheet open={formOpen} onClose={() => setFormOpen(false)} client={null} />
    </div>
  );
}
