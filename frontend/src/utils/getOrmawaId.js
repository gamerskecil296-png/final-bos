import React from 'react'
import useAuthStore from '../store/useAuthStore'

export function getOrmawaId() {
  if (window.__SUPER_ADMIN_ORMAWA_ID_OVERRIDE__) {
    return window.__SUPER_ADMIN_ORMAWA_ID_OVERRIDE__
  }

  const state = useAuthStore.getState()
  const ormawaId = (
    state?.user?.ormawa_id ||
    state?.user?.OrmawaID ||
    null
  )
  return ormawaId
}

/**
 * React hook untuk get ormawa ID yang reactive
 * Akan re-render component ketika ormawaId berubah
 */
export function useOrmawaId() {
  const [ormawaId, setOrmawaId] = React.useState(() => getOrmawaId())
  
  React.useEffect(() => {
    // Listen untuk perubahan window global override
    const checkOverride = () => {
      const newId = getOrmawaId()
      if (newId !== ormawaId) {
        setOrmawaId(newId)
      }
    }
    
    // Check setiap 100ms untuk perubahan
    const interval = setInterval(checkOverride, 100)
    
    return () => clearInterval(interval)
  }, [ormawaId])
  
  return ormawaId
}
