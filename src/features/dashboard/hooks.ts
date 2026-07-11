import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { useSession } from '@/features/auth/SessionProvider';
import {
  fetchKpi,
  fetchMyWeek,
  fetchPayslipReminder,
  fetchPendingApprovals,
  fetchRecentEntries,
  fetchThisWeek,
  fetchToday,
} from './api';

export function useDashboardKpi() {
  const { can } = useSession();
  const canProjects = can('projects_view');
  const canFinance = can('finance_view');
  return useQuery({
    queryKey: [...qk.dashboard.kpi(), canFinance],
    queryFn: () => fetchKpi(canProjects, canFinance),
  });
}

export function useToday() {
  return useQuery({ queryKey: qk.dashboard.today(), queryFn: fetchToday });
}

export function useRecentEntries(enabled: boolean) {
  return useQuery({
    queryKey: qk.dashboard.recent(),
    queryFn: fetchRecentEntries,
    enabled,
  });
}

export function usePendingApprovals() {
  const { can } = useSession();
  return useQuery({
    queryKey: [...qk.dashboard.all, 'pending'],
    queryFn: fetchPendingApprovals,
    enabled: can('hours_approve'),
  });
}

export function useMyWeek(enabled: boolean) {
  return useQuery({
    queryKey: [...qk.dashboard.all, 'myWeek'],
    queryFn: fetchMyWeek,
    enabled,
  });
}

export function useThisWeek(enabled: boolean) {
  return useQuery({
    queryKey: [...qk.dashboard.all, 'thisWeek'],
    queryFn: fetchThisWeek,
    enabled,
  });
}

export function usePayslipReminder(enabled: boolean) {
  return useQuery({
    queryKey: [...qk.dashboard.all, 'payslipReminder'],
    queryFn: fetchPayslipReminder,
    enabled,
  });
}
