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

/** Telefon w profilu — e-mail i rolę zmienia wyłącznie właściciel firmy. */
export async function saveMyPhone(userId: string, phone: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ phone: phone.trim() || null })
    .eq('id', userId);
  if (error) throw error;
}
