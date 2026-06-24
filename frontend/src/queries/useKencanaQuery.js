import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import api from '../lib/axios';

const unwrap = (res) => res.data && typeof res.data === 'object' && 'data' in res.data ? res.data.data : res.data;
const isKencanaPath = (pathname) => pathname.startsWith('/student/kencana');

export const useKencanaDashboardQuery = (options = {}) => {
  const { pathname } = useLocation();
  return useQuery({
    queryKey: ['kencana', 'dashboard'],
    queryFn: async () => unwrap(await api.get('/kencana-student/dashboard')),
    retry: false,
    enabled: isKencanaPath(pathname) && (options.enabled ?? true),
  });
};

export const useKencanaTimelineQuery = (options = {}) => {
  const { pathname } = useLocation();
  return useQuery({
    queryKey: ['kencana', 'timeline'],
    queryFn: async () => unwrap(await api.get('/kencana-student/timeline')),
    staleTime: 60 * 1000,
    retry: false,
    enabled: isKencanaPath(pathname) && (options.enabled ?? true),
  });
};

export const useKencanaStageQuery = (stageId) => useQuery({
  queryKey: ['kencana', 'stage', stageId],
  queryFn: async () => unwrap(await api.get(`/kencana-student/stages/${stageId}`)),
  enabled: !!stageId,
});

export const useKencanaSessionQuery = (sessionId) => useQuery({
  queryKey: ['kencana', 'session', sessionId],
  queryFn: async () => unwrap(await api.get(`/kencana-student/sessions/${sessionId}`)),
  enabled: !!sessionId,
});

export const useCompleteMaterialMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (materialId) => unwrap(await api.post(`/kencana-student/materials/${materialId}/complete`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kencana'] }),
  });
};

export const useKencanaQuizQuery = (quizId) => useQuery({
  queryKey: ['kencana', 'quiz', quizId],
  queryFn: async () => unwrap(await api.get(`/kencana-student/quizzes/${quizId}`)),
  enabled: !!quizId,
});

export const useStartQuizMutation = () => useMutation({
  mutationFn: async (quizId) => unwrap(await api.post(`/kencana-student/quizzes/${quizId}/start`)),
});

export const useSaveQuizAnswerMutation = () => useMutation({
  mutationFn: async ({ attemptId, ...payload }) => unwrap(await api.post(`/kencana-student/quiz-attempts/${attemptId}/answers`, payload)),
});

export const useSubmitQuizMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ attemptId, answers }) => unwrap(await api.post(`/kencana-student/quiz-attempts/${attemptId}/submit`, { answers })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kencana'] }),
  });
};

export const useKencanaAssignmentQuery = (assignmentId) => useQuery({
  queryKey: ['kencana', 'assignment', assignmentId],
  queryFn: async () => unwrap(await api.get(`/kencana-student/assignments/${assignmentId}`)),
  enabled: !!assignmentId,
});

export const useSubmitAssignmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, payload }) => unwrap(await api.post(`/kencana-student/assignments/${assignmentId}/submit`, payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kencana'] }),
  });
};

export const useKencanaHandbookQuery = (options = {}) => {
  const { pathname } = useLocation();
  return useQuery({
    queryKey: ['kencana', 'handbook'],
    queryFn: async () => unwrap(await api.get('/kencana-student/handbook')),
    retry: false,
    enabled: isKencanaPath(pathname) && (options.enabled ?? true),
  });
};

export const useSaveHandbookDraftMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-student/handbook/draft', payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kencana', 'handbook'] }),
  });
};

export const useSubmitHandbookMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-student/handbook/submit', payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kencana'] }),
  });
};

export const useKencanaAttendanceQuery = (options = {}) => {
  const { pathname } = useLocation();
  return useQuery({
    queryKey: ['kencana', 'attendance'],
    queryFn: async () => unwrap(await api.get('/kencana-student/attendance')),
    retry: false,
    enabled: isKencanaPath(pathname) && (options.enabled ?? true),
  });
};

export const useKencanaScoreQuery = (options = {}) => {
  const { pathname } = useLocation();
  return useQuery({
    queryKey: ['kencana', 'score'],
    queryFn: async () => unwrap(await api.get('/kencana-student/score')),
    retry: false,
    enabled: isKencanaPath(pathname) && (options.enabled ?? true),
  });
};

export const useKencanaRemedialQuery = (options = {}) => {
  const { pathname } = useLocation();
  return useQuery({
    queryKey: ['kencana', 'remedial'],
    queryFn: async () => unwrap(await api.get('/kencana-student/remedial')),
    retry: false,
    enabled: isKencanaPath(pathname) && (options.enabled ?? true),
  });
};

export const useKencanaCertificateQuery = (options = {}) => {
  const { pathname } = useLocation();
  return useQuery({
    queryKey: ['kencana', 'certificate'],
    queryFn: async () => unwrap(await api.get('/kencana-student/certificate')),
    retry: false,
    enabled: isKencanaPath(pathname) && (options.enabled ?? true),
  });
};

export const useKencanaMentorInvitationsQuery = (options = {}) => {
  const { pathname } = useLocation();
  return useQuery({
    queryKey: ['kencana', 'mentor-invitations'],
    queryFn: async () => unwrap(await api.get('/kencana-student/mentor-invitations')),
    retry: false,
    enabled: isKencanaPath(pathname) && (options.enabled ?? true),
  });
};

export const useRespondMentorInvitationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => unwrap(await api.post(`/kencana-student/mentor-invitations/${id}/respond`, { action })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kencana'] }),
  });
};

export const useRespondGroupInvitationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => unwrap(await api.post(`/kencana-student/group-invitations/${id}/respond`, { action })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kencana'] }),
  });
};

// Backward-compatible aliases for older pages.
export const useKencanaProgressQuery = useKencanaDashboardQuery;
export const useSoalKuisQuery = useKencanaQuizQuery;
export const useSertifikatQuery = useKencanaCertificateQuery;
export const useBandingQuery = () => useQuery({ 
  queryKey: ['kencana', 'banding'], 
  queryFn: async () => unwrap(await api.get('/kencana-student/banding')) 
});

export const useGenerateSertifikatMutation = () => useMutation({ mutationFn: async () => ({}) });

export const useStudentSubmitAttendanceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (qrCode) => unwrap(await api.post('/kencana-student/attendance', { qr_code: qrCode })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kencana', 'attendance'] }),
  });
};

export const useAjukanBandingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({ 
    mutationFn: async (payload) => unwrap(await api.post('/kencana-student/banding', payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kencana', 'banding'] }),
  });
};
