import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface Env {
  url: string;
  serviceRoleKey: string;
  anonKey: string;
}

export function readEnv(): Env {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceRoleKey || !anonKey) {
    throw new Error('Brak zmiennych środowiskowych Supabase');
  }
  return { url, serviceRoleKey, anonKey };
}

/** Klient z pełnymi prawami — używany WYŁĄCZNIE po stronie Edge Function. */
export function adminClient(env: Env): SupabaseClient {
  return createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Weryfikacja JWT wywołującego i sprawdzenie, że jest aktywnym adminem
 * według tabeli profiles. Zwraca id admina albo rzuca HttpError.
 */
export async function requireAdmin(req: Request, env: Env): Promise<string> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) throw new HttpError(401, 'Brak tokenu uwierzytelniającego');

  const admin = adminClient(env);
  const { data: userData, error } = await admin.auth.getUser(jwt);
  if (error || !userData.user) throw new HttpError(401, 'Nieprawidłowa sesja');

  const { data: profile } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', userData.user.id)
    .single();

  if (!profile || profile.role !== 'admin' || !profile.active) {
    throw new HttpError(403, 'Ta operacja wymaga uprawnień administratora');
  }
  return userData.user.id;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Wspólna obsługa handlera: CORS preflight + mapowanie błędów na JSON po polsku. */
export function serveHandler(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) {
        return json({ error: e.message }, e.status);
      }
      console.error('Nieoczekiwany błąd Edge Function:', e);
      return json({ error: 'Wystąpił nieoczekiwany błąd serwera' }, 500);
    }
  });
}
