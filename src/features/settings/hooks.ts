import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { fetchCompanyDetails, saveCompany, uploadLogo } from './api';
import type { CompanyDetails } from './types';

export function useCompanyDetails(enabled: boolean) {
  return useQuery({
    queryKey: qk.settings.byKey('company_details'),
    queryFn: fetchCompanyDetails,
    enabled,
  });
}

export function useSaveCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (details: CompanyDetails) => saveCompany(details),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.settings.all });
      toast.success('Dane firmy zapisane');
    },
    onError: () => toast.error('Nie udało się zapisać danych firmy'),
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.settings.all });
      toast.success('Logo zapisane');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
