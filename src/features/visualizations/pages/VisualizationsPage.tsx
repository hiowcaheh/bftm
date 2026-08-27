import { useNavigate } from 'react-router-dom';
import { Eye, MapPin, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { SkeletonList } from '@/components/ui/Skeleton';
import { date as fmtDate } from '@/lib/format';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useVisualizations } from '../hooks';
import { VIZ_STATUS_TONES } from '../types';

export default function VisualizationsPage() {
  const navigate = useNavigate();
  const { can } = useSession();
  const t = useT();
  const list = useVisualizations();

  return (
    <div className="flex flex-col gap-4">
      {list.isLoading && <SkeletonList rows={4} />}

      {!list.isLoading && (list.data ?? []).length === 0 && (
        <EmptyState icon={MapPin} message={t('viz.empty')} />
      )}

      {(list.data ?? []).map((v) => {
        const subtitle = [v.client?.name ?? null, v.address ?? null]
          .filter(Boolean)
          .join(' • ');
        return (
          <Card
            key={v.id}
            interactive
            className="flex flex-col gap-2 p-4"
            onClick={() => navigate(`/wizualizacje/${v.id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {v.title || t('viz.untitled')}
                </p>
                {subtitle && (
                  <p className="mt-0.5 truncate text-xs text-text-secondary">{subtitle}</p>
                )}
                <p className="mt-0.5 text-[11px] text-text-secondary">
                  {fmtDate(v.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Badge tone={VIZ_STATUS_TONES[v.status]}>
                  {v.status === 'sent' ? t('viz.statusSent') : t('viz.statusDraft')}
                </Badge>
                {v.status === 'sent' && (
                  <span className="tabular-nums flex items-center gap-1 text-xs text-text-secondary">
                    <Eye className="size-3.5" /> {v.view_count}
                  </span>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {can('visualizations_manage') && (
        <FAB
          label={t('viz.new')}
          icon={<Plus className="size-7" />}
          onClick={() => navigate('/wizualizacje/nowa')}
        />
      )}
    </div>
  );
}
