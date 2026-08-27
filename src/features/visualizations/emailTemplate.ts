// Szablon HTML maila z wizualizacją — ta sama szata co oferty (granat + czerwień),
// budowany po stronie klienta. Klient końcowy widzi szwedzki.

const NAVY = '#1E2A44';
const RED = '#CC0000';

export interface VizEmailParams {
  clientName: string;
  vizTitle: string;
  url: string;
  companyName: string;
  logoUrl: string | null;
  email: string;
  website: string;
  contacts: Array<{ name: string; phone: string }>;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

export function buildVizEmailSubject(title: string): string {
  return `Visualisering — ${title.trim() || 'ditt projekt'}`;
}

export function buildVizEmailHtml(p: VizEmailParams): string {
  const name = esc(p.clientName.trim() || 'kund');
  const title = esc(p.vizTitle.trim() || 'ditt projekt');
  const company = esc(p.companyName.trim() || 'BFTM Fasad & Bygg AB');
  const url = encodeURI(p.url);
  const urlText = esc(p.url);
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

        <tr><td style="background:${NAVY};padding:32px 28px 28px;">${logo}</td></tr>

        <tr><td style="background:${RED};padding:14px 28px;">
          <div style="color:#ffffff;font-size:16px;font-weight:700;">Visualisering: ${title}</div>
        </td></tr>

        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;font-size:16px;">Hej <strong>${name}</strong>!</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">Vi har förberett en visualisering av arbetet för ditt projekt: <strong>${title}</strong>. På kartan ser du de markerade punkterna med beskrivning och bilder.</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333;">Öppna visualiseringen genom att klicka på knappen nedan:</p>

          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;"><tr><td align="center">
            <a href="${url}" style="display:inline-block;padding:15px 34px;background:${RED};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;">Öppna visualisering</a>
          </td></tr></table>

          <p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#555;">Om knappen inte fungerar, kopiera och klistra in följande länk i din webbläsare:</p>
          <div style="background:#F5F5F7;border-radius:10px;padding:14px 16px;font-size:13px;color:#333;word-break:break-all;margin:0 0 20px;">${urlText}</div>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333;">Med vänliga hälsningar,<br>${company}</p>

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

        <tr><td style="background:${NAVY};padding:18px 28px;text-align:center;">
          <div style="color:#ffffff;font-size:13px;opacity:.85;">© ${year} ${company}. Alla rättigheter reserverade.</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
