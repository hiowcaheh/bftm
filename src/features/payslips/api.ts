import { supabase } from '@/lib/supabaseClient';
import { compressImage } from '@/lib/imageCompress';

export interface Payslip {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  file_path: string;
  file_type: string;
  note: string | null;
  created_at: string;
  employee: { id: string; full_name: string } | null;
}

const COLUMNS = '*, employee:profiles!employee_id(id, full_name)';

/** Lista specyfikacji. RLS: pracownik dostaje własne, admin — wszystkie. */
export async function fetchPayslips(employeeId?: string): Promise<Payslip[]> {
  let q = supabase
    .from('payslips')
    .select(COLUMNS)
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as Payslip[];
}

export async function payslipUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('payslips').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export interface UploadPayslipInput {
  employeeId: string;
  year: number;
  month: number;
  file: File;
  note: string;
  existing: Payslip | null;
}

/**
 * Wgrywa specyfikację: obrazy kompresuje do JPEG, PDF zostawia bez zmian.
 * Przy nadpisaniu usuwa stary plik i podmienia wiersz (unikat: pracownik+m-c).
 */
export async function uploadPayslip(input: UploadPayslipInput): Promise<void> {
  const isPdf = input.file.type === 'application/pdf';
  const blob = isPdf ? input.file : await compressImage(input.file, 2200, 0.85);
  const ext = isPdf ? 'pdf' : 'jpg';
  const type = isPdf ? 'application/pdf' : 'image/jpeg';
  const path = `${input.employeeId}/${input.year}-${String(input.month).padStart(2, '0')}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('payslips')
    .upload(path, blob, { contentType: type });
  if (uploadError) throw new Error('Nie udało się przesłać pliku');

  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('payslips').upsert(
    {
      employee_id: input.employeeId,
      year: input.year,
      month: input.month,
      file_path: path,
      file_type: type,
      note: input.note.trim() || null,
      created_by: userData.user?.id ?? null,
    },
    { onConflict: 'employee_id,year,month' },
  );
  if (error) {
    await supabase.storage.from('payslips').remove([path]);
    throw error;
  }

  // Usuń stary plik po udanej podmianie wiersza
  if (input.existing && input.existing.file_path !== path) {
    await supabase.storage.from('payslips').remove([input.existing.file_path]);
  }
}

export async function deletePayslip(payslip: Payslip): Promise<void> {
  await supabase.storage.from('payslips').remove([payslip.file_path]);
  const { error } = await supabase.from('payslips').delete().eq('id', payslip.id);
  if (error) throw error;
}
