import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

const toValidDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const normalizeHealthRecord = (item = {}) => {
  const tanggalRaw = item.tanggal_periksa || item.Tanggal || item.tanggal || item.created_at || item.CreatedAt;
  const tanggalDate = toValidDate(tanggalRaw);

  const sistolikVal = item.sistolik ?? item.Sistole ?? item.sistole ?? 0;
  const diastolikVal = item.diastolik ?? item.Diastole ?? item.diastole ?? 0;
  const tinggiVal = item.tinggi_badan ?? item.TinggiBadan ?? 0;
  const beratVal = item.berat_badan ?? item.BeratBadan ?? 0;

  let bmiVal = item.bmi;
  if (bmiVal == null) {
    const h = Number(tinggiVal) / 100;
    const w = Number(beratVal);
    if (h > 0 && w > 0) {
      bmiVal = Number((w / (h * h)).toFixed(1));
    } else {
      bmiVal = 0;
    }
  }

  const hasilText = String(item.hasil || item.Hasil || '').toLowerCase();
  const statusFromHasil = hasilText.includes('sehat') ? 'sehat' : hasilText.includes('perhatian') ? 'pantauan' : '';

  return {
    id: item.id || item.ID || 0,
    tanggal_periksa: tanggalDate ? tanggalDate.toISOString() : null,
    tinggi_badan: Number(tinggiVal) || 0,
    berat_badan: Number(beratVal) || 0,
    sistolik: Number(sistolikVal) || 0,
    diastolik: Number(diastolikVal) || 0,
    gula_darah: item.gula_darah ?? item.GulaDarah ?? 0,
    bmi: Number(bmiVal) || 0,
    golongan_darah: item.golongan_darah || item.GolonganDarah || '-',
    sumber: item.sumber || item.Sumber || 'mandiri',
    diperiksa_oleh: item.diperiksa_oleh || item.DiperiksaOleh || '',
    status_kesehatan: item.status_kesehatan || item.StatusKesehatan || statusFromHasil || 'sehat',
    keluhan: item.keluhan || item.Keluhan || item.catatan || item.Catatan || '',
    catatan_medis: item.catatan_medis || item.CatatanMedis || item.catatan || item.Catatan || '',
  };
};

// Get Health Summary (Hero Card)
export const useHealthRingkasanQuery = () => {
  return useQuery({
    queryKey: ['health', 'ringkasan'],
    queryFn: async () => {
      const { data } = await api.get('/student-health/ringkasan');
      const terakhir = data?.data?.terakhir;
      if (!terakhir) return null;
      return normalizeHealthRecord(terakhir);
    },
  });
};

// Alias to maintain compatibility if any component still uses the old name
export const useHealthTerbaruQuery = useHealthRingkasanQuery;

// Get Health History (Paginated & Filtered)
export const useHealthRiwayatQuery = (filters = { sumber: 'Semua' }) => {
  return useQuery({
    queryKey: ['health', 'riwayat', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.sumber !== 'Semua') params.append('sumber', filters.sumber);

      const { data } = await api.get(`/student-health/riwayat?${params.toString()}`);
      const list = Array.isArray(data?.data) ? data.data : [];
      return list.map(normalizeHealthRecord);
    },
  });
};

// Get Health Detail (Action Modal)
export const useHealthDetailQuery = (id) => {
  return useQuery({
    queryKey: ['health', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/student-health/riwayat/${id}`);
      return normalizeHealthRecord(data?.data || {});
    },
    enabled: !!id,
  });
};

// Input Mandiri Mutation
export const useHealthMandiriMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const { data } = await api.post('/student-health/mandiri', payload);
        return data;
      } catch (err) {
        const status = err?.response?.status;
        if (status === 404) {
          const { data } = await api.post('/student-health/record', payload);
          return data;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });
};

// Get Health Tips (BMI based)
export const useHealthTipsQuery = (bmi) => {
  return useQuery({
    queryKey: ['health', 'tips', bmi],
    queryFn: async () => {
      const { data } = await api.get(`/student-health/tips?bmi=${bmi}`);
      return data.tips;
    },
    enabled: !!bmi,
  });
};

// Get My Rujukans
export const useHealthRujukanQuery = () => {
  return useQuery({
    queryKey: ['health', 'rujukan'],
    queryFn: async () => {
      const { data } = await api.get('/mahasiswa/rujukan');
      return data?.data || [];
    },
  });
};
