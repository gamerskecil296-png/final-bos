import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

const unwrap = (res) => res.data && typeof res.data === 'object' && 'data' in res.data ? res.data.data : res.data;
const asArray = (value) => Array.isArray(value) ? value : [];

// ─── Mentor Dashboard ───
export const useMentorDashboardQuery = () => useQuery({
  queryKey: ['kencana-mentor', 'dashboard'],
  queryFn: async () => unwrap(await api.get('/kencana-mentor/dashboard')),
});

export const useMentorProfileQuery = (enabled = true) => useQuery({
  queryKey: ['kencana-mentor', 'profile'],
  queryFn: async () => unwrap(await api.get('/kencana-mentor/profile')),
  enabled,
});

export const useUpdateMentorProfileMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.put('/kencana-mentor/profile', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'profile'] });
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'dashboard'] });
    },
  });
};

// ─── Students ───
export const useMentorStudentsQuery = () => useQuery({
  queryKey: ['kencana-mentor', 'students'],
  queryFn: async () => asArray(unwrap(await api.get('/kencana-mentor/students'))),
});

export const useMentorAvailableStudentsQuery = (params = {}) => useQuery({
  queryKey: ['kencana-mentor', 'available-students', params],
  queryFn: async () => asArray(unwrap(await api.get('/kencana-mentor/available-students', { params }))),
});

export const useMentorInviteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/kencana-mentor/invitations', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'students'] });
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'available-students'] });
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'dashboard'] });
    },
  });
};

export const useMentorRemoveAssignmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/kencana-mentor/assignments/${id}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'students'] });
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'dashboard'] });
    },
  });
};

// ─── Student Detail ───
export const useMentorStudentProgressQuery = (studentId) => useQuery({
  queryKey: ['kencana-mentor', 'student-progress', studentId],
  queryFn: async () => unwrap(await api.get(`/kencana-mentor/students/${studentId}/progress`)),
  enabled: !!studentId,
});

export const useMentorStudentScoreQuery = (studentId) => useQuery({
  queryKey: ['kencana-mentor', 'student-score', studentId],
  queryFn: async () => unwrap(await api.get(`/kencana-mentor/students/${studentId}/score`)),
  enabled: !!studentId,
});

export const useMentorStudentAttendanceQuery = (studentId) => useQuery({
  queryKey: ['kencana-mentor', 'student-attendance', studentId],
  queryFn: async () => unwrap(await api.get(`/kencana-mentor/students/${studentId}/attendance`)),
  enabled: !!studentId,
});

export const useMentorStudentHandbookQuery = (studentId) => useQuery({
  queryKey: ['kencana-mentor', 'student-handbook', studentId],
  queryFn: async () => unwrap(await api.get(`/kencana-mentor/students/${studentId}/handbook`)),
  enabled: !!studentId,
});

export const useMentorCreateNoteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, ...payload }) => unwrap(await api.post(`/kencana-mentor/students/${studentId}/notes`, payload)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'student-progress', vars.studentId] });
    },
  });
};

export const useMentorCreateScoreItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, ...payload }) => unwrap(await api.post(`/kencana-mentor/students/${studentId}/score-items`, payload)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'student-score', vars.studentId] });
    },
  });
};

export const useMentorUpsertBulkScoreItemsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, items }) => unwrap(await api.put(`/kencana-mentor/students/${studentId}/score-items`, { items })),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'student-score', vars.studentId] });
    },
  });
};

export const useMentorReviewHandbookMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, status, feedback }) => 
      unwrap(await api.post(`/kencana-mentor/students/${studentId}/handbook/review`, { status, feedback })),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'student-handbook', vars.studentId] });
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'student-score', vars.studentId] });
    },
  });
};

// ─── Mentor Groups ───
export const useMentorGroupsQuery = (params = {}) => useQuery({
  queryKey: ['kencana-mentor', 'groups', params],
  queryFn: async () => asArray(unwrap(await api.get('/kencana-mentor/groups', { params }))),
});

export const useMentorGroupQuery = (id) => useQuery({
  queryKey: ['kencana-mentor', 'groups', id],
  queryFn: async () => unwrap(await api.get(`/kencana-mentor/groups/${id}`)),
  enabled: !!id,
});

export const useMentorAddGroupMembersMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, student_ids }) => unwrap(await api.post(`/kencana-mentor/groups/${groupId}/members`, { student_ids })),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'groups', vars.groupId] });
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'groups'] });
    },
  });
};

export const useMentorRemoveGroupMemberMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, studentId }) => unwrap(await api.delete(`/kencana-mentor/groups/${groupId}/members/${studentId}`)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'groups', vars.groupId] });
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'groups'] });
    },
  });
};

// Mentor QR Token
export const useMentorGetSessionQRQuery = (sessionId, options = {}) => useQuery({
  queryKey: ['kencana-mentor', 'sessions', sessionId, 'qr-token'],
  queryFn: async () => unwrap(await api.get(`/kencana-mentor/sessions/${sessionId}/qr-token`)),
  enabled: !!sessionId && (options.enabled !== false),
  refetchInterval: 4 * 60 * 1000, // auto-refresh before 5min expiry
});

// %% Mentor Sessions & Attendance %%%
export const useMentorSessionsQuery = () => useQuery({
  queryKey: ['kencana-mentor', 'sessions'],
  queryFn: async () => asArray(unwrap(await api.get('/kencana-mentor/sessions'))),
});

export const useMentorGetSessionAttendanceQuery = (sessionId) => useQuery({
  queryKey: ['kencana-mentor', 'sessions', sessionId, 'attendance'],
  queryFn: async () => asArray(unwrap(await api.get(`/kencana-mentor/sessions/${sessionId}/attendance`))),
  enabled: !!sessionId,
});

export const useMentorSubmitSessionAttendanceMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, attendances }) => unwrap(await api.post(`/kencana-mentor/sessions/${sessionId}/attendance`, { attendances })),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['kencana-mentor', 'sessions', vars.sessionId, 'attendance'] });
      // Invalidating the group query or specific student attendances if necessary
    },
  });
};

