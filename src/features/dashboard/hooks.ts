import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { useSession } from '@/features/auth/SessionProvider';
import { fetchKpi } from './api';

export function useDashboardKpi() {
  const { can } = useSession();
  return useQuery({
    queryKey: qk.dashboard.kpi(),
    queryFn: fetchKpi,
    enabled: can('projects_view'),
  });
}
