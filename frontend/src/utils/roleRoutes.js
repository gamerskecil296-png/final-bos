export const getRouteByRole = (role, permissions = []) => {
  const r = String(role || '').toLowerCase().trim();
  const userRoles = r.split(',').map(x => x.trim());
  const userPermissions = permissions || [];

  // All roles now go to /app/* — DynamicLayout handles sidebar/layout by permission
  if (userRoles.includes('super_admin') || userRoles.includes('superadmin')) return '/app/dashboard';
  if (userRoles.includes('kencana_admin')) return '/app/kencana/dashboard';
  if (userRoles.includes('kencana_fakultas')) return '/app/kencana/faculty-stages';
  if (userRoles.includes('kencana_mentor')) return '/app/kencana/mentor';
  if (userRoles.includes('faculty_admin') || userRoles.includes('prodi_admin') || userRoles.includes('dosen')) return '/app/dashboard';
  if (userRoles.includes('ormawa_admin') || userRoles.includes('ormawa')) return '/app/ormawa/dashboard';
  if (userRoles.includes('psikolog') || userRoles.includes('psychologist')) return '/app/psikologi/dashboard';
  if (userRoles.includes('tenaga_kesehatan') || userRoles.includes('tenagakes') || userRoles.includes('medis')) return '/app/kesehatan/dashboard';

  // Permission-based fallbacks
  const superAdminPerms = ['admin.', 'rbac.', 'system.', 'system_'];
  if (userPermissions.includes('*') || userPermissions.some(p => superAdminPerms.some(prefix => p.startsWith(prefix)))) {
    return '/app/dashboard';
  }

  const isFacultyPerm = (p) => 
    p.startsWith('faculty.') || p.startsWith('faculty_') || 
    p.startsWith('program_studi.') ||
    ['students.view', 'dosen.view', 'achievement.view', 'scholarship.view', 'akademik.view', 'aspiration.view', 'prodi_users.view'].includes(p);

  if (userPermissions.some(isFacultyPerm)) {
    return '/app/dashboard';
  }

  if (userPermissions.some(p => ['kencana.university.view', 'kencana.timeline.view', 'kencana.score_summary.view'].includes(p))) {
    return '/app/kencana/dashboard';
  }
  if (userPermissions.some(p => p.startsWith('kencana.faculty'))) {
    return '/app/kencana/faculty-stages';
  }
  if (userPermissions.some(p => p.startsWith('kencana.mentor'))) {
    return '/app/kencana/mentor';
  }
  if (userPermissions.some(p => p.startsWith('kencana.'))) {
    return '/app/kencana/dashboard';
  }
  if (userPermissions.some(p => ['ormawa.core.view', 'ormawa.dashboard.view', 'ormawa.view', 'view_dashboard'].includes(p))) {
    return '/app/ormawa/dashboard';
  }
  if (userPermissions.some(p => ['psychologist.dashboard.view', 'counseling.dashboard.view'].includes(p) || p.startsWith('psychologist.'))) {
    return '/app/psikologi/dashboard';
  }
  if (userPermissions.some(p => ['health.dashboard.view', 'health_claims.view', 'tenagakes.dashboard.view'].includes(p) || p.startsWith('health.') || p.startsWith('klinik.') || p.startsWith('tenagakes.'))) {
    return '/app/kesehatan/dashboard';
  }

  return '/app/student/dashboard';
};
