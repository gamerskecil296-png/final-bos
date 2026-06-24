import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

const unwrap = (res) => res.data && typeof res.data === 'object' && 'data' in res.data ? res.data.data : res.data;

export const useFakultasParticipantsQuery = (params = {}) => useQuery({
  queryKey: ['kencana-fakultas', 'participants', params],
  queryFn: async () => unwrap(await api.get('/kencana-fakultas/participants', { params })),
});

export const useFakultasScoresQuery = (params = {}) => useQuery({
  queryKey: ['kencana-fakultas', 'scores', params],
  queryFn: async () => unwrap(await api.get('/kencana-fakultas/scores', { params })),
});

export const useFakultasStagesQuery = (periodId, params = {}) => useQuery({
  queryKey: ['kencana-fakultas', 'stages', periodId, params],
  queryFn: async () => unwrap(await api.get('/kencana-fakultas/stages', { params: { period_id: periodId, ...params } })),
});

export const useFakultasPhaseQuery = (periodId, params = {}) => useQuery({
  queryKey: ['kencana-fakultas', 'phase', periodId, params],
  queryFn: async () => unwrap(await api.get('/kencana-fakultas/phase', { params: { period_id: periodId, ...params } })),
});

export const useUpdateFakultasPhaseMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.put('/kencana-fakultas/phase', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kencana-fakultas'] });
      qc.invalidateQueries({ queryKey: ['kencana-admin'] });
    },
  });
};

export const useStartFakultasPhaseMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, ...params }) => unwrap(await api.post('/kencana-fakultas/phase/start', null, { params: { period_id: periodId, ...params } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kencana-fakultas'] });
      qc.invalidateQueries({ queryKey: ['kencana-admin'] });
    },
  });
};

export const useCompleteFakultasPhaseMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, ...params }) => unwrap(await api.post('/kencana-fakultas/phase/complete', null, { params: { period_id: periodId, ...params } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kencana-fakultas'] });
      qc.invalidateQueries({ queryKey: ['kencana-admin'] });
    },
  });
};

export const useUndoFakultasPhaseMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, ...params }) => unwrap(await api.post('/kencana-fakultas/phase/undo', null, { params: { period_id: periodId, ...params } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kencana-fakultas'] });
      qc.invalidateQueries({ queryKey: ['kencana-admin'] });
    },
  });
};

export const useCreateFakultasStageMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-fakultas/stages', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-fakultas', 'stages'] }),
  });
};

export const useUpdateFakultasStageMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`/kencana-fakultas/stages/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-fakultas', 'stages'] }),
  });
};

export const useCreateFakultasSessionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-fakultas/sessions', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-fakultas'] }),
  });
};

export const useUpdateFakultasSessionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`/kencana-fakultas/sessions/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-fakultas'] }),
  });
};

export const useDeleteFakultasSessionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/kencana-fakultas/sessions/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-fakultas'] }),
  });
};

export const useFakultasMentorsQuery = (params = {}) => useQuery({
  queryKey: ['kencana-fakultas', 'mentors', params],
  queryFn: async () => unwrap(await api.get('/kencana-fakultas/mentors', { params })),
});

export const useCreateFakultasMentorMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-fakultas/mentors', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-fakultas', 'mentors'] }),
  });
};
