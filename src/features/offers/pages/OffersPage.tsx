import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { SkeletonList } from '@/components/ui/Skeleton';
import { date as fmtDate } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import type { OfferStatus } from '@/types/database';
import { useOffers } from '../hooks';
import { OFFER_STATUS_LABELS, OFFER_STATUS_TONES } from '../types';

const STATUS_ORDER: OfferStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

export default function OffersPage() {
  const navigate = useNavigate();
  const { can } = useSession();
  const offers = useOffers();
  const [status, setStatus] = useState<OfferStatus | null>(null);

  const list = useMemo(
    () => (offers.data ?? []).filter((o) => !status || o.status === status),
    [offers.data, status],
  );

  return (
    <div className="flex flex-col gap-4">
      <Chips
        options={STATUS_ORDER.map((s) => ({ value: s, label: OFFER_STATUS_LABELS[s] }))}
        value={status}
        onChange={setStatus}
      />

      {offers.isLoading && <SkeletonList rows={4} />}

      {!offers.isLoading && list.length === 0 && (
        <EmptyState
          icon={FileText}
          message={
            status
              ? 'Brak ofert o tym statusie.'
              : 'Brak ofert — utwórz pierwszą przyciskiem +.'
          }
        />
      )}

      {list.map((o) => (
        <Card
          key={o.id}
          interactive
          className="flex flex-col gap-2 p-4"
          onClick={() => navigate(`/oferty/${o.id}`)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {o.number}
                {o.title ? ` — ${o.title}` : ''}
              </p>
              <p className="mt-0.5 truncate text-xs text-text-secondary">
                {[
                  o.client?.name ??
                    ((o.client_snapshot as { name?: string } | null)?.name || null),
                  o.valid_until ? `ważna do ${fmtDate(o.valid_until)}` : null,
                  o.viewed_at
                    ? `otwarta ${o.view_count} ${o.view_count === 1 ? 'raz' : 'razy'}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            </div>
            <Badge tone={OFFER_STATUS_TONES[o.status]}>
              {OFFER_STATUS_LABELS[o.status]}
            </Badge>
          </div>
        </Card>
      ))}

      {can('offers_edit') && (
        <FAB
          label="Nowa oferta"
          icon={<Plus className="size-7" />}
          onClick={() => navigate('/oferty/nowa')}
        />
      )}
    </div>
  );
}
