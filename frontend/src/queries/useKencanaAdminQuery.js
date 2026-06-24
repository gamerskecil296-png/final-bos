import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

const unwrap = (res) => res.data && typeof res.data === 'object' && 'data' in res.data ? res.data.data : res.data;
const unwrapPaginated = (res) => res.data;

// ─── Periods ───
export const usePeriodsQuery = () => useQuery({
  queryKey: ['kencana-admin', 'periods'],
  queryFn: async () => unwrap(await api.get('/kencana-admin/periods')),
});

export const useCreatePeriodMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-admin/periods', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin', 'periods'] }),
  });
};

export const useSyncSevimaPeriodMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await api.post('/kencana-admin/periods/sync-sevima')),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin', 'periods'] }),
  });
};

export const useUpdatePeriodMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`/kencana-admin/periods/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin', 'periods'] }),
  });
};

export const useUploadMediaMutation = () => {
  return useMutation({
    mutationFn: async (formData) => unwrap(await api.post('/kencana-admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })),
  });
};

export const usePeriodPhasesQuery = (periodId) => useQuery({
  queryKey: ['kencana-admin', 'period-phases', periodId],
  queryFn: async () => unwrap(await api.get(`/kencana-admin/periods/${periodId}/phases`)),
  enabled: !!periodId,
});

export const useUpdateUniversityPhaseMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, action }) => unwrap(await api.post(`/kencana-admin/periods/${periodId}/university/${action}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useOpenFacultyPhasesMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodId) => unwrap(await api.post(`/kencana-admin/periods/${periodId}/faculty/open`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useUpdateTimelinePhaseMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, phaseType, ...payload }) => unwrap(await api.put(`/kencana-admin/periods/${periodId}/timeline/${phaseType}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

// ─── Stages ───
export const useStagesQuery = (periodId, params = {}) => useQuery({
  queryKey: ['kencana-admin', 'stages', periodId, params],
  queryFn: async () => unwrap(await api.get('/kencana-admin/stages', { params: { period_id: periodId, ...params } })),
  enabled: !!periodId,
});

export const useCreateStageMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-admin/stages', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin', 'stages'] }),
  });
};

export const useUpdateStageMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`/kencana-admin/stages/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin', 'stages'] }),
  });
};

// ─── Sessions ───
export const useSessionsQuery = (stageId) => useQuery({
  queryKey: ['kencana-admin', 'sessions', 'stage', stageId],
  queryFn: async () => unwrap(await api.get('/kencana-admin/sessions', stageId ? { params: { stage_id: stageId } } : {})),
});

export const useSessionsByPeriodQuery = (periodId, scopeType) => useQuery({
  queryKey: ['kencana-admin', 'sessions', 'period', periodId, scopeType],
  queryFn: async () => unwrap(await api.get('/kencana-admin/sessions', { params: { period_id: periodId, scope_type: scopeType } })),
  enabled: !!periodId,
});

export const useSessionDetailQuery = (sessionId) => useQuery({
  queryKey: ['kencana-admin', 'session', sessionId],
  queryFn: async () => unwrap(await api.get(`/kencana-admin/sessions/${sessionId}`)),
  enabled: !!sessionId,
});

export const useCreateSessionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-admin/sessions', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useUpdateSessionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`/kencana-admin/sessions/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
    onError: (err) => alert('Gagal edit sesi: ' + (err.response?.data?.message || err.message)),
  });
};

// ─── Materials, Quizzes, Questions, Assignments ───
export const useCreateMaterialMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-admin/materials', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useUploadMaterialMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => unwrap(await api.post('/kencana-admin/materials/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useUpdateMaterialMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`/kencana-admin/materials/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useDeleteMaterialMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/kencana-admin/materials/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useCreateQuizMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-admin/quizzes', payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useUpdateQuizMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`/kencana-admin/quizzes/${id}`, payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useDeleteQuizMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/kencana-admin/quizzes/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useAdminQuizQuery = (quizId) => useQuery({
  queryKey: ['kencana-admin', 'quiz', quizId],
  queryFn: async () => unwrap(await api.get(`/kencana-admin/quizzes/${quizId}`)),
  enabled: !!quizId,
});

export const useCreateQuestionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-admin/questions', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useUpdateQuestionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`/kencana-admin/questions/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useCreateAssignmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-admin/assignments', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useUpdateAssignmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`/kencana-admin/assignments/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useDeleteAssignmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/kencana-admin/assignments/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

