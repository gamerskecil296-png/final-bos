import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import toast from 'react-hot-toast';

// 1. Dapatkan Periode Aktif
export const useKRSPeriode = () => {
  return useQuery({
    queryKey: ['krs', 'periode'],
    queryFn: async () => {
      const { data } = await api.get('/krs/periode');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// 2. Dapatkan Katalog MK Tersedia (terfilter per prodi)
export const useKRSKatalog = () => {
  return useQuery({
    queryKey: ['krs', 'katalog'],
    queryFn: async () => {
      const { data } = await api.get('/krs/matakuliah');
      return data.data;
    },
  });
};

// 3. Dapatkan KRS Keranjang Saya & Detail
export const useKRSSaya = () => {
  return useQuery({
    queryKey: ['krs', 'saya'],
    queryFn: async () => {
      const { data } = await api.get('/krs/saya');
      return data.data;
    },
  });
};

// Mutations
export const useAddKRS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jadwalKuliahId) => {
      const { data } = await api.post('/krs/tambah', { jadwal_kuliah_id: jadwalKuliahId });
      return data;
    },
    onMutate: async (newJadwalId) => {
      // Optimistic Update can be tricky because we need the full Jadwal object
      // For safety, we will just rely on fast invalidation here to prevent corrupted local state
      toast.loading('Menambahkan...', { id: 'krs-add' });
    },
    onSuccess: () => {
      toast.success('Mata kuliah berhasil ditambahkan ke keranjang KRS!', { id: 'krs-add' });
      // Invalidate to refetch fresh data (SKS, List)
      queryClient.invalidateQueries({ queryKey: ['krs', 'saya'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Gagal menambahkan mata kuliah';
      toast.error(msg, { id: 'krs-add' });
    },
  });
};

export const useRemoveKRS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (detailId) => {
      const { data } = await api.delete(`/krs/${detailId}`);
      return data;
    },
    onMutate: () => {
      toast.loading('Menghapus...', { id: 'krs-remove' });
    },
    onSuccess: () => {
      toast.success('Berhasil dihapus dari keranjang KRS', { id: 'krs-remove' });
      queryClient.invalidateQueries({ queryKey: ['krs', 'saya'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Gagal menghapus mata kuliah';
      toast.error(msg, { id: 'krs-remove' });
    },
  });
};

export const useSubmitKRS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/krs/submit');
      return data;
    },
    onMutate: () => {
      toast.loading('Mensubmit KRS ke Dosen Wali...', { id: 'krs-submit' });
    },
    onSuccess: () => {
      toast.success('KRS berhasil disubmit!', { id: 'krs-submit' });
      queryClient.invalidateQueries({ queryKey: ['krs', 'saya'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Gagal submit KRS';
      toast.error(msg, { id: 'krs-submit' });
    },
  });
};
