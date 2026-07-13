import { useNavigate } from 'react-router-dom';
import { Building2, House, MapPin } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { moneyWhole, num } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import type { ProjectStat } from '../api';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
  type ProjectWithClient,
} from '../types';

export function ProjectCard({
  project,
  stat,
}: {
  project: ProjectWithClient;
  stat?: ProjectStat | null;
}) {
  const navigate = useNavigate();
  const { can } = useSession();
  const color = project.color ?? '#CC0000';
  const value =
    project.billing_type === 'fixed' || project.billing_type === 'mixed'
      ? project.fixed_value
      : null;
  const est = project.estimated_hours ?? 0;
  const logged = stat?.totalHours ?? 0;
  const pct = est > 0 ? Math.min(100, Math.round((logged / est) * 100)) : null;
  const workers = stat?.workers ?? [];
  const showFooter = workers.length > 0 || (can('finance_view') && value !== null);
  // Firma → budynek, klient prywatny (ROT) → dom
  const BgIcon = project.client?.type === 'company' ? Building2 : House;

  return (
    <Card
      interactive
      className="relative overflow-hidden"
      onClick={() => navigate(`/projekty/${project.id}`)}
    >
      {/* Duża ikona w kolorze projektu — półprzezroczyste tło po prawej (jak na Pulpicie) */}
      <BgIcon
        aria-hidden
        className="pointer-events-none absolute -right-5 top-1/2 size-32 -translate-y-1/2"
        strokeWidth={1.3}
        style={{ color, opacity: 0.09 }}
      />
      <div className="flex">
        {/* Kolorowanie karty wg koloru projektu */}
        <div className="w-1.5 shrink-0" style={{ backgroundColor: color }} />
        <div className="relative flex min-w-0 flex-1 flex-col gap-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-[15px] font-semibold">{project.name}</h3>
            <Badge tone={PROJECT_STATUS_TONES[project.status]}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
          </div>

          {project.client && (
            <p className="truncate text-xs text-text-secondary">{project.client.name}</p>
          )}

          {project.address && (
            <p className="flex min-w-0 items-center gap-1 truncate text-xs text-text-secondary">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{project.address}</span>
            </p>
          )}

          {/* Postęp godzin: przepracowane / limit (szacowane) */}
          {pct !== null && (
            <div className="mt-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-text-secondary">
                <span>Godziny</span>
                <span className="tabular-nums font-medium text-text">
                  {num(logged)} / {num(est)} h
                </span>
              </div>
            </div>
          )}

          {/* Pracownicy + wartość */}
          {showFooter && (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              {workers.length > 0 ? (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-[11px] font-medium text-text-secondary">
                    Dziś
                  </span>
                  <div className="flex items-center">
                    {workers.slice(0, 4).map((w, i) => (
                      <Avatar
                        key={i}
                        name={w.name}
                        path={w.avatar_path}
                        size="sm"
                        className="-ml-2 border-2 border-white first:ml-0"
                      />
                    ))}
                    {workers.length > 4 && (
                      <span className="ml-1 text-[11px] text-text-secondary">
                        +{workers.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span />
              )}
              {can('finance_view') && value !== null && (
                <span className="tabular-nums shrink-0 text-sm font-semibold">
                  {moneyWhole(value)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
