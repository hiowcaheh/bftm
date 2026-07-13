import { useNavigate } from 'react-router-dom';
import { House, MapPin } from 'lucide-react';
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

function nameInitials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  const a = w[0];
  if (!a) return '?';
  const b = w[1];
  return (b ? a.charAt(0) + b.charAt(0) : a.slice(0, 2)).toUpperCase();
}

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

  return (
    <Card
      interactive
      className="relative overflow-hidden"
      onClick={() => navigate(`/projekty/${project.id}`)}
    >
      {/* Duża ikona w kolorze projektu — półprzezroczyste tło po prawej (jak na Pulpicie) */}
      <House
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
                <div className="flex items-center">
                  {workers.slice(0, 3).map((w, i) => (
                    <span
                      key={i}
                      className="-ml-1.5 flex size-6 items-center justify-center rounded-full border-2 border-white bg-surface text-[9px] font-bold text-text-secondary first:ml-0"
                    >
                      {nameInitials(w)}
                    </span>
                  ))}
                  {workers.length > 3 && (
                    <span className="ml-1 text-[11px] text-text-secondary">
                      +{workers.length - 3}
                    </span>
                  )}
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
