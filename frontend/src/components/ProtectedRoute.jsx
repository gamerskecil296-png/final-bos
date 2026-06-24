import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { usePermission } from '../hooks/usePermission';

const AccessDeniedModal = () => {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-600" style={{ fontSize: '32px' }}>gpp_bad</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Akses Ditolak</h3>
          <p className="text-sm text-slate-600 mb-6">
            Anda tidak memiliki izin (permission) atau role yang sesuai untuk mengakses halaman ini.
          </p>
          <button 
            onClick={() => navigate(-1)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, requiredPermissions = [] }) => {
  const { isAuthenticated, user, accessToken } = useAuthStore();
  const { hasPermission } = usePermission();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If permissions are specified, perform check
  if (user && requiredPermissions.length > 0) {
    // Super Admin bypasses all checks via permissions (which hasPermission handles internally if it's super admin)
    // Actually hasPermission handles super_admin bypass internally, but we can do it here too just in case
    const userRoles = String(user.role || user.Role || '').toLowerCase().split(',').map(r => r.trim());
    if (userRoles.includes('super_admin') || userRoles.includes('superadmin')) {
      return children;
    }

    const hasReqPerm = requiredPermissions.some(perm => hasPermission(perm));
    if (hasReqPerm) {
      return children;
    }

    // If check fails, deny access
    return <AccessDeniedModal />;
  }

  return children;
};

export default ProtectedRoute;
