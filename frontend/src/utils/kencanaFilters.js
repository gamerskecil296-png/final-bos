export const getKencanaInitialFakultas = (role, isFacultyScoped, userFakultasId) => {
  if (role === 'super_admin') {
    const stored = localStorage.getItem('superadmin_fakultas_id');
    return stored && stored !== 'all' ? stored : (isFacultyScoped ? '' : 'all');
  }
  return isFacultyScoped ? String(userFakultasId || '') : 'all';
};

export const getKencanaInitialProdi = (role) => {
  if (role === 'super_admin') {
    const stored = localStorage.getItem('superadmin_prodi_id');
    return stored && stored !== 'all' ? stored : 'all';
  }
  return 'all';
};
