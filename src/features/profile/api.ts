import { supabase } from '@/lib/supabaseClient';

export interface MyPrivateData {
  personnummer: string;
  shirt_size: string;
  pants_size: string;
  shoe_size: string;
}

const EMPTY: MyPrivateData = {
  personnummer: '',
  shirt_size: '',
  pants_size: '',
  shoe_size: '',
};

/** Dane osobiste zalogowanego (RLS: własny wiersz employee_private). */
export async function fetchMyPrivate(userId: string): Promise<MyPrivateData> {
  const { data, error } = await supabase
    .from('employee_private')
    .select('personnummer, shirt_size, pants_size, shoe_size')
    .eq('profile_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return EMPTY;
  return {
    personnummer: data.personnummer ?? '',
    shirt_size: data.shirt_size ?? '',
    pants_size: data.pants_size ?? '',
    shoe_size: data.shoe_size ?? '',
  };
}

export async function saveMyPrivate(
  userId: string,
  values: MyPrivateData,
): Promise<void> {
  const { error } = await supabase.from('employee_private').upsert({
    profile_id: userId,
    personnummer: values.personnummer.trim() || null,
    shirt_size: values.shirt_size.trim() || null,
    pants_size: values.pants_size.trim() || null,
    shoe_size: values.shoe_size.trim() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Telefon i nazwa w profilu — e-mail i rolę zmienia wyłącznie właściciel firmy. */
export async function saveMyProfileFields(
  userId: string,
  fields: { phone: string; fullName: string },
): Promise<void> {
  const patch: { phone: string | null; full_name?: string } = {
    phone: fields.phone.trim() || null,
  };
  if (fields.fullName.trim()) patch.full_name = fields.fullName.trim();
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

/** Wgranie zdjęcia profilowego (kompresja, publiczny bucket avatars). */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const { compressImage } = await import('@/lib/imageCompress');
  const blob = await compressImage(file, 512, 0.85);
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    // ścieżka z timestampem = plik niezmienny → można cache'ować na rok
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (uploadError) throw new Error('Nie udało się przesłać zdjęcia');
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_path: path })
    .eq('id', userId);
  if (error) throw error;
  return path;
}
