// Wysyłka oferty e-mailem przez Resend. Klucz API leży w tabeli
// public.app_secrets (RLS + odebrane granty — czyta go tylko service_role),
// więc NIE trafia do bundla aplikacji ani do repozytorium.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FROM = 'BFTM Fasad & Bygg AB <kontakt@bftm.se>';
const REPLY_TO = 'mateus@bftm.se';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface Payload {
  to: string;
  clientName?: string | null;
  offerNumber?: string | null;
  title: string;
  url: string;
  validUntil?: string | null; // ISO yyyy-MM-dd
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function buildHtml(p: Payload): string {
  const name = escapeHtml(p.clientName?.trim() || 'kund');
  const title = escapeHtml(p.title.trim());
  const number = p.offerNumber ? escapeHtml(p.offerNumber) : '';
  const valid = fmtDate(p.validUntil);
  const url = encodeURI(p.url);

  return `<!doctype html>
<html lang="sv">
<body style="margin:0;padding:0;background:#f2f2f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="background:#A50000;padding:28px 32px;">
          <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.3px;">BFTM Fasad &amp; Bygg AB</div>
          ${number ? `<div style="color:#ffd6d6;font-size:13px;margin-top:4px;">Offert ${number}</div>` : ''}
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;">Hej ${name}!</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#333;">
            Tack för visat intresse för våra tjänster. Vi har förberett en detaljerad
            offert för ditt projekt: <strong>${title}</strong>.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#333;">
            Du kan ta del av hela offerten via knappen nedan — utan inloggning,
            med möjlighet att svara direkt.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="border-radius:10px;background:#A50000;">
              <a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                Öppna offerten
              </a>
            </td></tr>
          </table>
          ${valid ? `<p style="margin:0 0 8px;font-size:13px;color:#666;">Offerten är giltig till och med <strong>${escapeHtml(valid)}</strong>.</p>` : ''}
          <p style="margin:24px 0 0;font-size:13px;color:#999;line-height:1.5;word-break:break-all;">
            Om knappen inte fungerar, kopiera länken:<br>${escapeHtml(p.url)}
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:13px;color:#888;">Med vänliga hälsningar,<br>BFTM Fasad &amp; Bygg AB</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceRoleKey) {
      return json({ error: 'Brak konfiguracji serwera' }, 500);
    }
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Uwierzytelnienie: tylko zalogowany, aktywny użytkownik może wysyłać
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Brak tokenu uwierzytelniającego' }, 401);
    const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !userData.user) return json({ error: 'Nieprawidłowa sesja' }, 401);
    const { data: profile } = await admin
      .from('profiles')
      .select('active')
      .eq('id', userData.user.id)
      .single();
    if (!profile || !profile.active) {
      return json({ error: 'Konto nieaktywne' }, 403);
    }

    const body = (await req.json()) as Payload;
    if (!body?.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.to)) {
      return json({ error: 'Brak poprawnego adresu e-mail klienta' }, 400);
    }
    if (!body.title?.trim() || !body.url) {
      return json({ error: 'Brak danych oferty do wysłania' }, 400);
    }

    // Klucz Resend z serwerowego schowka
    const { data: secret, error: secretErr } = await admin
      .from('app_secrets')
      .select('value')
      .eq('key', 'resend_api_key')
      .single();
    if (secretErr || !secret?.value) {
      return json({ error: 'Brak skonfigurowanego klucza Resend' }, 500);
    }

    const subjectNumber = body.offerNumber ? `Offert ${body.offerNumber} — ` : 'Offert — ';
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [body.to],
        reply_to: REPLY_TO,
        subject: `${subjectNumber}${body.title.trim()}`,
        html: buildHtml(body),
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error('Resend odrzucił wysyłkę:', resendRes.status, detail);
      return json({ error: 'Nie udało się wysłać wiadomości' }, 502);
    }

    const sent = (await resendRes.json()) as { id?: string };
    return json({ ok: true, id: sent.id ?? null });
  } catch (e) {
    console.error('Nieoczekiwany błąd send-offer-email:', e);
    return json({ error: 'Wystąpił nieoczekiwany błąd serwera' }, 500);
  }
});
