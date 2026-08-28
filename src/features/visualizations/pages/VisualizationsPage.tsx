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

/** Kolor postępu: 0% czerwony → 100% zielony (interpolacja odcienia HSL). */
function progressColor(pct: number): string {
  const hue = Math.round((pct / 100) * 130); // 0 = czerwony, 130 = zielony
  return `hsl(${hue} 70% 42%)`;
}

export default function VisualizationsPage() {
  const navigate = useNavigate();
  const { can } = useSession();
  const t = useT();
  const list = useVisualizations();

  return (
    <div className="flex flex-col gap-3">
      {list.isLoading && <SkeletonList rows={4} />}

      {!list.isLoading && (list.data ?? []).length === 0 && (
        <EmptyState icon={MapPin} message={t('viz.empty')} />
      )}

      {(list.data ?? []).map((v) => {
        const subtitle = [v.client?.name ?? null, v.address ?? null]
          .filter(Boolean)
          .join(' • ');
        const pct =
          v.pointsTotal > 0 ? Math.round((v.pointsDone / v.pointsTotal) * 100) : null;
        return (
          <Card
            key={v.id}
            interactive
            className="flex flex-col gap-3 p-4"
            onClick={() => navigate(`/wizualizacje/${v.id}`)}
          >
            <div className="flex items-start gap-3">
              {/* Kafelek z ikoną modułu */}
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <MapPin className="size-5" strokeWidth={1.9} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  {v.number ? (
                    <span className="tabular-nums text-[11px] font-semibold tracking-wide text-text-secondary">
                      {v.number}
                    </span>
                  ) : (
                    <span />
                  )}
                  <Badge tone={VIZ_STATUS_TONES[v.status]}>
                    {v.status === 'sent' ? t('viz.statusSent') : t('viz.statusDraft')}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-sm font-semibold">
                  {v.title || t('viz.untitled')}
                </p>
                {subtitle && (
                  <p className="mt-0.5 truncate text-xs text-text-secondary">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Stopka: postęp punktów (czerwony→zielony) + wyświetlenia.
                Dla szkicu bez punktów nie pokazujemy daty — jest zbędna. */}
            {(pct !== null || v.status === 'sent') && (
              <div className="flex items-center gap-3">
                {pct !== null ? (
                  <div className="flex flex-1 items-center gap-2.5">
                    <div className="h-1.5 flex-1 rounded-full bg-black/[0.06]">
                      <div
                        className="h-full min-w-[0.375rem] rounded-full transition-[width,background-color] duration-300"
                        style={{ width: `${pct}%`, backgroundColor: progressColor(pct) }}
                      />
                    </div>
                    <span
                      className="tabular-nums min-w-[2.25rem] text-right text-xs font-bold"
                      style={{ color: progressColor(pct) }}
                    >
                      {pct}
                      <span className="text-[9px] font-semibold">%</span>
                    </span>
                  </div>
                ) : (
                  <span className="flex-1 text-xs text-text-secondary">
                    {fmtDate(v.created_at)}
                  </span>
                )}
                {v.status === 'sent' && (
                  <span className="tabular-nums flex shrink-0 items-center gap-1 text-xs text-text-secondary">
                    <Eye className="size-3.5" /> {v.view_count}
                  </span>
                )}
              </div>
            )}
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
