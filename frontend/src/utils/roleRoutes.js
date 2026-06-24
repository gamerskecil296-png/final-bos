export const getRouteByRole = (role, permissions = []) => {
  const r = String(role || '').toLowerCase().trim();
  const userPermissions = permissions || [];

  // All roles now go to /app/* — DynamicLayout handles sidebar/layout by permission
  if (r === 'super_admin' || r === 'superadmin') return '/app/dashboard';
  if (r === 'kencana_admin') return '/app/kencana/dashboard';
  if (r === 'kencana_fakultas') return '/app/kencana/faculty-stages';
  if (r === 'kencana_mentor') return '/app/kencana/mentor';
  if (r === 'faculty_admin' || r === 'prodi_admin' || r === 'dosen') return '/app/dashboard';
  if (r === 'ormawa_admin' || r === 'ormawa') return '/app/ormawa/dashboard';
  if (r === 'psikolog' || r === 'psychologist') return '/app/psikologi/dashboard';
  if (r === 'tenaga_kesehatan' || r === 'tenagakes' || r === 'medis') return '/app/kesehatan/dashboard';

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
  if (userPermissions.some(p => ['psychologist.dashboard.view', 'counseling.dashboard.view'].includes(p))) {
    return '/app/psikologi/dashboard';
  }
  if (userPermissions.some(p => ['health.dashboard.view', 'health_claims.view', 'tenagakes.dashboard.view'].includes(p))) {
    return '/app/kesehatan/dashboard';
  }

  return '/app/student/dashboard';
};