// ─── Score Items ───
export const useAdminScoreItemsQuery = (params = {}) => useQuery({
  queryKey: ['kencana-admin', 'score-items', params],
  queryFn: async () => unwrap(await api.get('/kencana-admin/score-items', { params })),
  enabled: !!(params.student_id),
});

export const useUpsertScoreItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-admin/score-items', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin', 'score-items'] }),
  });
};

export const useUpdateCertificateSettingsMutation = (portal = 'admin') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => unwrap(await api.put('/kencana-admin/certificate-settings', data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`kencana-${portal}`, 'certificate-settings'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-settings-viewer'] });
    },
  });
};

export const useUploadCertificateLogoMutation = (portal = 'admin') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return unwrap(await api.post('/kencana-admin/certificate-settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`kencana-${portal}`, 'certificate-settings'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-settings-viewer'] });
    },
  });
};

export const useUploadCertificateLeftLogoMutation = (portal = 'admin') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return unwrap(await api.post('/kencana-admin/certificate-settings/left-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`kencana-${portal}`, 'certificate-settings'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-settings-viewer'] });
    },
  });
};

export const useUploadCertificateRightLogoMutation = (portal = 'admin') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return unwrap(await api.post('/kencana-admin/certificate-settings/right-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`kencana-${portal}`, 'certificate-settings'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-settings-viewer'] });
    },
  });
};

export const useBulkUpsertScoreItemsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-admin/score-items/bulk', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kencana-admin', 'score-items'] });
      qc.invalidateQueries({ queryKey: ['kencana-admin', 'scores'] });
    },
  });
};

export const useCalculateAllScoresMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params = {}) => unwrap(await api.post('/kencana-admin/scores/calculate', null, { params, timeout: 60000 })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin', 'scores'] }),
  });
};

// ─── Participants & Scores ───
export const useScoreSummaryQuery = (periodId, portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'scores-summary', periodId],
  queryFn: async () => unwrap(await api.get(`${kencanaBase(portal)}/scores/summary`, { params: { period_id: periodId } })),
  enabled: !!periodId,
});

export const useDashboardStatsQuery = (params = {}, portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'dashboard-stats', params],
  queryFn: async () => unwrap(await api.get(`${kencanaBase(portal)}/dashboard/stats`, { params })),
});

export const useParticipantsQuery = (params = {}, portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'participants', params],
  queryFn: async () => unwrapPaginated(await api.get(`${kencanaBase(portal)}/participants`, { params })),
});

export const useScoresQuery = (params = {}, portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'scores', params],
  queryFn: async () => unwrapPaginated(await api.get(`${kencanaBase(portal)}/scores`, { params })),
});

// ─── Remedials & Certificates ───
export const useRemedialsQuery = (params = {}, portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'remedials', params],
  queryFn: async () => unwrapPaginated(await api.get(`${kencanaBase(portal)}/remedials`, { params })),
});

export const useCertificatesQuery = (params = {}, portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'certificates', params],
  queryFn: async () => unwrapPaginated(await api.get(`${kencanaBase(portal)}/certificates`, { params })),
});

export const useFakultasListQuery = () => useQuery({
  queryKey: ['public', 'fakultas-list'],
  queryFn: async () => unwrap(await api.get('/kencana-admin/faculties')),
});

export const useProgramStudiListQuery = (fakultasId) => useQuery({
  queryKey: ['public', 'program-studi-list', fakultasId],
  queryFn: async () => {
    const params = fakultasId && fakultasId !== 'all' ? { fakultasId } : {};
    const res = await api.get('/kencana-admin/majors', { params });
    return unwrap(res) || [];
  },
});

export const useCreateRemedialMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-admin/remedials', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};

export const useGenerateCertificateMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post(`${kencanaBase(portal)}/certificates/generate`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`] }),
    onError: (err) => {
      alert('Gagal mencetak sertifikat: ' + (err.response?.data?.message || err.message));
    }
  });
};

export const useGenerateBulkCertificatesMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post(`${kencanaBase(portal)}/certificates/generate-bulk`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`] }),
    onError: (err) => {
      alert('Gagal mencetak sertifikat massal: ' + (err.response?.data?.message || err.message));
    }
  });
};

