import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

const toValidDateISO = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const normalizeStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'menunggu') return 'menunggu';
  if (s === 'diproses' || s === 'proses') return 'diproses';
  if (s === 'ditindaklanjuti') return 'ditindaklanjuti';
  if (s === 'dibatalkan') return 'dibatalkan';
  if (s === 'selesai') return 'selesai';
  if (s === 'disetujui fakultas') return 'disetujui fakultas';
  if (s === 'ditolak fakultas') return 'ditolak fakultas';
  return s || 'menunggu';
};

const normalizeLevel = (tujuan, status) => {
  if (String(status || '').toLowerCase() === 'selesai') return 'selesai';
  const t = String(tujuan || '').toLowerCase();
  if (t.includes('universitas')) return 'universitas';
  if (t.includes('prodi')) return 'prodi';
  if (t.includes('ormawa')) return 'ormawa';
  return 'fakultas';
};

const buildVoiceTimeline = (item = {}) => {
  const createdAt = toValidDateISO(item.created_at || item.CreatedAt);
  const updatedAt = toValidDateISO(item.updated_at || item.UpdatedAt) || createdAt;
  const status = normalizeStatus(item.status || item.Status);
  const respon = String(item.respon || item.Respon || '').trim();

  const events = [];

  if (createdAt) {
    events.push({
      id: `evt-${item.id || item.ID || 'x'}-created`,
      tipe_event: 'dikirim',
      created_at: createdAt,
      level: 'sistem',
      isi_respons: '',
    });
  }

  if (
    status === 'diproses' ||
    status === 'ditindaklanjuti' ||
    status === 'selesai' ||
    status === 'disetujui fakultas' ||
    status === 'ditolak fakultas'
  ) {
    events.push({
      id: `evt-${item.id || item.ID || 'x'}-accepted`,
      tipe_event: 'diterima_fakultas',
      created_at: updatedAt,
      level: 'fakultas',
      isi_respons: '',
    });
  }

  if (status === 'dibatalkan') {
    events.push({
      id: `evt-${item.id || item.ID || 'x'}-cancelled`,
      tipe_event: 'dibatalkan',
      created_at: updatedAt,
      level: 'sistem',
      isi_respons: respon,
    });
  } else if (status === 'selesai') {
    events.push({
      id: `evt-${item.id || item.ID || 'x'}-done`,
      tipe_event: 'selesai',
      created_at: updatedAt,
      level: 'fakultas',
      isi_respons: respon,
    });
  } else if (respon) {
    events.push({
      id: `evt-${item.id || item.ID || 'x'}-response`,
      tipe_event: 'respons_fakultas',
      created_at: updatedAt,
      level: 'fakultas',
      isi_respons: respon,
    });
  }

  return events
    .filter((e) => Boolean(e.created_at))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const normalizeVoiceItem = (item = {}) => {
  const id = item.id || item.ID || 0;
  const createdAt = toValidDateISO(item.created_at || item.CreatedAt);
  const status = normalizeStatus(item.status || item.Status);
  const tujuan = item.tujuan || item.Tujuan || '';

  return {
    id,
    nomor_tiket: `ASP-${String(id).padStart(5, '0')}`,
    created_at: createdAt,
    kategori: item.kategori || item.Kategori || 'Lainnya',
    judul: item.judul || item.Judul || '-',
    isi: item.isi || item.Isi || '',
    status,
    level_saat_ini: normalizeLevel(tujuan, status),
    is_anonim: Boolean(item.is_anonim ?? item.IsAnonim),
    lampiran_url: item.lampiran_url || item.LampiranURL || '',
    respon: item.respon || item.Respon || '',
    timeline: buildVoiceTimeline(item),
  };
};

const normalizeStats = (raw = {}) => ({
  total: Number(raw.total) || 0,
  di_fakultas: Number(raw.di_fakultas) || Number(raw.di_proses) || 0,
  di_universitas: Number(raw.di_universitas) || 0,
  selesai: Number(raw.selesai) || 0,
});

// 1. Get Stats (Total, Level, Status)
export const useVoiceStatsQuery = () => {
  return useQuery({
    queryKey: ['student-voice', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/student-voice/stats');
      return normalizeStats(data?.data || {});
    },
  });
};

// 2. Get Aspiration List (Paginated)
export const useVoiceListQuery = (page = 1) => {
  return useQuery({
    queryKey: ['student-voice', 'list', page],
    queryFn: async () => {
      const { data } = await api.get(`/student-voice/?page=${page}`);
      const payload = data?.data || {};
      const list = Array.isArray(payload.list) ? payload.list.map(normalizeVoiceItem) : [];
      return {
        total: Number(payload.total) || 0,
        page: Number(payload.page) || page,
        last_page: Number(payload.last_page) || 1,
        list,
      };
    },
  });
};

// 3. Get Aspiration Detail
export const useVoiceDetailQuery = (id) => {
  return useQuery({
    queryKey: ['student-voice', 'detail', id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/student-voice/${id}`);
        return normalizeVoiceItem(data?.data || {});
      } catch (error) {
        // Melempar error yang lebih jelas agar bisa ditangani UI
        if (error.response) {
          throw {
            status: error.response.status,
            message: error.response.data?.message || 'Gagal memuat detail aspirasi',
          };
        }
        throw error;
      }
    },
    enabled: !!id,
    retry: (failureCount, error) => {
      // Jangan retry jika error adalah 404 (Data Tidak Ditemukan)
      if (error?.status === 404) return false;
      // Untuk error lain, retry maksimal 2 kali
      return failureCount < 2;
    },
  });
};

// 4. Create New Aspiration (Multipart)
export const useCreateVoiceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      try {
        const { data } = await api.post('/student-voice/create', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
      } catch (err) {
        const status = err?.response?.status;
        if (status === 404 || status === 405) {
          const { data } = await api.post('/student-voice', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          return data;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-voice'] });
    },
  });
};

// 5. Cancel Aspiration
export const useCancelVoiceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.put(`/student-voice/${id}/cancel`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-voice'] });
    },
  });
};
