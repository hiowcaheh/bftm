import { useMutation, useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import {
  createReportShare,
  fetchHoursReport,
  fetchHoursTotal,
  fetchPublicReport,
} from './api';

export function useHoursReport(from: string, to: string) {
  return useQuery({
    queryKey: qk.reports.hours(from, to),
    queryFn: () => fetchHoursReport(from, to),
    staleTime: 60_000,
  });
}

export function useHoursTotal(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: [...qk.reports.hours(from, to), 'total'],
    queryFn: () => fetchHoursTotal(from, to),
    staleTime: 60_000,
    enabled,
  });
}

export function useCreateReportShare() {
  return useMutation({
    mutationFn: ({
      from,
      to,
      title,
      includeAmounts,
    }: {
      from: string;
      to: string;
      title: string;
      includeAmounts: boolean;
    }) => createReportShare(from, to, title, includeAmounts),
  });
}

export function usePublicReport(token: string) {
  return useQuery({
    queryKey: ['publicReport', token],
    queryFn: () => fetchPublicReport(token),
    staleTime: 60_000,
    retry: 1,
  });
}
