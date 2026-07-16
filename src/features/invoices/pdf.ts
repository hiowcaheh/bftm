import { format } from 'date-fns';
import type { InvoiceSpecItem } from './api';

/** Minimalny typ instancji pdfMake — biblioteka ładowana leniwie. */
interface PdfMakeLike {
  vfs: Record<string, string>;
  createPdf: (doc: unknown) => { getBlob: (cb: (blob: Blob) => void) => void };
}

let pdfMakePromise: Promise<PdfMakeLike> | null = null;

/** Leniwe załadowanie pdfmake + fontów (tylko przy pierwszym generowaniu). */
async function loadPdfMake(): Promise<PdfMakeLike> {
  pdfMakePromise ??= (async () => {
    const [core, fonts] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ]);
    const coreAny = core as unknown as { default?: PdfMakeLike } & PdfMakeLike;
    const pdfMake = (coreAny.default ?? coreAny) as PdfMakeLike;
    const fontsAny = fonts as unknown as {
      default?: Record<string, string>;
    } & Record<string, string>;
    pdfMake.vfs = fontsAny.default ?? fontsAny;
    return pdfMake;
  })();
  return pdfMakePromise;
}

const NAVY = '#1E2A44';
const ACCENT = '#cc0000';
const GRAY = '#6b7280';
const LINE = '#e5e5e5';

const hrs = (n: number) => n.toFixed(2);
/** 5.05.2026 — jak w nagłówku okresu na wzorcu. */
const periodDay = (iso: string) => format(new Date(iso), 'd.MM.yyyy');

export interface InvoicePdfInput {
  companyName: string;
  projectName: string;
  /** Ręczny tytuł, np. „Puts reparation". */
  title: string | null;
  periodFrom: string;
  periodTo: string;
  items: InvoiceSpecItem[];
  /** Logo firmy jako data URL (PNG/JPG) — jeśli brak, pokazujemy nazwę. */
  logoDataUrl: string | null;
}

/** Buduje definicję dokumentu w układzie underlag (jak wzorzec faktury). */
function buildDocDefinition(input: InvoicePdfInput): Record<string, unknown> {
  const { companyName, projectName, title, periodFrom, periodTo, items, logoDataUrl } = input;
  const totalHours = items.reduce((s, i) => s + i.hours, 0);
  const periodStr = `${periodDay(periodFrom)} - ${periodDay(periodTo)}`;
  const underlagLine = title ? `Underlag för ${title} - ${projectName}` : `Underlag – ${projectName}`;

  // Prawy blok nagłówka (firma + underlag + okres)
  const headerRight = {
    stack: [
      { text: companyName, fontSize: 16, bold: true, color: '#111111', alignment: 'right' },
      { text: underlagLine, fontSize: 11, color: '#333333', alignment: 'right', margin: [0, 3, 0, 0] },
      { text: `Rapport för ${periodStr}`, fontSize: 10, color: GRAY, alignment: 'right', margin: [0, 2, 0, 0] },
    ],
  };

  const headerLeft = logoDataUrl
    ? { image: logoDataUrl, fit: [150, 70] }
    : { text: companyName, fontSize: 14, bold: true, color: NAVY };

  // Tabela pozycji
  const tableHeader = ['ÄTA Namn', 'Projekt', 'Datum', 'Anställd', 'Arb. h', 'Anteckning'].map(
    (t, idx) => ({
      text: t,
      bold: true,
      fontSize: 9,
      color: '#333333',
      alignment: idx === 4 ? 'right' : 'left',
      noWrap: idx === 2 || idx === 4, // Datum i Arb. h zawsze w jednej linii
    }),
  );

  const bodyRows = items.map((it) => [
    { text: it.activity_name ?? '—', fontSize: 9, color: '#111111' },
    { text: projectName, fontSize: 9, color: '#333333' },
    { text: it.entry_date, fontSize: 9, color: '#333333', noWrap: true },
    { text: it.employee_name, fontSize: 9, color: '#111111' },
    { text: hrs(it.hours), fontSize: 9, color: '#111111', alignment: 'right', noWrap: true },
    { text: it.note ?? '', fontSize: 9, color: GRAY },
  ]);

  return {
    pageSize: 'A4',
    pageMargins: [40, 44, 40, 54],
    defaultStyle: { font: 'Roboto', fontSize: 9, lineHeight: 1.15 },
    footer: (currentPage: number, pageCount: number) => ({
      text: `${companyName}  ·  ${currentPage} / ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: GRAY,
      margin: [0, 16, 0, 0],
    }),
    content: [
      {
        columns: [
          { width: '*', ...headerLeft },
          { width: 'auto', ...headerRight },
        ],
        columnGap: 16,
      },
      {
        text: `Totalt arbetade timmar: ${hrs(totalHours)} h`,
        alignment: 'right',
        color: ACCENT,
        bold: true,
        fontSize: 12,
        margin: [0, 18, 0, 0],
      },
      {
        table: {
          headerRows: 1,
          // ÄTA/Anställd/Anteckning elastyczne (zawijają), Datum/Arb. h stałe —
          // pdfmake sam rozciąga wysokość wiersza, nic nie wychodzi za ramkę.
          widths: ['*', 80, 62, '*', 34, '*'],
          body: [tableHeader, ...bodyRows],
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
            i === 0 ? 0 : i === 1 ? 1 : i === node.table.body.length ? 0.8 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i === 1 ? '#333333' : LINE),
          paddingTop: () => 7,
          paddingBottom: () => 7,
          paddingLeft: (i: number) => (i === 0 ? 0 : 6),
          paddingRight: (i: number, node: { table: { widths: unknown[] } }) =>
            i === node.table.widths.length - 1 ? 0 : 6,
        },
        margin: [0, 22, 0, 0],
      },
    ],
  };
}

/** Generuje PDF underlag i zwraca Blob. */
export async function generateInvoiceSpecPdf(input: InvoicePdfInput): Promise<Blob> {
  const pdfMake = await loadPdfMake();
  const doc = buildDocDefinition(input);
  return new Promise<Blob>((resolve) => {
    pdfMake.createPdf(doc).getBlob((blob) => resolve(blob));
  });
}

/** Zapis / udostępnienie PDF (iOS: „Zapisz w Plikach", udostępnij mailem). */
export async function shareInvoicePdf(blob: Blob, filename: string): Promise<void> {
  try {
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch {
    /* fallback poniżej */
  }
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
