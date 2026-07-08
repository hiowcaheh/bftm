import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Avatar } from '@/components/ui/Avatar';
import { moreModules } from './moduleRegistry';
import { useSignOut } from '@/features/auth/hooks';
import { useSession } from '@/features/auth/SessionProvider';

/** Ekran „Więcej" — renderowany z rejestru modułów (navPlacement: 'more'). */
export default function MorePage() {
  const navigate = useNavigate();
  const signOut = useSignOut();
  const { user } = useSession();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Więcej</h1>
      {user && (
        <ListGroup>
          <ListRow
            leading={<Avatar name={user.fullName} />}
            title={user.fullName}
            subtitle={user.role === 'admin' ? 'Administrator' : 'Pracownik'}
          />
        </ListGroup>
      )}
      <ListGroup>
        {moreModules.map((mod) => (
          <ListRow
            key={mod.id}
            leading={
              <div className="flex size-10 items-center justify-center rounded-xl bg-surface">
                <mod.icon className="size-5 text-text-secondary" strokeWidth={1.8} />
              </div>
            }
            title={mod.label}
            chevron
            onClick={() => navigate(mod.path)}
          />
        ))}
      </ListGroup>
      <ListGroup>
        <ListRow
          leading={
            <div className="flex size-10 items-center justify-center rounded-xl bg-error-soft">
              <LogOut className="size-5 text-error" strokeWidth={1.8} />
            </div>
          }
          title={<span className="text-error">Wyloguj</span>}
          onClick={() => {
            signOut.mutate(undefined, {
              onSettled: () => navigate('/logowanie', { replace: true }),
            });
          }}
        />
      </ListGroup>
    </div>
  );
}