// ─── Mentors ───
const kencanaBase = (portal = 'admin') => (portal === 'fakultas' || portal === 'fakult') ? '/kencana-fakultas' : '/kencana-admin';

export const useMentorsQuery = (portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'mentors'],
  queryFn: async () => unwrap(await api.get(`${kencanaBase(portal)}/mentors`)),
});

export const useCreateMentorMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post(`${kencanaBase(portal)}/mentors`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'mentors'] }),
  });
};

export const useUpdateMentorMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`${kencanaBase(portal)}/mentors/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'mentors'] }),
  });
};

export const useDeleteMentorMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`${kencanaBase(portal)}/mentors/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'mentors'] }),
  });
};

// ─── Groups ───
export const useGroupsQuery = (params = {}, portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'groups', params],
  queryFn: async () => unwrap(await api.get(`${kencanaBase(portal)}/groups`, { params })),
});

export const useGroupQuery = (id, portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'groups', id],
  queryFn: async () => unwrap(await api.get(`${kencanaBase(portal)}/groups/${id}`)),
  enabled: !!id,
});

export const useCreateGroupMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post(`${kencanaBase(portal)}/groups`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'groups'] }),
  });
};

export const useUpdateGroupMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`${kencanaBase(portal)}/groups/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'groups'] }),
  });
};

export const useDeleteGroupMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`${kencanaBase(portal)}/groups/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'groups'] }),
  });
};

export const useAddGroupMembersMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, student_ids }) => unwrap(await api.post(`${kencanaBase(portal)}/groups/${groupId}/members`, { student_ids })),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'groups'] }),
  });
};

export const useRemoveGroupMemberMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, studentId }) => unwrap(await api.delete(`${kencanaBase(portal)}/groups/${groupId}/members/${studentId}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'groups'] }),
  });
};

export const useAutoAssignGroupsMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post(`${kencanaBase(portal)}/groups/auto-assign`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'groups'] }),
  });
};

// ─── Mentor Assignments ───
export const useMentorAssignmentsQuery = () => useQuery({
  queryKey: ['kencana-admin', 'mentor-assignments'],
  queryFn: async () => unwrap(await api.get('/kencana-admin/mentor-assignments')),
});

export const useCreateMentorAssignmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-admin/mentor-assignments', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin', 'mentor-assignments'] }),
  });
};

export const useMoveMentorAssignmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`/kencana-admin/mentor-assignments/${id}/move`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin', 'mentor-assignments'] }),
  });
};

export const useDeleteMentorAssignmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/kencana-admin/mentor-assignments/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin', 'mentor-assignments'] }),
  });
};

export const useSearchStudentsQuery = (search, portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'search-students', search],
  queryFn: async () => unwrap(await api.get(`${kencanaBase(portal)}/students`, { params: { search } })),
  enabled: search.length >= 3,
});

export const useCertificateSettingsQuery = () => useQuery({
  queryKey: ['kencana-admin', 'certificate-settings'],
  queryFn: async () => unwrap(await api.get('/kencana-admin/certificate-settings')),
});


// ─── Banding / Appeals ───
export const useAdminBandingListQuery = (params = {}, portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'banding', params],
  queryFn: async () => unwrapPaginated(await api.get(`${kencanaBase(portal)}/banding`, { params })),
});

export const useAdminRespondBandingMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`${kencanaBase(portal)}/banding/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'banding'] }),
  });
};

// ─── Announcements ───
export const useAnnouncementsQuery = (portal = 'admin') => useQuery({
  queryKey: [`kencana-${portal}`, 'announcements'],
  queryFn: async () => unwrap(await api.get(`${kencanaBase(portal)}/announcements`)),
});

export const useCreateAnnouncementMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post(`${kencanaBase(portal)}/announcements`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'announcements'] }),
  });
};

export const useDeleteAnnouncementMutation = (portal = 'admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`${kencanaBase(portal)}/announcements/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`kencana-${portal}`, 'announcements'] }),
  });
};

// ─── Dev: Reset All Kencana Data ───
export const useResetKencanaMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await api.post('/kencana-admin/reset-data')),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kencana-admin'] }),
  });
};
