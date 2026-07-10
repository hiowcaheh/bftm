import type { OfferStatus, Tables } from '@/types/database';

export type Offer = Tables<'offers'>;
export type OfferItem = Tables<'offer_items'>;

export interface OfferWithClient extends Offer {
  client: { id: string; name: string } | null;
}

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: 'Szkic',
  sent: 'Wysłana',
  accepted: 'Zaakceptowana',
  rejected: 'Odrzucona',
  expired: 'Wygasła',
};

export const OFFER_STATUS_TONES: Record<
  OfferStatus,
  'neutral' | 'accent' | 'success' | 'error' | 'warning' | 'info'
> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'error',
  expired: 'warning',
};

/** Pozycja do kalkulacji — wspólny kształt dla edytora i strony publicznej. */
export interface CalcItem {
  quantity: number;
  unit_price: number;
  vat_rate: number;
  is_labor: boolean;
}

export interface OfferTotals {
  net: number;
  /** moms pogrupowany stawką, np. { '25': 1250 } */
  vatByRate: Array<{ rate: number; amount: number }>;
  vatTotal: number;
  gross: number;
  /** robocizna brutto — podstawa ROT */
  rotBase: number;
  rotDeduction: number;
  toPay: number;
}

/**
 * Sumy oferty. Omvänd byggmoms: moms 0 (odprowadza nabywca) i bez ROT.
 * ROT: 30% robocizny brutto, limit cap × liczba osób (Skatteverket 2026).
 */
export function computeOfferTotals(
  items: CalcItem[],
  opts: {
    reverseVat: boolean;
    rotEnabled: boolean;
    rotPersons: number;
    rotPct: number;
    rotCap: number;
  },
): OfferTotals {
  let net = 0;
  let rotBase = 0;
  const vatMap = new Map<number, number>();

  for (const item of items) {
    const line = item.quantity * item.unit_price;
    net += line;
    const vat = opts.reverseVat ? 0 : line * (item.vat_rate / 100);
    if (!opts.reverseVat) {
      vatMap.set(item.vat_rate, (vatMap.get(item.vat_rate) ?? 0) + vat);
    }
    if (item.is_labor) rotBase += line + vat;
  }

  const vatByRate = [...vatMap.entries()]
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[0] - a[0])
    .map(([rate, amount]) => ({ rate, amount }));
  const vatTotal = vatByRate.reduce((s, v) => s + v.amount, 0);
  const gross = net + vatTotal;

  const rotDeduction =
    opts.rotEnabled && !opts.reverseVat
      ? Math.min((rotBase * opts.rotPct) / 100, opts.rotCap * Math.max(opts.rotPersons, 1))
      : 0;

  return { net, vatByRate, vatTotal, gross, rotBase, rotDeduction, toPay: gross - rotDeduction };
}

/** Dane oferty zwracane klientowi przez offer_public (jsonb z RPC). */
export interface PublicOffer {
  number: string;
  title: string | null;
  status: OfferStatus;
  issue_date: string | null;
  valid_until: string | null;
  reverse_vat: boolean;
  rot_enabled: boolean;
  rot_persons: number;
  notes: string | null;
  terms: string | null;
  guarantee: string | null;
  ata_info: string | null;
  travel_info: string | null;
  payment_days: number | null;
  responded_at: string | null;
  client: { name?: string; email?: string; address?: string };
  items: Array<{
    description: string;
    unit: string | null;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    is_labor: boolean;
  }>;
  company: {
    name?: string;
    address?: string;
    org_nr?: string;
    vat_nr?: string;
    f_skatt?: boolean;
    phone?: string;
    email?: string;
    about?: string;
    services?: string[];
  };
  branding: { name?: string; slogan?: string; logo_path?: string | null };
  rot: { enabled?: boolean; pct?: number; cap_per_person?: number };
}
