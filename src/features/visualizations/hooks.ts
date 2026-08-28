import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { translate } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import {
  createPoint,
  createVisualization,
  deletePoint,
  fetchCreators,
  deleteVisualization,
  fetchPublicVisualization,
  fetchVisualization,
  fetchVisualizations,
  publishVisualization,
  sendVisualizationEmail,
  updatePoint,
  updateVisualization,
  type SendVizEmailInput,
} from './api';
import type { Visualization, VisualizationPoint } from './types';

export function useVisualizations() {
  const { can } = useSession();
  return useQuery({
    queryKey: qk.visualizations.list(),
    queryFn: fetchVisualizations,
    enabled: can('visualizations_manage') || can('visualizations_work'),
    // licznik wyświetleń zmienia się serwerowo — świeże dane przy każdym wejściu
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useVisualization(id: string | null) {
  return useQuery({
    queryKey: qk.visualizations.detail(id ?? 'new'),
    queryFn: () => fetchVisualization(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** Imiona twórców punktów (audyt „kto dodał"). */
export function usePointCreators(ids: string[]) {
  const key = [...new Set(ids.filter(Boolean))].sort().join(',');
  return useQuery({
    queryKey: ['visualizations', 'creators', key],
    queryFn: () => fetchCreators(ids),
    enabled: ids.length > 0,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.visualizations.all });
  };
}

export function useCreateVisualization() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: Partial<Visualization>) => createVisualization(payload),
    onSuccess: invalidate,
    onError: () => toast.error(translate('viz.errSave')),
  });
}

export function useUpdateVisualization() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Visualization> }) =>
      updateVisualization(id, patch),
    onSuccess: invalidate,
    onError: () => toast.error(translate('viz.errSave')),
  });
}

export function useDeleteVisualization() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => deleteVisualization(id),
    onSuccess: () => {
      invalidate();
      toast.success(translate('viz.deleted'));
    },
    onError: () => toast.error(translate('viz.errDelete')),
  });
}

export function usePublishVisualization() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => publishVisualization(id),
    onSuccess: invalidate,
    onError: () => toast.error(translate('viz.errSend')),
  });
}

export function useSendVisualizationEmail() {
  return useMutation({
    mutationFn: (input: SendVizEmailInput) => sendVisualizationEmail(input),
    onSuccess: () => toast.success(translate('viz.sent')),
    onError: (e) => toast.error((e as Error).message || translate('viz.errSend')),
  });
}

// ── Punkty ───────────────────────────────────────────────────────────────────

export function useCreatePoint(vizId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPoint,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.visualizations.detail(vizId) });
    },
    onError: () => toast.error(translate('viz.errSave')),
  });
}

export function useUpdatePoint(vizId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<VisualizationPoint> }) =>
      updatePoint(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.visualizations.detail(vizId) });
    },
    onError: () => toast.error(translate('viz.errSave')),
  });
}

export function useDeletePoint(vizId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (point: VisualizationPoint) => deletePoint(point),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.visualizations.detail(vizId) });
      toast.success(translate('viz.pointDeleted'));
    },
    onError: () => toast.error(translate('viz.errDelete')),
  });
}

// ── Strona publiczna ─────────────────────────────────────────────────────────

export function usePublicVisualization(
  token: string,
  track: boolean,
  session: string | null,
) {
  return useQuery({
    queryKey: ['publicVisualization', token],
    queryFn: () => fetchPublicVisualization(token, track, session),
    staleTime: 60_000,
    retry: 1,
  });
}
