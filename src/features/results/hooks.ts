import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { useSession } from '@/features/auth/SessionProvider';
import { fetchResultsYear } from './api';

export function useResultsYear(year: number) {
  const { can } = useSession();
  return useQuery({
    queryKey: qk.results.year(year),
    queryFn: () => fetchResultsYear(year),
    enabled: can('results_view'),
    staleTime: 60_000,
  });
}
