const AUTH_STORAGE_KEY = 'siakad_auth';

export const apiBaseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8000';

export function saveSession(payload) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

export function getSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated() {
  const session = getSession();
  return Boolean(session?.token && session?.user?.role);
}

export function hasRole(allowedRoles = []) {
  const session = getSession();
  const userRole = session?.user?.role;
  return Boolean(userRole && allowedRoles.includes(userRole));
}

export function getDefaultRouteByRole(role) {
  if (role === 'student') return '/student';
  if (role === 'super_admin') return '/admin';
  if (role === 'faculty_admin') return '/faculty';
  if (role === 'ormawa_admin') return '/ormawa';
  return '/login';
}
