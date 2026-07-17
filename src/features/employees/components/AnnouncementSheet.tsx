import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Textarea } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { sendAnnouncement } from '../api';

/**
 * Ogłoszenie od admina do całego zespołu — trafia do dzwoneczka i jako push
 * (trigger notifications_push), tytuł w języku każdego odbiorcy.
 */
export function AnnouncementSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { user } = useSession();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!user || !text.trim() || sending) return;
    setSending(true);
    try {
      await sendAnnouncement(user.id, text.trim());
      toast.success(t('emp.announceSent'));
      setText('');
      onClose();
    } catch {
      toast.error(t('emp.announceErr'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('emp.announceTitle')}>
      <div className="flex flex-col gap-4">
        <Textarea
          label={t('emp.announce')}
          placeholder={t('emp.announcePh')}
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button
          icon={<Megaphone className="size-5" />}
          disabled={!text.trim() || sending}
          onClick={() => void send()}
        >
          {t('emp.announceSend')}
        </Button>
      </div>
    </Drawer>
  );
}
