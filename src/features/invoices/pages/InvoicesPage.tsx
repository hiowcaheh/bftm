import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { SkeletonList } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { usePublicBranding } from '@/features/auth/hooks';
import { useCompanyDetails } from '@/features/settings/hooks';
import { fetchInvoiceItems, fetchLogoDataUrl } from '../api';
import type { InvoiceSpec } from '../api';
import { generateInvoiceSpecPdf, shareInvoicePdf } from '../pdf';
import { useDeleteInvoiceSpec, useInvoiceSpecs } from '../hooks';
import { NewInvoiceSpecSheet } from '../components/NewInvoiceSpecSheet';
import { PdfPreviewOverlay } from '../components/PdfPreviewOverlay';

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'underlag';

const periodLabel = (from: string, to: string) =>
  `${format(new Date(from), 'd MMM', { locale: pl })} – ${format(new Date(to), 'd MMM yyyy', { locale: pl })}`;

/** Cache logo (data URL) w module — pobierane raz na sesję. */
let logoCache: { path: string | null; dataUrl: string | null } | null = null;

export default function InvoicesPage() {
  const specs = useInvoiceSpecs();
  const branding = usePublicBranding();
  const company = useCompanyDetails(true);
  const deleteSpec = useDeleteInvoiceSpec();

  const [newOpen, setNewOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<InvoiceSpec | null>(null);
  const [preview, setPreview] = useState<{ blob: Blob; filename: string; title: string } | null>(
    null,
  );

  const generateAndPreview = async (spec: InvoiceSpec) => {
    if (generatingId) return;
    setGeneratingId(spec.id);
    try {
      const projectName = spec.project?.name ?? 'Projekt';
      const logoPath = branding.data?.logoPath ?? null;
      if (!logoCache || logoCache.path !== logoPath) {
        logoCache = { path: logoPath, dataUrl: await fetchLogoDataUrl(logoPath) };
      }
      const items = await fetchInvoiceItems(spec.project_id, spec.period_from, spec.period_to);
      if (items.length === 0) {
        toast.info('Brak wpisanych godzin dla tego projektu w wybranym okresie');
      }
      const blob = await generateInvoiceSpecPdf({
        companyName: branding.data?.companyName ?? 'BFTM Fasad & Bygg AB',
        projectName,
        title: spec.title,
        periodFrom: spec.period_from,
        periodTo: spec.period_to,
        items,
        logoDataUrl: logoCache.dataUrl,
        companyPhone: company.data?.phone ?? null,
        companyEmail: company.data?.email ?? null,
      });
      const filename = `underlag-${slug(spec.title || projectName)}-${spec.period_from}.pdf`;
      setPreview({ blob, filename, title: spec.title || projectName });
    } catch {
      toast.error('Nie udało się wygenerować PDF');
    } finally {
      setGeneratingId(null);
    }
  };

  const list = specs.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {specs.isLoading && <SkeletonList rows={4} />}

      {!specs.isLoading && list.length === 0 && (
        <EmptyState
          icon={FileText}
          message="Brak specyfikacji faktury — utwórz pierwszą przyciskiem +."
        />
      )}

      {list.length > 0 && (
        <Card className="flex flex-col divide-y divide-line">
          {list.map((s) => {
            const busy = generatingId === s.id;
            return (
              <div key={s.id} className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={busy}
                  className="press flex min-w-0 flex-1 items-center gap-3 p-3 text-left disabled:opacity-60"
                  onClick={() => void generateAndPreview(s)}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface">
                    {busy ? (
                      <Loader2 className="size-5 animate-spin text-accent" strokeWidth={1.8} />
                    ) : (
                      <FileText className="size-5 text-accent" strokeWidth={1.8} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {s.title || s.project?.name || 'Underlag'}
                    </p>
                    <p className="truncate text-xs text-text-secondary">
                      {[
                        s.project?.name,
                        s.client?.name,
                        periodLabel(s.period_from, s.period_to),
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  aria-label="Usuń specyfikację"
                  className="press mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary"
                  onClick={() => setToDelete(s)}
                >
                  <Trash2 className="size-4.5" />
                </button>
              </div>
            );
          })}
        </Card>
      )}

      <FAB
        label="Nowa specyfikacja"
        icon={<Plus className="size-7" />}
        onClick={() => setNewOpen(true)}
      />

      <NewInvoiceSpecSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(spec) => void generateAndPreview(spec)}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Usunąć specyfikację?"
        description="Pozycja zniknie z listy. Godziny i wpisy pozostają nienaruszone."
        confirmLabel="Usuń"
        destructive
        loading={deleteSpec.isPending}
        onConfirm={() => {
          if (toDelete) {
            deleteSpec.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
          }
        }}
        onCancel={() => setToDelete(null)}
      />

      <PdfPreviewOverlay
        open={preview !== null}
        blob={preview?.blob ?? null}
        filename={preview?.filename ?? ''}
        title={preview?.title}
        onClose={() => setPreview(null)}
        onShare={() => {
          if (preview) return shareInvoicePdf(preview.blob, preview.filename);
        }}
      />
    </div>
  );
}
