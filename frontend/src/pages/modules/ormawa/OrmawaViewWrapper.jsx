import React, { useState, useEffect } from 'react'
import { OrmawaSelector } from './components/OrmawaSelector'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

/**
 * Wrapper component untuk halaman ormawa di Super Admin
 * Menambahkan dropdown selector ormawa di header
 */
export function OrmawaViewWrapper({ children, title = "Dashboard Ormawa" }) {
  const [selectedOrmawaId, setSelectedOrmawaId] = useState(null)

  // Pass selectedOrmawaId ke children component via React context or props
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { ormawaIdOverride: selectedOrmawaId })
    }
    return child
  })

  return (
    <PageContent>
      <DashboardHero
        title={title}
        subtitle="Sebagai Super Admin, pilih organisasi untuk melihat data spesifik"
        icon="admin_panel_settings"
        actions={
          <OrmawaSelector 
            value={selectedOrmawaId} 
            onChange={setSelectedOrmawaId}
            className="w-full md:w-auto"
          />
        }
      />

        {/* Content dari halaman ormawa */}
        {selectedOrmawaId ? (
          childrenWithProps
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '32px' }}>
                groups
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600">
              Pilih organisasi untuk melihat dashboard
            </p>
          </div>
        )}
    </PageContent>
  )
}
