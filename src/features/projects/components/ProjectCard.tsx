import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { moneyWhole } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
  type ProjectWithClient,
} from '../types';

export function ProjectCard({ project }: { project: ProjectWithClient }) {
  const navigate = useNavigate();
  const { can } = useSession();
  const value =
    project.billing_type === 'fixed' || project.billing_type === 'mixed'
      ? project.fixed_value
      : null;

  return (
    <Card
      interactive
      className="overflow-hidden"
      onClick={() => navigate(`/projekty/${project.id}`)}
    >
      <div className="flex">
        <div
          className="w-1.5 shrink-0"
          style={{ backgroundColor: project.color ?? '#CC0000' }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold">{project.name}</h3>
            <Badge tone={PROJECT_STATUS_TONES[project.status]}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
          </div>
          {project.client && (
            <p className="truncate text-xs text-text-secondary">{project.client.name}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            {project.address ? (
              <p className="flex min-w-0 items-center gap-1 truncate text-xs text-text-secondary">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{project.address}</span>
              </p>
            ) : (
              <span />
            )}
            {can('finance_view') && value !== null && (
              <span className="tabular-nums shrink-0 text-xs font-semibold">
                {moneyWhole(value)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
