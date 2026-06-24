/**
 * AuthContext.jsx
 *
 * NOTE: Sistem autentikasi utama aplikasi ini menggunakan Zustand store
 * (`src/store/useAuthStore.js`). File ini HANYA mempertahankan komponen
 * `AuthProvider` sebagai wrapper di App.jsx untuk kompatibilitas struktur
 * routing yang sudah ada.
 *
 * Semua logika login, logout, token, dan role management ada di:
 * → src/store/useAuthStore.js
 * → src/lib/axios.js (interceptor)
 * → src/components/ProtectedRoute.jsx
 */

import React from 'react';

/**
 * AuthProvider — wrapper minimal tanpa state, dipertahankan agar
 * import di App.jsx tidak perlu diubah. Bisa dihapus di fase refactor
 * berikutnya setelah App.jsx juga dimigrasikan.
 */
export const AuthProvider = ({ children }) => {
  return <>{children}</>;
};
