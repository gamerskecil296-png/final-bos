export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const ASSET_URL = API_BASE_URL.replace(/\/api$/, '');
import useAuthStore from '../store/useAuthStore';

export const handleResponse = async (res) => {
  let data;
  try {
    data = await res.json();
  } catch {
    data = { message: `Gagal memproses respon server (${res.status}). Pastikan backend berjalan.` };
  }

  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
};

export const getPublicLandingSettings = () => fetch(`${API_BASE_URL}/public/landing-settings`).then(handleResponse);
export const getPublicNews = (limit = 3) => fetch(`${API_BASE_URL}/public/news?limit=${limit}`).then(handleResponse);
export const getPublicNewsDetail = (idOrSlug) => fetch(`${API_BASE_URL}/public/news/${idOrSlug}`).then(handleResponse);


export const getAuthToken = () => {
  // 1. Try Zustand store state (memory)
  let token = useAuthStore.getState().accessToken;
  if (token) return token;

  // 2. Try Zustand persisted state (localStorage)
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      token = parsed?.state?.accessToken;
      if (token) return token;
    }
  } catch (e) {
    console.warn("Failed to parse auth-storage:", e);
  }

  // 3. Last resort fallbacks
  return localStorage.getItem('token') || localStorage.getItem('access_token') || null;
};

export const fetchWithAuth = (url, options = {}) => {
  const token = getAuthToken();

  if (!token) {
    console.error(`Attempted fetchWithAuth to ${url} but NO TOKEN was found. This will likely result in a 401.`);
  }

  const selectedFacultyId = localStorage.getItem('superadmin_fakultas_id');
  const selectedProdiId = localStorage.getItem('superadmin_prodi_id');
  const selectedPeriodId = localStorage.getItem('superadmin_period_id');
  const impersonatedStudentId = localStorage.getItem('superadmin_impersonate_student_id');
  const selectedOrmawaId = localStorage.getItem('superadmin_ormawa_id');
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(selectedFacultyId && selectedFacultyId !== 'all' ? { 'X-Faculty-ID': selectedFacultyId } : {}),
    ...(selectedProdiId && selectedProdiId !== 'all' ? { 'X-Prodi-ID': selectedProdiId } : {}),
    ...(selectedPeriodId && selectedPeriodId !== 'all' ? { 'X-Academic-Period-ID': selectedPeriodId } : {}),
    ...(selectedOrmawaId ? { 'X-Ormawa-ID': selectedOrmawaId } : {})
  };

  if (impersonatedStudentId && impersonatedStudentId !== 'undefined' && impersonatedStudentId !== 'null') {
    if (!headers['X-Student-ID'] && (!options.headers || !options.headers['X-Student-ID'])) {
      headers['X-Student-ID'] = impersonatedStudentId;
    }
  }

  return fetch(url, { ...options, headers }).then(handleResponse);
};

export const fetchBlobWithAuth = async (url, options = {}) => {
  const token = getAuthToken();

  const selectedFacultyId = localStorage.getItem('superadmin_fakultas_id');
  const selectedProdiId = localStorage.getItem('superadmin_prodi_id');
  const selectedPeriodId = localStorage.getItem('superadmin_period_id');
  const impersonatedStudentId = localStorage.getItem('superadmin_impersonate_student_id');
  const selectedOrmawaId = localStorage.getItem('superadmin_ormawa_id');

  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(selectedFacultyId && selectedFacultyId !== 'all' ? { 'X-Faculty-ID': selectedFacultyId } : {}),
    ...(selectedProdiId && selectedProdiId !== 'all' ? { 'X-Prodi-ID': selectedProdiId } : {}),
    ...(selectedPeriodId && selectedPeriodId !== 'all' ? { 'X-Academic-Period-ID': selectedPeriodId } : {}),
    ...(selectedOrmawaId ? { 'X-Ormawa-ID': selectedOrmawaId } : {})
  };

  if (impersonatedStudentId && impersonatedStudentId !== 'undefined' && impersonatedStudentId !== 'null') {
    if (!headers['X-Student-ID']) {
      headers['X-Student-ID'] = impersonatedStudentId;
    }
  }

  const impersonateRole = localStorage.getItem('impersonate_role');
  const impersonateEntity = localStorage.getItem('impersonate_entity');

  if (impersonateRole && impersonateEntity) {
    headers['X-Impersonate-Role'] = impersonateRole;
    headers['X-Impersonate-Entity-Id'] = impersonateEntity;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.blob();
};

