import { useNavigate } from 'react-router-dom';
import { House, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { moneyWhole, num } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
  type ProjectWithClient,
} from '../types';

export function ProjectCard({ project }: { project: ProjectWithClient }) {
  const navigate = useNavigate();
  const { can } = useSession();
  const color = project.color ?? '#CC0000';
  const value =
    project.billing_type === 'fixed' || project.billing_type === 'mixed'
      ? project.fixed_value
      : null;
  const showFooter = !!project.estimated_hours || (can('finance_view') && value !== null);

  return (
    <Card
      interactive
      className="flex gap-3 p-3"
      onClick={() => navigate(`/projekty/${project.id}`)}
    >
      {/* Kafelek w kolorze projektu — nowoczesny akcent zamiast cienkiego paska */}
      <div
        className="flex size-[72px] shrink-0 items-center justify-center rounded-2xl"
        style={{
          background: `linear-gradient(140deg, rgba(255,255,255,0.18), rgba(0,0,0,0.28)), ${color}`,
        }}
      >
        <House className="size-7 text-white/85" strokeWidth={1.8} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
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

        {showFooter && (
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            {project.estimated_hours ? (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock className="size-3.5 shrink-0" /> ~{num(project.estimated_hours)} h
              </span>
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
    </Card>
  );
}
