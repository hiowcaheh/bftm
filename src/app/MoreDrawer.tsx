import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Avatar } from '@/components/ui/Avatar';
import { moreModules } from './moduleRegistry';
import { useSignOut } from '@/features/auth/hooks';
import { useSession } from '@/features/auth/SessionProvider';

interface MoreDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Menu „Więcej" — slide-in z prawej, renderowane z rejestru modułów. */
export function MoreDrawer({ open, onClose }: MoreDrawerProps) {
  const navigate = useNavigate();
  const signOut = useSignOut();
  const { user, can } = useSession();
  const visible = moreModules.filter(
    (m) => !m.requiredPermission || can(m.requiredPermission),
  );

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Drawer open={open} onClose={onClose} title="Więcej">
      <div className="flex flex-col gap-4">
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
          {visible.map((mod) => (
            <ListRow
              key={mod.id}
              leading={
                <div className="flex size-10 items-center justify-center rounded-xl bg-surface">
                  <mod.icon className="size-5 text-text-secondary" strokeWidth={1.8} />
                </div>
              }
              title={mod.label}
              chevron
              onClick={() => go(mod.path)}
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
              onClose();
              signOut.mutate(undefined, {
                onSettled: () => navigate('/logowanie', { replace: true }),
              });
            }}
          />
        </ListGroup>
      </div>
    </Drawer>
  );
}
