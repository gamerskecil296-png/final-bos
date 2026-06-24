import React, { useEffect } from 'react'
import { SuperAdminOrmawaHeader } from './components/SuperAdminOrmawaHeader'
import { useSuperAdminOrmawa } from '@/contexts/SuperAdminOrmawaContext'
import useAuthStore from '@/store/useAuthStore'

/**
 * Higher Order Component untuk wrap halaman ormawa dengan akses Super Admin
 * Menambahkan header dengan dropdown selector dan override ormawaId
 */
export function withSuperAdminOrmawaAccess(Component, title) {
  return function SuperAdminOrmawaWrapper(props) {
    let selectedOrmawaId, selectedOrmawa

    // Safe context usage with error handling
    try {
      const context = useSuperAdminOrmawa()
      selectedOrmawaId = context.selectedOrmawaId
      selectedOrmawa = context.selectedOrmawa
    } catch (error) {
      // Context not available, use default from auth store
      const user = useAuthStore.getState()?.user
      selectedOrmawaId = user?.ormawa_id || user?.OrmawaID || null
      selectedOrmawa = null
    }

    if (!selectedOrmawaId) {
      return (
        <div className="px-4 py-6 md:px-6 lg:px-8 min-h-screen bg-transparent font-inter">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-sm">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--theme-bg)] mb-4">
                <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '40px' }}>
                  groups
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">Pilih Organisasi</h3>
              <p className="text-sm text-slate-500">
                Gunakan dropdown di atas untuk memilih organisasi yang ingin dilihat
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <SuperAdminOrmawaOverrideProvider ormawaId={selectedOrmawaId}>
        <Component {...props} />
      </SuperAdminOrmawaOverrideProvider>
    )
  }
}

// Provider untuk override ormawaId di auth store
function SuperAdminOrmawaOverrideProvider({ ormawaId, children }) {
  // Set secara sinkronus agar child component langsung mendapatkan ormawaId pada render pertama
  if (ormawaId) {
    window.__SUPER_ADMIN_ORMAWA_ID_OVERRIDE__ = ormawaId
  }

  useEffect(() => {
    return () => {
      // Cleanup ketika unmount
      window.__SUPER_ADMIN_ORMAWA_ID_OVERRIDE__ = null
    }
  }, [])

  return <>{children}</>
}
