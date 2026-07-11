import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { fetchHoursReport } from './api';

export function useHoursReport(from: string, to: string) {
  return useQuery({
    queryKey: qk.reports.hours(from, to),
    queryFn: () => fetchHoursReport(from, to),
    staleTime: 60_000,
  });
}
