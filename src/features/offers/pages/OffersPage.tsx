import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { SkeletonList } from '@/components/ui/Skeleton';
import { date as fmtDate } from '@/lib/format';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import type { OfferStatus } from '@/types/database';
import { useOffers } from '../hooks';
import { OFFER_STATUS_TONES } from '../types';

const STATUS_ORDER: OfferStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

export default function OffersPage() {
  const navigate = useNavigate();
  const { can } = useSession();
  const t = useT();
  const offers = useOffers();
  const [status, setStatus] = useState<OfferStatus | null>(null);

  const list = useMemo(
    () => (offers.data ?? []).filter((o) => !status || o.status === status),
    [offers.data, status],
  );

  return (
    <div className="flex flex-col gap-4">
      <Chips
        options={STATUS_ORDER.map((s) => ({ value: s, label: t(`ostatus.${s}`) }))}
        value={status}
        onChange={setStatus}
      />

      {offers.isLoading && <SkeletonList rows={4} />}

      {!offers.isLoading && list.length === 0 && (
        <EmptyState
          icon={FileText}
          message={status ? t('off.emptyStatus') : t('off.empty')}
        />
      )}

      {list.map((o) => {
        const clientName =
          o.client?.name ?? ((o.client_snapshot as { name?: string } | null)?.name || null);
        const validUntil = o.valid_until
          ? t('off.validUntilLc', { date: fmtDate(o.valid_until) })
          : null;
        return (
          <Card
            key={o.id}
            interactive
            className="flex flex-col gap-3 p-4"
            onClick={() => navigate(`/oferty/${o.id}`)}
          >
            <div className="flex items-start gap-3">
              {/* Kafelek z ikoną modułu */}
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <FileText className="size-5" strokeWidth={1.9} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="tabular-nums text-[11px] font-semibold tracking-wide text-text-secondary">
                    {o.number}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {o.viewed_at && (
                      <span className="tabular-nums flex items-center gap-1 text-xs text-text-secondary">
                        <Eye className="size-3.5" /> {o.view_count}
                      </span>
                    )}
                    <Badge tone={OFFER_STATUS_TONES[o.status]}>{t(`ostatus.${o.status}`)}</Badge>
                  </div>
                </div>
                <p className="mt-0.5 truncate text-sm font-semibold">
                  {o.title?.trim() || clientName || t('off.untitled')}
                </p>
                {(clientName || validUntil) && (
                  <p className="mt-0.5 truncate text-xs text-text-secondary">
                    {[o.title?.trim() ? clientName : null, validUntil]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {can('offers_edit') && (
        <FAB
          label={t('off.newOffer')}
          icon={<Plus className="size-7" />}
          onClick={() => navigate('/oferty/nowa')}
        />
      )}
    </div>
  );
}
