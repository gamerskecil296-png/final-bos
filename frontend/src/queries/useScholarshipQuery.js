import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

// Get Katalog Beasiswa (with filtering & sorting)
export const useScholarshipKatalogQuery = (filters = { kategori: 'Semua', sort: 'deadline_asc' }) => {
  return useQuery({
    queryKey: ['scholarship', 'katalog', filters],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (filters.kategori !== 'Semua') p.append('kategori', filters.kategori);
      if (filters.sort) p.append('sort', filters.sort);
      const { data } = await api.get(`/scholarship?${p.toString()}`);
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Get Detail Beasiswa
export const useScholarshipDetailQuery = (id) => {
  return useQuery({
    queryKey: ['scholarship', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/scholarship/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
};

// Get Riwayat Pengajuan (includes stats)
export const useScholarshipRiwayatQuery = () => {
  return useQuery({
    queryKey: ['scholarship', 'riwayat'],
    queryFn: async () => {
      const { data } = await api.get('/scholarship/riwayat');
      return data; // { success, data (list), stats }
    },
  });
};

// Get Detail Pengajuan (Tracking Pipeline)
export const usePengajuanDetailQuery = (id) => {
  return useQuery({
    queryKey: ['scholarship', 'pengajuan', id],
    queryFn: async () => {
      const { data } = await api.get(`/scholarship/pengajuan/${id}`);
      return data;
    },
    enabled: !!id && id !== 'undefined',
  });
};

// Daftar Beasiswa (Multipart FormData)
export const useDaftarBeasiswaMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, formData }) => {
      const { data } = await api.post(`/scholarship/${id}/daftar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholarship'] });
    },
  });
};
