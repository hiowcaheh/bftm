import { formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { useI18n } from '@/lib/i18n/context';
import { Badge } from '@/components/ui/Badge';

/**
 * Status obecności członka zespołu na podstawie `profiles.last_seen_at`.
 * „Online" gdy widziany w ostatnich 3 min, inaczej „widziany X temu".
 * `compact` skraca tekst (do listy zespołu).
 */
export function OnlineBadge({
  lastSeen,
  compact = false,
}: {
  lastSeen: string | null;
  compact?: boolean;
}) {
  const { t, dateLocale } = useI18n();
  if (!lastSeen) {
    return (
      <Badge tone="neutral">
        <span className="inline-block size-1.5 rounded-full bg-text-secondary/50" />
        {t('emp.noActivityBadge')}
      </Badge>
    );
  }
  const diffMin = (Date.now() - new Date(lastSeen).getTime()) / 60_000;

  if (diffMin < 3) {
    return (
      <Badge tone="success">
        <span className="inline-block size-1.5 rounded-full bg-success" />
        Online
      </Badge>
    );
  }

  const text = compact
    ? formatDistanceToNowStrict(new Date(lastSeen), { locale: dateLocale })
    : t('emp.lastSeen', { ago: formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: dateLocale }) });

  return (
    <Badge tone="neutral">
      <span className="inline-block size-1.5 rounded-full bg-text-secondary/50" />
      {text}
    </Badge>
  );
}
