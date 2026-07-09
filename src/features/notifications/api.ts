import { supabase } from '@/lib/supabaseClient';
import type { Tables } from '@/types/database';

export type Notification = Tables<'notifications'>;

export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}

/**
 * Wysyłka powiadomień (RLS: admin lub hours_approve).
 * Używane m.in. przy zatwierdzaniu godzin.
 */
export async function sendNotifications(
  items: Array<{ recipient_id: string; type: string; title: string; body?: string }>,
): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('notifications').insert(items);
  if (error) console.error('Nie udało się wysłać powiadomień:', error);
}
