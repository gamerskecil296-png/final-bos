import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

const getStoredAccessToken = () => {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.accessToken || null
  } catch {
    return null
  }
}

axios.defaults.baseURL = import.meta.env.VITE_API_URL || '/api'
axios.defaults.withCredentials = true
axios.interceptors.request.use((config) => {
  const token = getStoredAccessToken()
  if (token) {
    config.headers = config.headers || {}
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

if (typeof window !== 'undefined' && !window.__siakadFetchPatched) {
  const nativeFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input?.url || ''

    const isApiCall = typeof url === 'string' && (url.startsWith('/api') || url.includes('/api/'))
    if (!isApiCall) {
      return nativeFetch(input, init)
    }

    const token = getStoredAccessToken()
    if (!token) {
      return nativeFetch(input, init)
    }

    if (input instanceof Request) {
      const headers = new Headers(input.headers)
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      const req = new Request(input, { headers })
      return nativeFetch(req, init)
    }

    const headers = new Headers(init.headers || {})
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return nativeFetch(input, { ...init, headers })
  }

  window.__siakadFetchPatched = true
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
