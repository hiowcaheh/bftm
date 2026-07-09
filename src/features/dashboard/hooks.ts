import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { useSession } from '@/features/auth/SessionProvider';
import { fetchKpi, fetchRecentEntries, fetchToday } from './api';

export function useDashboardKpi() {
  const { can } = useSession();
  const canProjects = can('projects_view');
  return useQuery({
    queryKey: qk.dashboard.kpi(),
    queryFn: () => fetchKpi(canProjects),
  });
}

export function useToday() {
  return useQuery({ queryKey: qk.dashboard.today(), queryFn: fetchToday });
}

export function useRecentEntries() {
  return useQuery({ queryKey: qk.dashboard.recent(), queryFn: fetchRecentEntries });
}
