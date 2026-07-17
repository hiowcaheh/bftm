import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { fetchCompanyDetails, fetchFinanceSettings, saveCompany, saveFinanceSettings, uploadLogo } from './api';
import type { CompanyDetails, FinanceSettings } from './types';
import { translate } from '@/lib/i18n/context';

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
    mutationFn: ({ details, slogan }: { details: CompanyDetails; slogan: string }) =>
      saveCompany(details, slogan),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.settings.all });
      toast.success(translate('setc.companySaved'));
    },
    onError: () => toast.error(translate('setc.errCompany')),
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.settings.all });
      toast.success(translate('setc.logoSaved'));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useFinanceSettings(enabled: boolean) {
  return useQuery({
    queryKey: qk.settings.byKey('finance'),
    queryFn: fetchFinanceSettings,
    enabled,
  });
}

export function useSaveFinanceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<FinanceSettings>) => saveFinanceSettings(patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.settings.all });
      // raport Finanse liczy koszty tymi narzutami — przelicz od razu
      void queryClient.invalidateQueries({ queryKey: qk.finance.all });
      toast.success(translate('setc.paramsSaved'));
    },
    onError: () => toast.error(translate('setc.errParams')),
  });
}
