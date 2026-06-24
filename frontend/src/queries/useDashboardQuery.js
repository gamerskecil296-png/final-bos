import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';

export const useDashboardQuery = () => {
  return useQuery({
    queryKey: ['mahasiswa', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/mahasiswa/dashboard');
      return data.data; // Since response is { success, message, data: { ... } }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
  });
};
