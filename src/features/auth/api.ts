import { supabase } from '@/lib/supabaseClient';
import type { Profile } from './types';

/** Branding + e-mail admina — wiersze settings czytelne dla anon (ekran logowania). */
export interface PublicBranding {
  companyName: string;
  logoPath: string | null;
  adminEmail: string | null;
}

export async function fetchPublicBranding(): Promise<PublicBranding> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['company_branding', 'admin_login']);
  if (error) throw error;

  const branding = data.find((r) => r.key === 'company_branding')?.value as
    | { name?: string; logo_path?: string | null }
    | undefined;
  const adminLogin = data.find((r) => r.key === 'admin_login')?.value as
    | { email?: string | null }
    | undefined;

  return {
    companyName: branding?.name?.trim() || 'BFTM',
    logoPath: branding?.logo_path ?? null,
    adminEmail: adminLogin?.email ?? null,
  };
}

/**
 * Logowanie: literalne „admin" mapuje się na e-mail administratora z settings.
 * Zwraca komunikaty po polsku dla typowych błędów Supabase.
 */
export async function signIn(loginOrEmail: string, password: string): Promise<void> {
  let email = loginOrEmail.trim().toLowerCase();
  if (!email.includes('@')) {
    if (email === 'admin') {
      const { adminEmail } = await fetchPublicBranding();
      if (!adminEmail) {
        throw new Error('Konto administratora nie jest jeszcze skonfigurowane');
      }
      email = adminEmail;
    } else {
      throw new Error('Podaj adres e-mail albo login „admin"');
    }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Nieprawidłowy login lub hasło');
    }
    if (error.message.includes('banned') || error.status === 403) {
      throw new Error('Konto jest zablokowane — skontaktuj się z administratorem');
    }
    throw new Error('Nie udało się zalogować — spróbuj ponownie');
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Zmiana hasła + zdjęcie flagi wymuszenia. */
export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (error.message.includes('at least')) {
      throw new Error('Hasło musi mieć co najmniej 6 znaków');
    }
    if (error.message.includes('different from the old')) {
      throw new Error('Nowe hasło musi być inne niż obecne');
    }
    throw new Error('Nie udało się zmienić hasła — spróbuj ponownie');
  }
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', userData.user.id);
  }
}

/** Weryfikacja starego hasła przy dobrowolnej zmianie w Ustawieniach. */
export async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}
