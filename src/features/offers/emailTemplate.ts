// Szablon HTML maila z ofertą — zgodny z firmową szatą BFTM (granat + czerwień).
// Budowany po stronie klienta, żeby podgląd był 1:1 z tym, co dostaje klient.

const NAVY = '#1E2A44';
const RED = '#CC0000';

export interface OfferEmailParams {
  clientName: string;
  offerTitle: string;
  offerNumber: string | null;
  url: string;
  validUntil: string | null; // ISO yyyy-MM-dd
  companyName: string;
  logoUrl: string | null;
  email: string; // kontakt@bftm.se
  website: string; // www.bftm.se
  contacts: Array<{ name: string; phone: string }>;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/** Data ważności w formacie DD/MM/RRRR (jak na wzorze). */
function fmtValid(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function buildOfferEmailSubject(offerNumber: string | null, title: string): string {
  return (offerNumber ? `Offert ${offerNumber} — ` : 'Offert — ') + title.trim();
}

export function buildOfferEmailHtml(p: OfferEmailParams): string {
  const name = esc(p.clientName.trim() || 'kund');
  const title = esc(p.offerTitle.trim());
  const company = esc(p.companyName.trim() || 'BFTM Fasad & Bygg AB');
  const url = encodeURI(p.url);
  const urlText = esc(p.url);
  const valid = fmtValid(p.validUntil);
  const year = new Date().getFullYear();

  const logo = p.logoUrl
    ? `<img src="${encodeURI(p.logoUrl)}" alt="${company}" style="max-width:260px;width:100%;height:auto;display:block;margin:0 auto;" />`
    : `<div style="color:#ffffff;font-size:22px;font-weight:700;text-align:center;letter-spacing:.5px;">${company}</div>`;

  const contactRows = p.contacts
    .filter((c) => c.phone)
    .map(
      (c) =>
        `<tr><td style="padding:4px 0;font-size:14px;color:#333;">📞 <strong>${esc(c.name)}${c.name ? ':' : ''}</strong> <span style="color:${NAVY};">${esc(c.phone)}</span></td></tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="sv">
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;padding:20px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06);">

        <!-- Nagłówek: logo na granacie -->
        <tr><td style="background:${NAVY};padding:32px 28px 28px;">${logo}</td></tr>

        <!-- Czerwony pasek z tytułem oferty -->
        <tr><td style="background:${RED};padding:14px 28px;">
          <div style="color:#ffffff;font-size:16px;font-weight:700;">Offert för: ${title}</div>
        </td></tr>

        <!-- Treść -->
        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;font-size:16px;">Hej <strong>${name}</strong>!</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">Vi bjuder in dig att noggrant granska offerten och kontakta oss om du har några frågor.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">Tack för visat intresse för våra tjänster. Vi har förberett en detaljerad offert för ditt projekt: <strong>${title}</strong>.</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333;">Du kan ta del av hela offerten genom att klicka på länken nedan:</p>

          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;"><tr><td align="center">
            <a href="${url}" style="display:inline-block;padding:15px 34px;background:${RED};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;">Visa fullständig offert</a>
          </td></tr></table>

          <p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#555;">Om ovanstående länk inte fungerar, kopiera och klistra in följande länk i din webbläsare:</p>
          <div style="background:#F5F5F7;border-radius:10px;padding:14px 16px;font-size:13px;color:#333;word-break:break-all;margin:0 0 20px;">${urlText}</div>

          ${valid ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333;">Observera att denna offert är giltig fram till: <strong>${esc(valid)}</strong></p>` : ''}

          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333;">Med vänliga hälsningar,<br>${company}</p>

          <!-- Kontakt -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e6e6ea;border-radius:12px;">
            <tr><td style="padding:18px 20px;">
              <div style="font-size:15px;font-weight:700;color:${NAVY};margin:0 0 10px;">Kontakta oss</div>
              <div style="border-top:1px solid #ececf0;padding-top:10px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  ${contactRows}
                  <tr><td style="padding:4px 0;font-size:14px;color:#333;">✉️ <strong>E-post:</strong> <span style="color:${NAVY};">${esc(p.email)}</span></td></tr>
                  <tr><td style="padding:4px 0;font-size:14px;color:#333;">🌐 <strong>Webbplats:</strong> <span style="color:${NAVY};">${esc(p.website)}</span></td></tr>
                </table>
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Stopka -->
        <tr><td style="background:${NAVY};padding:18px 28px;text-align:center;">
          <div style="color:#ffffff;font-size:13px;opacity:.85;">© ${year} ${company}. Alla rättigheter reserverade.</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
