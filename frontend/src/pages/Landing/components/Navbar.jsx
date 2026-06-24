import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronDown } from 'lucide-react'

const navLinks = [
  { label: 'Beranda', path: '/' },
  { label: 'Tentang', path: '/tentang' },
  { label: 'Program Studi', path: '/program-studi' },
  { label: 'Berita', path: '/berita' },
  { label: 'Kontak', path: '/kontak' },
]

export default function Navbar({ settings }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location])

  const isLightPage = [
    '/kebijakan-privasi', 
    '/syarat-ketentuan'
  ].includes(location.pathname) || location.pathname.startsWith('/berita/')
  const isSolid = scrolled || isLightPage
  const isPmbOpen = settings?.is_pmb_open ?? true;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isSolid
          ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/images/bku logo.png"
              alt="UBK"
              className="h-10 w-auto"
            />
            <div className="hidden sm:block">
              <h1 className={`text-lg font-headline font-bold leading-tight transition-colors ${
                isSolid ? 'text-[var(--landing-primary)]' : 'text-white'
              }`}>
                Universitas Bhakti Kencana
              </h1>
              <p className={`text-[11px] font-medium tracking-wider transition-colors ${
                isSolid ? 'text-[var(--theme-text-muted)]' : 'text-white/70'
              }`}>
                UNGGUL · MANDIRI · BERKARAKTER
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? isSolid
                        ? 'text-[var(--landing-primary)] bg-[var(--landing-primary)]/5'
                        : 'text-white bg-white/15'
                      : isSolid
                        ? 'text-slate-700 hover:text-[var(--landing-primary)] hover:bg-slate-100'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <div className="ml-4 flex items-center gap-3">
              <Link
                to="/login"
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isSolid
                    ? 'text-[var(--landing-primary)] border-2 border-[var(--landing-primary)] hover:bg-[var(--landing-primary)] hover:text-white'
                    : 'text-white border-2 border-white/40 hover:border-white hover:bg-white/10'
                }`}
              >
                Masuk
              </Link>
              {isPmbOpen && (
                <Link
                  to="/daftar-pkkmb"
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
                    isSolid
                      ? 'bg-[var(--landing-primary)] hover:bg-[#152F58]'
                      : 'bg-[var(--landing-secondary)] hover:bg-[#B8973E]'
                  }`}
                >
                  Daftar
                </Link>
              )}
            </div>
          </nav>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden p-2 rounded-xl transition-colors ${
              isSolid ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
            }`}
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-slate-200 shadow-lg overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'text-[var(--landing-primary)] bg-[var(--landing-primary)]/5'
                        : 'text-slate-700 hover:text-[var(--landing-primary)] hover:bg-slate-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
              <div className="pt-3 flex gap-3">
                <Link
                  to="/login"
                  className="flex-1 text-center px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-[var(--landing-primary)] text-[var(--landing-primary)] hover:bg-[var(--landing-primary)] hover:text-white transition-all"
                >
                Masuk
                </Link>
                {isPmbOpen && (
                  <Link
                    to="/daftar-pkkmb"
                    className="flex-1 text-center px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[var(--landing-primary)] hover:bg-[#152F58] transition-all"
                  >
                    Daftar
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
