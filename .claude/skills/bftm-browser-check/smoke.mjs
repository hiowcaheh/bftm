// Test dymny BFTM w przeglądarce BEZ produkcji: Supabase przechwycony w Playwright,
// sesja = podstawiony admin, odpowiedzi = dane testowe poniżej (puste listy dla reszty).
// Użycie: node .claude/skills/bftm-browser-check/smoke.mjs <katalog-na-zrzuty> [trasa ...]
// Wymaga: npm run build && npx vite preview --port 4173 (w tle).
import { createRequire } from 'node:module';

const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');

const OUT = process.argv[2] ?? '.';
const ROUTES = process.argv.length > 3 ? process.argv.slice(3) : [
  '/', '/projekty', '/godziny', '/oferty', '/klienci', '/pracownicy', '/pracownicy/archiwum',
  '/raporty', '/finanse', '/wyplaty', '/specyfikacje-faktury', '/wizualizacje', '/ustawienia', '/profil',
];
const BASE = process.env.BFTM_URL ?? 'http://localhost:4173';
// fikcyjne ID — repo jest publiczne, nie wpisujemy tu prawdziwych kont
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const now = new Date().toISOString();
const person = (id, full_name, extra = {}) => ({
  id, full_name, email: `${id.slice(0, 4)}@example.com`, phone: null, role: 'employee', lang: 'pl',
  permissions: { hours_add_own: true, projects_view: true }, active: true, must_change_password: false,
  avatar_path: null, last_seen_at: now, archived_at: null, created_at: '2026-07-10T10:00:00Z', ...extra,
});
// Dane testowe — dopisz tabele potrzebne sprawdzanemu ekranowi.
const DATA = {
  profiles: [
    person(ADMIN, 'Admin Test', { role: 'admin', permissions: {} }),
    person('22222222-2222-2222-2222-222222222222', 'Jan Kowalski'),
    person('44444444-4444-4444-4444-444444444444', 'Andrij Bondar', { active: false, archived_at: now, lang: 'uk' }),
  ],
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.addInitScript((admin) => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  localStorage.setItem('sb-ixositdqghamqeproryp-auth-token', JSON.stringify({
    access_token: 'test.' + btoa(JSON.stringify({ sub: admin, exp })) + '.x', token_type: 'bearer',
    expires_in: 3600, expires_at: exp, refresh_token: 'r',
    // tylko wartości z przeglądarki — zmienne Node (np. `now`) tu nie istnieją
    user: { id: admin, aud: 'authenticated', role: 'authenticated', email: 'admin@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-07-10T10:00:00Z' },
  }));
  localStorage.setItem('bftm-lang', 'pl');
}, ADMIN);

await page.route('**/*.supabase.co/**', async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  const table = url.pathname.match(/\/rest\/v1\/([a-z_]+)$/)?.[1];
  if (table && DATA[table]) {
    const id = url.searchParams.get('id');
    if (id?.startsWith('eq.')) {
      const row = DATA[table].find((r) => r.id === id.slice(3)) ?? null;
      return json((req.headers().accept ?? '').includes('vnd.pgrst.object') ? row : row ? [row] : []);
    }
    return json(DATA[table]);
  }
  if (url.pathname.includes('/rpc/')) return route.fulfill({ status: 204, body: '' });
  if (url.pathname.includes('/storage/')) return route.fulfill({ status: 404, body: '' });
  if (url.pathname.includes('/auth/v1/')) return json({});
  return req.method() === 'GET' || req.method() === 'HEAD' ? json([]) : route.fulfill({ status: 204, body: '' });
});

let failed = 0;
for (const r of ROUTES) {
  await page.goto(`${BASE}/#${r}`);
  await page.waitForTimeout(1200);
  const title = await page.locator('header h1').first().innerText({ timeout: 3000 }).catch(() => '(brak nagłówka)');
  const text = await page.evaluate(() => document.body.innerText);
  if (/Logga in/.test(text)) {
    console.log('Ekran logowania — podstawiona sesja nie zadziałała (sprawdź addInitScript).');
    process.exit(2);
  }
  const crashed = /Coś poszło nie tak/.test(text);
  if (crashed) failed++;
  const file = `${OUT}/${r.replace(/\W+/g, '_') || 'root'}.png`;
  await page.screenshot({ path: file });
  console.log(`${r.padEnd(24)} → ${title.padEnd(24)} ${crashed ? 'BŁĄD EKRANU' : 'ok'}  ${file}`);
}
const real = errors.filter((e) => !/WebSocket|realtime|Failed to load resource|status of 40/i.test(e));
console.log('błędy JS:', real.length ? real.slice(0, 10) : 'brak');
await browser.close();
process.exit(failed || real.length ? 1 : 0);
