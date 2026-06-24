import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const decodeToken = (token) => {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
};

// Validate token expiry — auto-logout if expired
const isTokenExpired = (token) => {
  const payload = decodeToken(token);
  if (!payload) return true;
  const exp = payload.exp;
  if (!exp) return false; // no exp claim — assume valid
  return Date.now() >= exp * 1000;
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      mahasiswa: null,
      isAuthenticated: false,

      setAuth: (token, user, mahasiswa) => {
        // Reject expired tokens at login
        if (token && isTokenExpired(token)) {
          set({ accessToken: null, user: null, mahasiswa: null, isAuthenticated: false });
          return;
        }
        set({
          accessToken: token,
          user: user || null,
          mahasiswa: mahasiswa || null,
          isAuthenticated: !!token,
        });
      },

      setAccessToken: (accessToken) => {
        if (accessToken && isTokenExpired(accessToken)) {
          set({ accessToken: null, isAuthenticated: false });
          return;
        }
        set({ accessToken });
      },

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),

      logout: () => set({
        accessToken: null,
        user: null,
        mahasiswa: null,
        isAuthenticated: false,
      }),

      // Expose expiry check for components that need it
      isTokenExpired: (token) => isTokenExpired(token || get().accessToken),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export default useAuthStore;
