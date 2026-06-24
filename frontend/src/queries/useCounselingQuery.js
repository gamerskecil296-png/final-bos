import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

const toValidDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const normalizeRiwayatItem = (item = {}) => {
  const tanggalRaw = item.date || item.tanggal || item.Tanggal || item.created_at || item.CreatedAt;
  const tanggalDate = toValidDate(tanggalRaw);
  const dosen = item.dosen || item.Dosen || {};
  const psychologist = item.psychologist || item.Psychologist || {};

  const jamMulai =
    item.start ||
    item.jam_mulai ||
    item.JamMulai ||
    (tanggalDate
      ? tanggalDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '-');

  return {
    id: item.id || item.ID || 0,
    tanggal: tanggalDate ? tanggalDate.toISOString() : null,
    status: item.status || item.Status || 'Menunggu',
    tipe: item.topic || item.tipe || item.Tipe || item.topik || item.Topik || 'Konseling',
    psikolog_id: item.psikolog_id || item.psikologId || psychologist.id || psychologist.ID || dosen.id || dosen.ID || 0,
    nama_konselor: item.nama_konselor || item.NamaKonselor || psychologist.name || psychologist.nama || dosen.nama || dosen.Nama || '-',
    jam_mulai: jamMulai,
    jam_selesai: item.end || item.jam_selesai || item.JamSelesai || '',
    keluhan: item.complaint || item.keluhan || item.Keluhan || '',
    has_medical_record: Boolean(item.has_medical_record || item.hasMedicalRecord),
    medical_record_count: Number(item.medical_record_count || item.medicalRecordCount || 0),
    queue_number: item.queue_number || item.queueNumber || null,
    mode: item.mode || item.Mode || 'Tatap Muka',
  };
};

const normalizeJadwalItem = (item = {}) => {
  const tanggalRaw = item.tanggal || item.Tanggal || item.created_at || item.CreatedAt;
  const tanggalDate = toValidDate(tanggalRaw);
  const psychologist = item.psychologist || item.Psychologist || {};

  return {
    ID: item.id || item.ID || 0,
    SlotID: item.slot_id || item.slotId || item.ID || item.id || 0,
    PsikologID: item.psikolog_id || item.psikologId || psychologist.id || psychologist.ID || 0,
    Psychologist: psychologist,
    NamaKonselor: item.nama_konselor || item.NamaKonselor || psychologist.name || psychologist.nama || item.nama || item.Nama || 'Psikolog BKU',
    Tipe: item.kategori || item.Kategori || item.category || item.tipe || item.Tipe || item.specialization || item.Spesialisasi || psychologist.specialization || psychologist.spesialisasi || 'Personal',
    Spesialisasi: item.specialization || item.Spesialisasi || psychologist.specialization || psychologist.spesialisasi || '',
    Tanggal: tanggalDate ? tanggalDate.toISOString() : new Date().toISOString(),
    JamMulai: item.jam_mulai || item.JamMulai || '09:00',
    JamSelesai: item.jam_selesai || item.JamSelesai || '10:00',
    Lokasi: item.lokasi || item.Lokasi || 'Ruang Konseling',
    Kuota: Number(item.kuota ?? item.Kuota ?? 0),
    SisaKuota: Number(item.sisa_kuota ?? item.SisaKuota ?? 0),
  };
};

// Get Available Schedules
export const useCounselingJadwalQuery = () => {
  return useQuery({
    queryKey: ['counseling', 'jadwal'],
    queryFn: async () => {
      const { data } = await api.get('/counseling/psychologist-schedules');
      const list = Array.isArray(data?.data) ? data.data : [];
      return list.map(normalizeJadwalItem);
    },
  });
};

const normalizeMedicalRecord = (payload = {}) => {
  const records = Array.isArray(payload.records) ? payload.records : [];
  return {
    summary: {
      total_records: Number(payload.summary?.total_records || payload.summary?.totalRecords || records.length || 0),
      latest_status: payload.summary?.latest_status || payload.summary?.latestStatus || 'Belum ada catatan',
    },
    records: records.map((item = {}) => ({
      id: item.id || item.ID || 0,
      booking_id: item.booking_id || item.bookingId || item.BookingID || null,
      psychologist: item.psychologist || item.Psychologist || '-',
      date: item.date || item.tanggal || item.Tanggal || null,
      display_date: item.display_date || item.displayDate || item.date || '-',
      time: item.time || '-',
      complaint: item.complaint || item.keluhan || item.Keluhan || '-',
      observation: item.observation || item.observasi || item.Observasi || '-',
      recommendation: item.recommendation || item.rekomendasi || item.Rekomendasi || '-',
      mood: item.mood || item.Mood || '-',
      type: item.type || item.jenis_sesi || item.JenisSesi || 'Konseling',
      status: item.status || item.status_pasien || item.StatusPasien || '-',
      // Screening detail
      tujuan_pemeriksaan: item.tujuan_pemeriksaan || '',
      tanggal_asesmen: item.tanggal_asesmen || '',
      riwayat_keluhan: item.riwayat_keluhan || '',
      aspek_kognitif: item.aspek_kognitif || '',
      aspek_emosional: item.aspek_emosional || '',
      aspek_perilaku: item.aspek_perilaku || '',
      rekomendasi_mahasiswa: item.rekomendasi_mahasiswa || '',
      rekomendasi_prodi: item.rekomendasi_prodi || '',
      rekomendasi_orang_tua: item.rekomendasi_orang_tua || '',
      tindak_lanjut: Array.isArray(item.tindak_lanjut) ? item.tindak_lanjut : [],
      tindak_lanjut_tuntas: Boolean(item.tindak_lanjut_tuntas),
      tindak_lanjut_lanjutan: Boolean(item.tindak_lanjut_lanjutan),
      tindak_lanjut_rujuk: Boolean(item.tindak_lanjut_rujuk),
      kesimpulan: item.kesimpulan || '',
    })),
  };
};

// Get Booking History for Student
export const useCounselingRiwayatQuery = () => {
  return useQuery({
    queryKey: ['counseling', 'riwayat'],
    queryFn: async () => {
      const { data } = await api.get('/counseling/psychologist-bookings');
      const list = Array.isArray(data?.data) ? data.data : [];
      return list.map(normalizeRiwayatItem);
    },
  });
};

export const useCounselingMedicalRecordQuery = () => {
  return useQuery({
    queryKey: ['counseling', 'medical-record'],
    queryFn: async () => {
      const { data } = await api.get('/counseling/medical-record');
      return normalizeMedicalRecord(data?.data || {});
    },
  });
};

export const useCounselingReferralsQuery = () => {
  return useQuery({
    queryKey: ['counseling', 'referrals'],
    queryFn: async () => {
      const { data } = await api.get('/counseling/referrals');
      return Array.isArray(data?.data) ? data.data : [];
    },
  });
};

// Create New Booking
export const useBookingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/counseling/psychologist-bookings', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counseling', 'riwayat'] });
      queryClient.invalidateQueries({ queryKey: ['counseling', 'jadwal'] });
    },
  });
};

// Cancel Pending Booking
export const useCancelBookingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/counseling/psychologist-bookings/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counseling', 'riwayat'] });
      queryClient.invalidateQueries({ queryKey: ['counseling', 'jadwal'] });
    },
  });
};

// Reschedule Booking
export const useRescheduleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, date, start, end, mode }) => {
      const { data } = await api.put(`/counseling/psychologist-bookings/${id}/reschedule`, { date, start, end, mode });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counseling', 'riwayat'] });
    },
  });
};
