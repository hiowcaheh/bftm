import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useSession } from '@/features/auth/SessionProvider';
import { useMyPrivate, useSaveMyProfile } from '../hooks';

/**
 * Mój profil: dane kontaktowe i osobiste zalogowanego — telefon,
 * personnummer, rozmiary robocze. E-mail zmienia wyłącznie właściciel.
 */
export default function MyProfilePage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const priv = useMyPrivate();
  const save = useSaveMyProfile();

  const [phone, setPhone] = useState('');
  const [personnummer, setPersonnummer] = useState('');
  const [shirt, setShirt] = useState('');
  const [pants, setPants] = useState('');
  const [shoes, setShoes] = useState('');

  useEffect(() => {
    if (priv.data) {
      setPersonnummer(priv.data.personnummer);
      setShirt(priv.data.shirt_size);
      setPants(priv.data.pants_size);
      setShoes(priv.data.shoe_size);
    }
  }, [priv.data]);

  useEffect(() => {
    // telefon żyje w profiles — bierzemy go z sesji przy wejściu
    if (user) setPhone(user.phone ?? '');
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="press flex items-center gap-1 self-start text-sm font-medium text-text-secondary"
      >
        <ArrowLeft className="size-4" /> Wstecz
      </button>

      <Card className="flex items-center gap-4 p-4">
        <Avatar name={user.fullName} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{user.fullName}</h1>
          <p className="truncate text-sm text-text-secondary">
            {user.role === 'admin' ? 'Właściciel' : user.email}
          </p>
        </div>
      </Card>

      <ListGroup>
        <ListRow
          leading={<Mail className="size-5 text-text-secondary" />}
          title={user.email}
          subtitle="E-mail (login)"
        />
      </ListGroup>

      {priv.isLoading ? (
        <SkeletonList rows={4} />
      ) : (
        <Card className="flex flex-col gap-4 p-4">
          <Input
            label="Telefon"
            type="tel"
            placeholder="+46 ..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Personnummer"
            placeholder="ÅÅÅÅMMDD-XXXX"
            inputMode="numeric"
            value={personnummer}
            onChange={(e) => setPersonnummer(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Koszulka"
              placeholder="np. L"
              value={shirt}
              onChange={(e) => setShirt(e.target.value)}
            />
            <Input
              label="Spodnie"
              placeholder="np. 52"
              value={pants}
              onChange={(e) => setPants(e.target.value)}
            />
            <Input
              label="Buty"
              placeholder="np. 44"
              value={shoes}
              onChange={(e) => setShoes(e.target.value)}
            />
          </div>
          <Button
            size="lg"
            fullWidth
            loading={save.isPending}
            onClick={() =>
              save.mutate({
                phone,
                personnummer,
                shirt_size: shirt,
                pants_size: pants,
                shoe_size: shoes,
              })
            }
          >
            Zapisz
          </Button>
        </Card>
      )}
    </div>
  );
}