export const psychologistService = {
  getMe: () => fetchWithAuth(`${API_BASE_URL}/psychologist/me`),
  updateProfile: (data) => fetchWithAuth(`${API_BASE_URL}/psychologist/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  changePassword: (data) => fetchWithAuth(`${API_BASE_URL}/psychologist/change-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getDashboard: () => fetchWithAuth(`${API_BASE_URL}/psychologist/dashboard`),
  getBookings: () => fetchWithAuth(`${API_BASE_URL}/psychologist/bookings`),
  getBookingDetail: (id) => fetchWithAuth(`${API_BASE_URL}/psychologist/bookings/${id}`),
  updateBookingStatus: (id, status, note = '', link_meeting = '') => fetchWithAuth(`${API_BASE_URL}/psychologist/bookings/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note, link_meeting })
  }),
  getSchedules: () => fetchWithAuth(`${API_BASE_URL}/psychologist/schedules`),
  saveSchedules: (data) => fetchWithAuth(`${API_BASE_URL}/psychologist/schedules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getPatients: () => fetchWithAuth(`${API_BASE_URL}/psychologist/patients`),
  getMedicalRecord: (id) => fetchWithAuth(`${API_BASE_URL}/psychologist/patients/${id}/medical-record`),
  getMedicalRecords: () => fetchWithAuth(`${API_BASE_URL}/psychologist/medical-records`),
  createSessionNote: (id, data) => fetchWithAuth(`${API_BASE_URL}/psychologist/patients/${id}/session-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateSessionNote: (id, data) => fetchWithAuth(`${API_BASE_URL}/psychologist/session-notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getAssessments: () => fetchWithAuth(`${API_BASE_URL}/psychologist/assessments`),
  createAssessment: (data) => fetchWithAuth(`${API_BASE_URL}/psychologist/assessments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`${API_BASE_URL}/psychologist/analytics${query ? `?${query}` : ''}`);
  },
  getProdiList: () => fetchWithAuth(`${API_BASE_URL}/psychologist/prodi`),
  getFakultasList: () => fetchWithAuth(`${API_BASE_URL}/psychologist/fakultas`),
  getNotifications: () => fetchWithAuth(`${API_BASE_URL}/psychologist/notifications`),
  markNotificationRead: (id) => fetchWithAuth(`${API_BASE_URL}/psychologist/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => fetchWithAuth(`${API_BASE_URL}/psychologist/notifications/read-all`, { method: 'PUT' }),
  deleteNotification: (id) => fetchWithAuth(`${API_BASE_URL}/psychologist/notifications/${id}`, { method: 'DELETE' }),

  getDocumentSettings: () => fetchWithAuth(`${API_BASE_URL}/psychologist/document-settings?modul=Psikolog`),
  updateDocumentSetting: (id, data) => fetchWithAuth(`${API_BASE_URL}/psychologist/document-settings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // Tindak Lanjut (Referral)
  getReferrals: () => fetchWithAuth(`${API_BASE_URL}/psychologist/referrals`),
  createReferral: (data) => fetchWithAuth(`${API_BASE_URL}/psychologist/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  sendReferral: (id) => fetchWithAuth(`${API_BASE_URL}/psychologist/referrals/${id}/send`, {
    method: 'POST'
  }),
  confirmReferralReceived: (id) => fetchWithAuth(`${API_BASE_URL}/psychologist/referrals/${id}/confirm-received`, {
    method: 'POST'
  }),
  downloadReferralPDF: async (id) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/psychologist/referrals/${id}/download`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: 'Gagal download PDF' }));
      throw new Error(errData.message || `Error ${res.status}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surat_rujukan_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadSessionNotePDF: async (id, studentName) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/psychologist/session-notes/${id}/export-pdf`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: 'Gagal download PDF Sesi' }));
      throw new Error(errData.message || `Error ${res.status}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sesi_${id}_rekam_medis_${studentName.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadRecapMedicalRecordPDF: async (filters = {}) => {
    const token = getAuthToken();
    const cleanFilters = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined && v !== 'Semua Fakultas' && v !== 'Semua Prodi' && v !== 'Semua Status') {
        cleanFilters[k] = v;
      }
    });
    const query = new URLSearchParams(cleanFilters).toString();
    const res = await fetch(`${API_BASE_URL}/psychologist/patients/export-pdf${query ? `?${query}` : ''}`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: 'Gagal download PDF Rekap' }));
      throw new Error(errData.message || `Error ${res.status}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap_rekam_medis_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};

export const tenagaKesehatanService = {
  getMe: () => fetchWithAuth(`${API_BASE_URL}/tenagakes/me`),
  updateProfile: (data) => fetchWithAuth(`${API_BASE_URL}/tenagakes/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  changePassword: (data) => fetchWithAuth(`${API_BASE_URL}/tenagakes/change-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getDashboard: () => fetchWithAuth(`${API_BASE_URL}/tenagakes/dashboard`),
  getSchedules: () => fetchWithAuth(`${API_BASE_URL}/tenagakes/schedules`),
  createSchedule: (data) => fetchWithAuth(`${API_BASE_URL}/tenagakes/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateSchedule: (id, data) => fetchWithAuth(`${API_BASE_URL}/tenagakes/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteSchedule: (id) => fetchWithAuth(`${API_BASE_URL}/tenagakes/schedules/${id}`, {
    method: 'DELETE'
  }),
  getBookings: () => fetchWithAuth(`${API_BASE_URL}/tenagakes/bookings`),
  getBookingDetail: (id) => fetchWithAuth(`${API_BASE_URL}/tenagakes/bookings/${id}`),
  updateBookingStatus: (id, status, alasanPenolakan = '') => fetchWithAuth(`${API_BASE_URL}/tenagakes/bookings/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, alasan_penolakan: alasanPenolakan })
  }),
  getPatients: () => fetchWithAuth(`${API_BASE_URL}/tenagakes/patients`),
  getMedicalRecord: (id) => fetchWithAuth(`${API_BASE_URL}/tenagakes/patients/${id}/medical-record`),
  updateMedicalRecord: (id, data) => fetchWithAuth(`${API_BASE_URL}/tenagakes/medical-records/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  createScreening: (id, data) => fetchWithAuth(`${API_BASE_URL}/tenagakes/patients/${id}/screening`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // Psikolog Escalation
  getPsychologists: () => fetchWithAuth(`${API_BASE_URL}/tenagakes/psychologists`),
  getPsychologistSchedules: (id) => fetchWithAuth(`${API_BASE_URL}/tenagakes/psychologists/${id}/schedules`),

  lookupStudent: (query) => fetchWithAuth(`${API_BASE_URL}/tenagakes/students/lookup?query=${encodeURIComponent(query)}`),
  exportExcel: async () => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/tenagakes/reports/export-excel`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error('Gagal mendownload Excel rekap.');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap_kesehatan_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  exportPDF: async () => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/tenagakes/reports/export-pdf`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error('Gagal mendownload PDF rekap.');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap_kesehatan_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  getDocumentSettings: () => fetchWithAuth(`${API_BASE_URL}/tenagakes/document-settings?modul=Medis`),
  updateDocumentSetting: (id, data) => fetchWithAuth(`${API_BASE_URL}/tenagakes/document-settings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
};

export const ormawaService = {
  // Stats & Dashboard
  getStats: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/stats?ormawaId=${id}`),
  getEvents: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/events?ormawaId=${id}`),
  createEvent: (data) => fetchWithAuth(`${API_BASE_URL}/ormawa/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateEvent: (id, data) => fetchWithAuth(`${API_BASE_URL}/ormawa/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteEvent: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/events/${id}`, {
    method: 'DELETE'
  }),

  // Membership & Staff
  getMembers: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/members?ormawaId=${id}`),
  updateMember: (id, data) => fetchWithAuth(`${API_BASE_URL}/ormawa/members/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteMember: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/members/${id}`, {
    method: 'DELETE'
  }),
  addMember: (data) => fetchWithAuth(`${API_BASE_URL}/ormawa/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // Supporting Data
  getDivisions: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/divisions?ormawaId=${id}`),
  getAllStudents: () => fetchWithAuth(`${API_BASE_URL}/ormawa/students`),

  // Proposals
  getProposals: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/proposals?ormawaId=${id}`),
  getProposalHistory: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/proposals/${id}/history`),
  createProposal: (data) => fetchWithAuth(`${API_BASE_URL}/ormawa/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateProposal: (id, data) => fetchWithAuth(`${API_BASE_URL}/ormawa/proposals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteProposal: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/proposals/${id}`, {
    method: 'DELETE'
  }),

  // Finance
  getFinancials: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/kas?ormawaId=${id}`),
  addTransaction: (data) => fetchWithAuth(`${API_BASE_URL}/ormawa/kas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // LPJ
  getLpjs: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/lpjs?ormawaId=${id}`),
  createLpj: (data) => fetchWithAuth(`${API_BASE_URL}/ormawa/lpjs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateLpj: (id, data) => fetchWithAuth(`${API_BASE_URL}/ormawa/lpjs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  uploadLpjDocument: (lpjId, formData) => fetchWithAuth(`${API_BASE_URL}/ormawa/lpjs/${lpjId}/documents`, {
    method: 'POST',
    body: formData
  }),
  deleteLpjDocument: (docId) => fetchWithAuth(`${API_BASE_URL}/ormawa/lpjs/documents/${docId}`, {
    method: 'DELETE'
  }),

  // Attendance
  getAttendance: (eventId) => fetchWithAuth(`${API_BASE_URL}/ormawa/attendance/${eventId}`),
  recordAttendance: (data) => fetchWithAuth(`${API_BASE_URL}/ormawa/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // Aspirations
  getAspirations: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/aspirations?ormawaId=${id}`),
  createAspiration: (data) => fetchWithAuth(`${API_BASE_URL}/ormawa/aspirations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateAspiration: (id, data) => fetchWithAuth(`${API_BASE_URL}/ormawa/aspirations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // Announcements & Notifications
  getAnnouncements: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/announcements?ormawaId=${id}`),
  createAnnouncement: (data) => fetchWithAuth(`${API_BASE_URL}/ormawa/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateAnnouncement: (id, data) => fetchWithAuth(`${API_BASE_URL}/ormawa/announcements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteAnnouncement: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/announcements/${id}`, {
    method: 'DELETE'
  }),
  getNotifications: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/notifications?ormawaId=${id}`),
  markAllNotifsRead: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/notifications/read-all?ormawaId=${id}`, {
    method: 'PUT'
  }),
  markNotifRead: (notifId) => fetchWithAuth(`${API_BASE_URL}/ormawa/notifications/${notifId}/read`, {
    method: 'PUT'
  }),
  deleteNotif: (notifId) => fetchWithAuth(`${API_BASE_URL}/ormawa/notifications/${notifId}`, {
    method: 'DELETE'
  }),

  // Roles & Permissions
  getRoles: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/roles?ormawaId=${id}`),
  createRole: (data) => fetchWithAuth(`${API_BASE_URL}/ormawa/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateRole: (id, data) => fetchWithAuth(`${API_BASE_URL}/ormawa/roles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteRole: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/roles/${id}`, {
    method: 'DELETE'
  }),

  // Settings
  getSettings: (id) => fetchWithAuth(`${API_BASE_URL}/ormawa/settings/${id}`),
  updateSettings: (id, data) => fetchWithAuth(`${API_BASE_URL}/ormawa/settings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // File Upload
  uploadFile: (formData) => fetchWithAuth(`${API_BASE_URL}/ormawa/upload`, {
    method: 'POST',
    body: formData
  }),

  // Gamifikasi
  getGamifikasiSummary: () => fetchWithAuth(`${API_BASE_URL}/ormawa/gamifikasi`),
};

export const fakultasService = {
  getAll: () => fetchWithAuth(`${API_BASE_URL}/admin/fakultas`),
  create: (data) => fetchWithAuth(`${API_BASE_URL}/admin/fakultas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  update: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/fakultas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  delete: (id) => fetchWithAuth(`${API_BASE_URL}/admin/fakultas/${id}`, {
    method: 'DELETE'
  }),
};

export const adminService = {
  resetFakultas: () => fetchWithAuth(`${API_BASE_URL}/admin/fakultas/reset`, { method: 'DELETE' }),
  getStats: (params = {}) => {
    const q = new URLSearchParams()
    if (params.period_id) q.append('period_id', params.period_id)
    if (params.start_date) q.append('start_date', params.start_date)
    if (params.end_date) q.append('end_date', params.end_date)
    if (params.tahun_masuk) q.append('tahun_masuk', params.tahun_masuk)
    if (params.fakultas_id) q.append('fakultas_id', params.fakultas_id)
    if (params.program_studi_id) q.append('program_studi_id', params.program_studi_id)
    return fetchWithAuth(`${API_BASE_URL}/admin/stats?${q.toString()}`)
  },
  getSystemHealth: () => fetchWithAuth(`${API_BASE_URL}/admin/system-health`),
  getDashboardAnalytics: (params = {}) => {
    const q = new URLSearchParams()
    if (params.tahun_masuk) q.append('tahun_masuk', params.tahun_masuk)
    return fetchWithAuth(`${API_BASE_URL}/admin/dashboard-analytics?${q.toString()}`)
  },

  getSmtpSettings: () => fetchWithAuth(`${API_BASE_URL}/admin/smtp-settings`),
  updateSmtpSettings: (data) => fetchWithAuth(`${API_BASE_URL}/admin/smtp-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  testSmtpConnection: (data) => fetchWithAuth(`${API_BASE_URL}/admin/smtp-settings/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  resetDatabase: (data) => fetchWithAuth(`${API_BASE_URL}/admin/reset-database`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateMaintenance: (data) => fetchWithAuth(`${API_BASE_URL}/admin/maintenance`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  // Trigger PDDikti sync for the whole university (Super Admin only, no faculty filter)
  syncPddikti: (keyword = 'Universitas Bhakti Kencana', type = 'all') =>
    fetchWithAuth(`${API_BASE_URL}/pddikti/proxy?keyword=${encodeURIComponent(keyword)}&type=${type}&sync=true`),
  syncSevima: () => fetchWithAuth(`${API_BASE_URL}/admin/sync-sevima`, { method: 'POST' }),
  getSyncProgress: () => fetchWithAuth(`${API_BASE_URL}/admin/sync-sevima/progress?t=${new Date().getTime()}`),
  cancelSyncSevima: () => fetchWithAuth(`${API_BASE_URL}/admin/sync-sevima/cancel`, { method: 'POST' }),
  resetStudents: () => fetchWithAuth(`${API_BASE_URL}/admin/students/reset`, { method: 'DELETE' }),
  resetPMB: () => fetchWithAuth(`${API_BASE_URL}/admin/integrasi/reset-pmb`, { method: 'DELETE' }),
  resetLecturer: () => fetchWithAuth(`${API_BASE_URL}/admin/lecturers/reset`, { method: 'DELETE' }),
  syncSevimaFakultas: () => fetchWithAuth(`${API_BASE_URL}/admin/sync-sevima-fakultas`, { method: 'POST' }),
  resetFakultas: () => fetchWithAuth(`${API_BASE_URL}/admin/fakultas/reset`, { method: 'DELETE' }),
  syncSevimaProgramStudi: () => fetchWithAuth(`${API_BASE_URL}/admin/sync-sevima-prodi`, { method: 'POST' }),
  resetProdi: () => fetchWithAuth(`${API_BASE_URL}/admin/prodi/reset`, { method: 'DELETE' }),
  syncSevimaLecturer: () => fetchWithAuth(`${API_BASE_URL}/admin/sync-sevima-dosen`, { method: 'POST' }),
  getAuditLogs: () => fetchWithAuth(`${API_BASE_URL}/admin/audit-logs`),
  exportAuditLogsCSV: async () => {
    const blob = await fetchBlobWithAuth(`${API_BASE_URL}/admin/audit-logs/export`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_forensik_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  getAllFaculties: () => fetchWithAuth(`${API_BASE_URL}/admin/fakultas`),
  getAllAcademicPeriods: () => fetchWithAuth(`${API_BASE_URL}/admin/academic-periods`),
  getAllStudents: (page = 1, limit = 10, search = '', filters = {}) => {
    const params = new URLSearchParams()
    params.append('page', page)
    params.append('limit', limit)
    if (search) params.append('search', search)
    if (filters.FakultasID && filters.FakultasID !== 'all') params.append('fakultasId', filters.FakultasID)
    if (filters.ProgramStudiID && filters.ProgramStudiID !== 'all') params.append('prodiId', filters.ProgramStudiID)
    if (filters.StatusAkun && filters.StatusAkun !== 'all') params.append('statusAkun', filters.StatusAkun)
    return fetchWithAuth(`${API_BASE_URL}/admin/students?${params.toString()}`)
  },
  getStudentStats: (params = {}) => {
    const q = new URLSearchParams()
    if (params.angkatan) q.append('angkatan', params.angkatan)
    if (params.statusAkun) q.append('statusAkun', params.statusAkun)
    return fetchWithAuth(`${API_BASE_URL}/admin/students/stats?${q.toString()}`)
  },
  downloadExecutiveReport: async (params = {}) => {
    const token = getAuthToken();
    const q = new URLSearchParams()
    if (params.angkatan) q.append('angkatan', params.angkatan)
    if (params.statusAkun) q.append('statusAkun', params.statusAkun)
    const res = await fetch(`${API_BASE_URL}/admin/students/report/executive?${q.toString()}`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: 'Gagal download Report' }));
      throw new Error(errData.message || `Error ${res.status}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Executive_Report_${Date.now()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  },
  createStudent: (data) => fetchWithAuth(`${API_BASE_URL}/admin/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateStudent: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/students/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteStudent: (id) => fetchWithAuth(`${API_BASE_URL}/admin/students/${id}`, {
    method: 'DELETE',
  }),
  resetStudents: () => fetchWithAuth(`${API_BASE_URL}/admin/students/reset/all`, {
    method: 'DELETE',
  }),
  // PMB
  getAllPMB: (params = {}) => {
    const q = new URLSearchParams()
    if (params.search) q.append('search', params.search)
    if (params.jalur) q.append('jalur', params.jalur)
    if (params.periode) q.append('periode', params.periode)
    const qs = q.toString()
    return fetchWithAuth(`${API_BASE_URL}/admin/pmb${qs ? '?' + qs : ''}`)
  },
  getPMBStats: () => fetchWithAuth(`${API_BASE_URL}/admin/pmb/stats`),
  getAllProdi: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchWithAuth(`${API_BASE_URL}/admin/prodi${qs}`)
  },
  createProdi: (data) => fetchWithAuth(`${API_BASE_URL}/admin/prodi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateProdi: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/prodi/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteProdi: (id) => fetchWithAuth(`${API_BASE_URL}/admin/prodi/${id}`, {
    method: 'DELETE'
  }),

  getAllLecturers: () => fetchWithAuth(`${API_BASE_URL}/admin/lecturers`),
  createLecturer: (data) => fetchWithAuth(`${API_BASE_URL}/admin/lecturers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateLecturer: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/lecturers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteLecturer: (id) => fetchWithAuth(`${API_BASE_URL}/admin/lecturers/${id}`, {
    method: 'DELETE'
  }),

  getAllPsychologists: () => fetchWithAuth(`${API_BASE_URL}/admin/psychologists`),
  updatePsychologist: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/psychologists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deletePsychologist: (id) => fetchWithAuth(`${API_BASE_URL}/admin/psychologists/${id}`, {
    method: 'DELETE'
  }),
  getPsychologistSchedules: (id) => fetchWithAuth(`${API_BASE_URL}/admin/psychologists/${id}/schedules`),
  savePsychologistSchedules: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/psychologists/${id}/schedules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getPsychologistBookings: () => fetchWithAuth(`${API_BASE_URL}/admin/psychologists/bookings`),
  getPsychologistMedicalRecords: () => fetchWithAuth(`${API_BASE_URL}/admin/psychologists/medical-records`),
  getPsychologistReferrals: () => fetchWithAuth(`${API_BASE_URL}/admin/psychologists/referrals`),
  approvePsychologistReferral: (id, action, catatan = '') =>
    fetchWithAuth(`${API_BASE_URL}/admin/psychologists/referrals/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, catatan }),
    }),

  // Tenaga Kesehatan (Health Worker) management API endpoints
  getAllTenagaKesehatan: () => fetchWithAuth(`${API_BASE_URL}/admin/tenagakes`),
  updateTenagaKesehatan: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/tenagakes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteTenagaKesehatan: (id) => fetchWithAuth(`${API_BASE_URL}/admin/tenagakes/${id}`, {
    method: 'DELETE'
  }),
  getTenagaKesehatanSchedules: (id) => fetchWithAuth(`${API_BASE_URL}/admin/tenagakes/${id}/schedules`),
  createTenagaKesehatanSchedule: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/tenagakes/${id}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateTenagaKesehatanSchedule: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/tenagakes/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteTenagaKesehatanSchedule: (id) => fetchWithAuth(`${API_BASE_URL}/admin/tenagakes/schedules/${id}`, {
    method: 'DELETE'
  }),
  getTenagaKesehatanBookings: () => fetchWithAuth(`${API_BASE_URL}/admin/tenagakes/bookings`),
  getTenagaKesehatanMedicalRecords: () => fetchWithAuth(`${API_BASE_URL}/admin/tenagakes/medical-records`),
  getTenagaKesehatanReferrals: () => fetchWithAuth(`${API_BASE_URL}/admin/tenagakes/referrals`),
  approveTenagaKesehatanReferral: (id, action, catatan = '') =>
    fetchWithAuth(`${API_BASE_URL}/admin/tenagakes/referrals/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, catatan }),
    }),

  // SuperAdmin Insurance Claims endpoints
  getSuperAdminClaims: (params = {}) => {
    const q = new URLSearchParams()
    if (params.status) q.append('status', params.status)
    if (params.jenis_provider) q.append('jenis_provider', params.jenis_provider)
    if (params.start_date) q.append('start_date', params.start_date)
    if (params.end_date) q.append('end_date', params.end_date)
    return fetchWithAuth(`${API_BASE_URL}/super-admin/health/claims?${q.toString()}`)
  },
  getSuperAdminClaimStats: () => fetchWithAuth(`${API_BASE_URL}/super-admin/health/claims/stats`),
  updateSuperAdminClaimStatus: (id, data) => fetchWithAuth(`${API_BASE_URL}/super-admin/health/claims/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getAllOrmawa: () => fetchWithAuth(`${API_BASE_URL}/admin/ormawa`),
  createOrmawa: (data) => fetchWithAuth(`${API_BASE_URL}/admin/ormawa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateOrmawa: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/ormawa/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteOrmawa: (id) => fetchWithAuth(`${API_BASE_URL}/admin/ormawa/${id}`, {
    method: 'DELETE'
  }),
  getOrmawaKategori: () => fetchWithAuth(`${API_BASE_URL}/admin/ormawa-kategori`),
  getGlobalAspirations: () => fetchWithAuth(`${API_BASE_URL}/admin/aspirations`),
  updateAspirationStatus: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/aspirations/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getGlobalProposals: () => fetchWithAuth(`${API_BASE_URL}/admin/proposals`),
  approveProposal: (id, data = {}) => fetchWithAuth(`${API_BASE_URL}/admin/proposals/${id}/approve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  rejectProposal: (id, nota) => fetchWithAuth(`${API_BASE_URL}/admin/proposals/${id}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ catatan: nota, status: 'ditolak' })
  }),
  reviseProposal: (id, nota) => fetchWithAuth(`${API_BASE_URL}/admin/proposals/${id}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ catatan: nota, status: 'revisi' })
  }),
  getAllScholarships: () => fetchWithAuth(`${API_BASE_URL}/admin/scholarships`),
  createScholarship: (data) => fetchWithAuth(`${API_BASE_URL}/admin/scholarships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateScholarship: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/scholarships/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteScholarship: (id) => fetchWithAuth(`${API_BASE_URL}/admin/scholarships/${id}`, {
    method: 'DELETE'
  }),
  getAllScholarshipApplications: () => fetchWithAuth(`${API_BASE_URL}/admin/scholarship-applications`),
  updateScholarshipApplicationStatus: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/scholarship-applications/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateBulkScholarshipApplicationStatus: (data) => fetchWithAuth(`${API_BASE_URL}/admin/scholarship-applications/bulk/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getAllCounseling: () => fetchWithAuth(`${API_BASE_URL}/admin/counseling-records`),
  createCounseling: (data) => fetchWithAuth(`${API_BASE_URL}/admin/counseling-records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateCounseling: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/counseling-records/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteCounseling: (id) => fetchWithAuth(`${API_BASE_URL}/admin/counseling-records/${id}`, {
    method: 'DELETE'
  }),
  getAllCounselingSchedules: () => fetchWithAuth(`${API_BASE_URL}/admin/counseling-schedules`),
  createCounselingSchedule: (data) => fetchWithAuth(`${API_BASE_URL}/admin/counseling-schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateCounselingSchedule: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/counseling-schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteCounselingSchedule: (id) => fetchWithAuth(`${API_BASE_URL}/admin/counseling-schedules/${id}`, {
    method: 'DELETE'
  }),
  getAllUsers: () => fetchWithAuth(`${API_BASE_URL}/admin/users`),
  createUser: (data) => fetchWithAuth(`${API_BASE_URL}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateUserRole: (data) => fetchWithAuth(`${API_BASE_URL}/admin/users/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateUser: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteUser: (id) => fetchWithAuth(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'DELETE'
  }),

  getRBACRoles: () => fetchWithAuth(`${API_BASE_URL}/admin/rbac/roles`),
  createRBACRole: (data) => fetchWithAuth(`${API_BASE_URL}/admin/rbac/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateRBACRole: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/rbac/roles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteRBACRole: (id) => fetchWithAuth(`${API_BASE_URL}/admin/rbac/roles/${id}`, {
    method: 'DELETE'
  }),
  getAllNews: () => fetchWithAuth(`${API_BASE_URL}/admin/news`),
  createNews: (data) => fetchWithAuth(`${API_BASE_URL}/admin/news`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateNews: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/news/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteNews: (id) => fetchWithAuth(`${API_BASE_URL}/admin/news/${id}`, {
    method: 'DELETE'
  }),

  // Faculty CRUD (missing - added now)
  createFaculty: (data) => fetchWithAuth(`${API_BASE_URL}/admin/fakultas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateFaculty: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/fakultas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteFaculty: (id) => fetchWithAuth(`${API_BASE_URL}/admin/fakultas/${id}`, {
    method: 'DELETE'
  }),
  getAllAchievements: () => fetchWithAuth(`${API_BASE_URL}/admin/achievements`),
  verifyAchievement: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/achievements/${id}/verify`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  syncSimkatmawa: (id) => fetchWithAuth(`${API_BASE_URL}/admin/achievements/${id}/sync-simkatmawa`, {
    method: 'POST'
  }),
  updateSimkatmawaStatus: (id, status) => fetchWithAuth(`${API_BASE_URL}/admin/achievements/${id}/simkatmawa-status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ simkatmawa_status: status })
  }),
  importAchievements: (formData) => {
    const token = getAuthToken()
    return fetch(`${API_BASE_URL}/admin/achievements/import`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    }).then(async res => {
      if (!res.ok) {
        let err;
        try { err = await res.json() } catch (e) { err = { message: 'Koneksi gagal' } }
        throw new Error(err.message || 'Koneksi gagal')
      }
      return res.json()
    })
  },
  // Theme Customizer
  getTheme: () => fetchWithAuth(`${API_BASE_URL}/admin/theme`),
  updateTheme: (data) => fetchWithAuth(`${API_BASE_URL}/admin/theme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getOrmawaLeaderboard: () => fetchWithAuth(`${API_BASE_URL}/admin/ormawa/leaderboard`),
  getOrmawaGamifikasiHistory: () => fetchWithAuth(`${API_BASE_URL}/admin/ormawa/gamifikasi/history`),
  getGamifikasiRules: () => fetchWithAuth(`${API_BASE_URL}/admin/ormawa/gamifikasi/rules`),
  updateGamifikasiRule: (id, data) => fetchWithAuth(`${API_BASE_URL}/admin/ormawa/gamifikasi/rules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  createGamifikasiRule: (data) => fetchWithAuth(`${API_BASE_URL}/admin/ormawa/gamifikasi/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteGamifikasiRule: (id) => fetchWithAuth(`${API_BASE_URL}/admin/ormawa/gamifikasi/rules/${id}`, {
    method: 'DELETE'
  }),
  getAdminLpjs: () => fetchWithAuth(`${API_BASE_URL}/admin/ormawa/lpjs`),
  reviewAdminLpj: (id, action, catatan) => fetchWithAuth(`${API_BASE_URL}/admin/ormawa/lpjs/${id}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, catatan })
  }),
  resetTheme: () => fetchWithAuth(`${API_BASE_URL}/admin/theme/reset`, {
    method: 'POST'
  }),
  updateLandingSettings: (data) => fetchWithAuth(`${API_BASE_URL}/admin/landing-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  uploadLogo: (formData) => fetchWithAuth(`${API_BASE_URL}/admin/theme/upload-logo`, {
    method: 'POST',
    body: formData
  }),
  uploadFavicon: (formData) => fetchWithAuth(`${API_BASE_URL}/admin/theme/upload-favicon`, {
    method: 'POST',
    body: formData
  }),
};

// ========================
// INSURANCE SERVICE (Mahasiswa & TK)
// ========================
export const insuranceService = {
  // Mahasiswa - Self-service
  getMyClaims: (params = {}) => {
    const q = new URLSearchParams()
    if (params.status) q.append('status', params.status)
    if (params.jenis_provider) q.append('jenis_provider', params.jenis_provider)
    if (params.start_date) q.append('start_date', params.start_date)
    if (params.end_date) q.append('end_date', params.end_date)
    return fetchWithAuth(`${API_BASE_URL}/mahasiswa/insurance?${q.toString()}`)
  },
  getMyClaimDetail: (id) => fetchWithAuth(`${API_BASE_URL}/mahasiswa/insurance/${id}`),
  createClaim: (data) => fetchWithAuth(`${API_BASE_URL}/mahasiswa/insurance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateClaim: (id, data) => fetchWithAuth(`${API_BASE_URL}/mahasiswa/insurance/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteClaim: (id) => fetchWithAuth(`${API_BASE_URL}/mahasiswa/insurance/${id}`, {
    method: 'DELETE'
  }),
  uploadClaimDocument: (id, formData) => fetchWithAuth(`${API_BASE_URL}/mahasiswa/insurance/${id}/upload`, {
    method: 'POST',
    body: formData
  }),

  // TK - Review & Management
  getClaims: (params = {}) => {
    const q = new URLSearchParams()
    if (params.status) q.append('status', params.status)
    if (params.jenis_provider) q.append('jenis_provider', params.jenis_provider)
    if (params.start_date) q.append('start_date', params.start_date)
    if (params.end_date) q.append('end_date', params.end_date)
    return fetchWithAuth(`${API_BASE_URL}/tenagakes/claims?${q.toString()}`)
  },
  getClaimStats: () => fetchWithAuth(`${API_BASE_URL}/tenagakes/claims/stats`),
  getClaimDetail: (id) => fetchWithAuth(`${API_BASE_URL}/tenagakes/claims/${id}`),
  updateClaimStatus: (id, data) => fetchWithAuth(`${API_BASE_URL}/tenagakes/claims/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  downloadClaimPDF: (id) => {
    const token = getAuthToken()
    return fetch(`${API_BASE_URL}/tenagakes/claims/${id}/export-pdf`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
  },
};

// ========================
// COUNSELING SERVICE (Mahasiswa)
// ========================
export const studentCounselingService = {
  downloadSessionNotePDF: async (id) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/counseling/session-notes/${id}/export-pdf`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: 'Gagal download PDF Sesi' }));
      throw new Error(errData.message || `Error ${res.status}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sesi_${id}_rekam_medis.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};

// ========================
// HEALTH BOOKING SERVICE (Mahasiswa)
// ========================
export const healthBookingService = {
  // List available schedules
  getAvailableSchedules: () => fetchWithAuth(`${API_BASE_URL}/student-health/health-worker-schedules`),

  // Get health workers
  getHealthWorkers: () => fetchWithAuth(`${API_BASE_URL}/student-health/health-workers`),

  // Get worker's schedules
  getWorkerSchedules: (workerId) => fetchWithAuth(`${API_BASE_URL}/student-health/health-workers/${workerId}/schedules`),

  // Get my bookings
  getMyBookings: () => fetchWithAuth(`${API_BASE_URL}/student-health/bookings`),

  // Create booking
  createBooking: (data) => fetchWithAuth(`${API_BASE_URL}/student-health/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // Cancel booking
  cancelBooking: (id) => fetchWithAuth(`${API_BASE_URL}/student-health/bookings/${id}`, {
    method: 'DELETE'
  }),

  // Reschedule booking
  rescheduleBooking: (id, jadwal_id) => fetchWithAuth(`${API_BASE_URL}/student-health/bookings/${id}/reschedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jadwal_id })
  }),
};

// ========================
// SELF-SCREENING SERVICE (Mahasiswa)
// ========================
export const selfScreeningService = {
  // Mahasiswa
  getMyScreenings: () => fetchWithAuth(`${API_BASE_URL}/mahasiswa/self-screening`),
  getMyScreeningDetail: (id) => fetchWithAuth(`${API_BASE_URL}/mahasiswa/self-screening/${id}`),
  createScreening: (data) => fetchWithAuth(`${API_BASE_URL}/mahasiswa/self-screening`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // TK - Management
  getScreenings: (params = {}) => {
    const q = new URLSearchParams()
    if (params.is_completed) q.append('is_completed', params.is_completed)
    if (params.start_date) q.append('start_date', params.start_date)
    if (params.end_date) q.append('end_date', params.end_date)
    return fetchWithAuth(`${API_BASE_URL}/tenagakes/screenings?${q.toString()}`)
  },
  getScreeningDetail: (id) => fetchWithAuth(`${API_BASE_URL}/tenagakes/screenings/${id}`),
  completeScreening: (id) => fetchWithAuth(`${API_BASE_URL}/tenagakes/screenings/${id}/complete`, {
    method: 'PUT'
  }),
};

// ========================
// RUJUKAN SERVICE
// ========================
export const rujukanService = {
  // Mahasiswa (published only)
  getMyRujukans: () => fetchWithAuth(`${API_BASE_URL}/mahasiswa/rujukan`),
  getMyRujukanDetail: (id) => fetchWithAuth(`${API_BASE_URL}/mahasiswa/rujukan/${id}`),

  // TK
  getRujukans: (params = {}) => {
    const q = new URLSearchParams()
    if (params.is_published) q.append('is_published', params.is_published)
    return fetchWithAuth(`${API_BASE_URL}/tenagakes/rujukans?${q.toString()}`)
  },
  createRujukan: (data) => fetchWithAuth(`${API_BASE_URL}/tenagakes/rujukan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getRujukanDetail: (id) => fetchWithAuth(`${API_BASE_URL}/tenagakes/rujukan/${id}`),
  publishRujukan: (id) => fetchWithAuth(`${API_BASE_URL}/tenagakes/rujukan/${id}/publish`, {
    method: 'PUT'
  }),
  downloadRujukanPDF: (id) => {
    const token = getAuthToken()
    return fetch(`${API_BASE_URL}/tenagakes/rujukan/${id}/export-pdf`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
  },
};

// ========================
// BAP KESEHATAN SERVICE
// ========================
export const bapService = {
  uploadBAPPhotos: (formData) => fetchWithAuth(`${API_BASE_URL}/tenagakes/bap/upload-photos`, {
    method: 'POST',
    body: formData
  }),
  getBAPs: (params = {}) => {
    const q = new URLSearchParams()
    if (params.event_id) q.append('event_id', params.event_id)
    if (params.status) q.append('status', params.status)
    if (params.start_date) q.append('start_date', params.start_date)
    if (params.end_date) q.append('end_date', params.end_date)
    return fetchWithAuth(`${API_BASE_URL}/tenagakes/bap?${q.toString()}`)
  },
  getBAPDetail: (id) => fetchWithAuth(`${API_BASE_URL}/tenagakes/bap/${id}`),
  createBAP: (data) => fetchWithAuth(`${API_BASE_URL}/tenagakes/bap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateBAP: (id, data) => fetchWithAuth(`${API_BASE_URL}/tenagakes/bap/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteBAP: (id) => fetchWithAuth(`${API_BASE_URL}/tenagakes/bap/${id}`, {
    method: 'DELETE'
  }),
  downloadBAPPDF: (id) => {
    const token = getAuthToken()
    return fetch(`${API_BASE_URL}/tenagakes/bap/${id}/export-pdf`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
  },
};

// ========================
// HEALTH REPORTS SERVICE
// ========================
export const healthReportsService = {
  getReports: (params = {}) => {
    const q = new URLSearchParams()
    if (params.start_date) q.append('start_date', params.start_date)
    if (params.end_date) q.append('end_date', params.end_date)
    return fetchWithAuth(`${API_BASE_URL}/tenagakes/reports?${q.toString()}`)
  },
  exportExcel: () => {
    const token = getAuthToken()
    return fetch(`${API_BASE_URL}/tenagakes/reports/export-excel`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
  },
  exportPDF: () => {
    const token = getAuthToken()
    return fetch(`${API_BASE_URL}/tenagakes/reports/export-pdf`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
  },
};

export const pddiktiService = {
  fetchData: (keyword = 'Universitas Bhakti Kencana', type = 'all') => {
    // Note: We use the proxy endpoint in our backend to avoid CORS issues
    // Now using fetchWithAuth as the route is protected
    return fetchWithAuth(`${API_BASE_URL}/pddikti/proxy?keyword=${encodeURIComponent(keyword)}&type=${type}`);
  }
};

// ========================
// LANDING PAGE CMS SERVICE
// ========================
export const landingService = {
  // Landing Pages CRUD
  getAll: () => fetchWithAuth(`${API_BASE_URL}/admin/landing`),
  getBySlug: (slug) => fetchWithAuth(`${API_BASE_URL}/admin/landing/${slug}`),
  create: (data) => fetchWithAuth(`${API_BASE_URL}/admin/landing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  update: (slug, data) => fetchWithAuth(`${API_BASE_URL}/admin/landing/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  delete: (slug) => fetchWithAuth(`${API_BASE_URL}/admin/landing/${slug}`, {
    method: 'DELETE'
  }),
  publish: (slug) => fetchWithAuth(`${API_BASE_URL}/admin/landing/${slug}/publish`, {
    method: 'POST'
  }),
  unpublish: (slug) => fetchWithAuth(`${API_BASE_URL}/admin/landing/${slug}/unpublish`, {
    method: 'POST'
  }),

  // Sections CRUD
  getSections: (slug) => fetchWithAuth(`${API_BASE_URL}/admin/landing/${slug}/sections`),
  createSection: (slug, data) => fetchWithAuth(`${API_BASE_URL}/admin/landing/${slug}/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateSection: (slug, sectionId, data) => fetchWithAuth(`${API_BASE_URL}/admin/landing/${slug}/sections/${sectionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteSection: (slug, sectionId) => fetchWithAuth(`${API_BASE_URL}/admin/landing/${slug}/sections/${sectionId}`, {
    method: 'DELETE'
  }),
  toggleSection: (slug, sectionId) => fetchWithAuth(`${API_BASE_URL}/admin/landing/${slug}/sections/${sectionId}/toggle`, {
    method: 'PUT'
  }),
  reorderSections: (slug, sections) => fetchWithAuth(`${API_BASE_URL}/admin/landing/${slug}/sections/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections })
  }),

  // Section Types
  getSectionTypes: () => fetchWithAuth(`${API_BASE_URL}/admin/landing/section-types`),

  // Public (No auth required) - Note: uses /public/ prefix, not /api/ to avoid auth middleware
  getPublicPage: (slug) => fetch(`/public/landing/${slug}`).then(handleResponse),
  getPublicPreview: (slug) => fetch(`/public/landing/${slug}/preview`).then(handleResponse),

  // File Upload
  uploadImage: (formData) => fetchWithAuth(`${API_BASE_URL}/admin/landing/upload`, {
    method: 'POST',
    body: formData
  }),
};

export const documentSettingsService = {
  generateNumber: (jenisSurat) => fetchWithAuth(`${API_BASE_URL}/admin/document-settings/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jenis_surat: jenisSurat })
  })
};
