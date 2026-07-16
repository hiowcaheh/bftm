import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Mail } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useMyPrivate, useSaveMyProfile, useUploadAvatar } from '../hooks';

/**
 * Mój profil: dane kontaktowe i osobiste zalogowanego — telefon,
 * personnummer, rozmiary robocze. E-mail zmienia wyłącznie właściciel.
 */
export default function MyProfilePage() {
  const navigate = useNavigate();
  const t = useT();
  const { user } = useSession();
  const priv = useMyPrivate();
  const save = useSaveMyProfile();
  const uploadAvatar = useUploadAvatar();
  const avatarRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
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
    // telefon i nazwa żyją w profiles — bierzemy je z sesji przy wejściu
    if (user) {
      setPhone(user.phone ?? '');
      setFullName(user.fullName);
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="press flex items-center gap-1 self-start text-sm font-medium text-text-secondary"
      >
        <ArrowLeft className="size-4" /> {t('prof.back')}
      </button>

      <Card className="flex items-center gap-4 p-4">
        <button
          type="button"
          className="press relative"
          onClick={() => avatarRef.current?.click()}
          aria-label={t('prof.changeAvatar')}
        >
          <Avatar name={user.fullName} path={user.avatarPath} size="lg" />
          <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-accent text-white shadow">
            <Camera className="size-3.5" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{user.fullName}</h1>
          <p className="truncate text-sm text-text-secondary">
            {user.role === 'admin' ? 'Admin' : user.email}
          </p>
        </div>
        <input
          ref={avatarRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAvatar.mutate(file);
            e.target.value = '';
          }}
        />
      </Card>

      <ListGroup>
        <ListRow
          leading={<Mail className="size-5 text-text-secondary" />}
          title={user.email}
          subtitle={t('emp.emailLogin')}
        />
      </ListGroup>

      {priv.isLoading ? (
        <SkeletonList rows={4} />
      ) : (
        <Card className="flex flex-col gap-4 p-4">
          <Input
            label={t('emp.fullName')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label={t('prof.phone')}
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
              label={t('prof.shirt')}
              placeholder={t('prof.shirtPh')}
              value={shirt}
              onChange={(e) => setShirt(e.target.value)}
            />
            <Input
              label={t('prof.pants')}
              placeholder={t('prof.pantsPh')}
              value={pants}
              onChange={(e) => setPants(e.target.value)}
            />
            <Input
              label={t('prof.shoes')}
              placeholder={t('prof.shoesPh')}
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
                fullName,
                phone,
                personnummer,
                shirt_size: shirt,
                pants_size: pants,
                shoe_size: shoes,
              })
            }
          >
            {t('common.save')}
          </Button>
        </Card>
      )}
    </div>
  );
}
