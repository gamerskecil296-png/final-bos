import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchWithAuth, API_BASE_URL } from '../services/api'

const ORMAWA_CHANGE_EVENT = 'superadmin-ormawa-change'
const STORAGE_KEY = 'superadmin_ormawa_id'

const SuperAdminOrmawaContext = createContext()

export function useSuperAdminOrmawa() {
  const context = useContext(SuperAdminOrmawaContext)
  if (!context) {
    throw new Error('useSuperAdminOrmawa must be used within SuperAdminOrmawaProvider')
  }
  return context
}

export function SuperAdminOrmawaProvider({ children }) {
  const [selectedOrmawaId, setSelectedOrmawaId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || null
  })
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrmawa, setSelectedOrmawa] = useState(null)

  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoading(true)
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/admin/ormawa`)
        if (res.status === 'success') {
          const orgs = res.data || []
          setOrganizations(orgs)

          const savedId = localStorage.getItem(STORAGE_KEY)
          if (savedId) {
            const matched = orgs.find(o => String(o.ID || o.id) === String(savedId))
            if (matched) {
              setSelectedOrmawaId(matched.ID || matched.id)
              setSelectedOrmawa(matched)
              return
            }
          }

          if (orgs.length > 0) {
            const firstId = orgs[0].ID || orgs[0].id
            setSelectedOrmawaId(firstId)
            setSelectedOrmawa(orgs[0])
            localStorage.setItem(STORAGE_KEY, String(firstId))
          }
        }
      } catch (err) {
        console.error('Gagal load ormawa:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrganizations()
  }, [])

  // Sync selectedOrmawa when id or list changes
  useEffect(() => {
    if (selectedOrmawaId && organizations.length > 0) {
      const ormawa = organizations.find(o => String(o.ID || o.id) === String(selectedOrmawaId))
      setSelectedOrmawa(ormawa || null)
    }
  }, [selectedOrmawaId, organizations])

  // Listen for cross-tab storage changes + custom intra-tab events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        const newId = e.newValue
        if (newId && String(newId) !== String(selectedOrmawaId)) {
          setSelectedOrmawaId(newId)
        }
      }
    }
    const handleCustomEvent = (e) => {
      const newId = e.detail
      if (newId && String(newId) !== String(selectedOrmawaId)) {
        setSelectedOrmawaId(newId)
      }
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(ORMAWA_CHANGE_EVENT, handleCustomEvent)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(ORMAWA_CHANGE_EVENT, handleCustomEvent)
    }
  }, [selectedOrmawaId])

  const handleOrmawaChange = useCallback((newOrmawaId) => {
    setSelectedOrmawaId(newOrmawaId)
    if (newOrmawaId) {
      localStorage.setItem(STORAGE_KEY, String(newOrmawaId))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    window.dispatchEvent(new CustomEvent(ORMAWA_CHANGE_EVENT, { detail: newOrmawaId }))
  }, [])

  return (
    <SuperAdminOrmawaContext.Provider
      value={{
        selectedOrmawaId,
        setSelectedOrmawaId: handleOrmawaChange,
        organizations,
        loading,
        selectedOrmawa
      }}
    >
      {children}
    </SuperAdminOrmawaContext.Provider>
  )
}

