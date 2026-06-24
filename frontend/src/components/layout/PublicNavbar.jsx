import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useThemeStore from '../../store/useThemeStore';

export default function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useThemeStore();

  const navLinks = [
    { name: 'Beranda', path: '/' },
    { name: 'Tentang Kami', path: '/about' },
    { name: 'Akademik', path: '/academic' },
    { name: 'Fasilitas', path: '/services' }
  ];

  // Text colors based on dark background
  const textColor = 'var(--theme-text-on-primary)';
  const mutedColor = 'var(--theme-muted-on-primary)';

  const renderBrandText = () => {
    const name = theme?.site_name || 'Bhakti Kencana University';
    const words = name.split(' ');
    if (words.length <= 2) {
      return (
        <div className="flex flex-col leading-tight">
          <span className="text-sm sm:text-base font-bold tracking-wide font-headline" style={{ color: textColor }}>
            {words.join(' ')}
          </span>
        </div>
      );
    }
    const firstLine = words.slice(0, 2).join(' ');
    const secondLine = words.slice(2).join(' ');
    return (
      <div className="flex flex-col leading-tight">
        <span className="text-sm sm:text-base font-bold tracking-wide font-headline" style={{ color: textColor }}>
          {firstLine}
        </span>
        <span className="text-xs sm:text-sm font-medium tracking-wide font-headline" style={{ color: mutedColor }}>
          {secondLine}
        </span>
      </div>
    );
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md shadow-md"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--theme-primary) 95%, transparent)',
        borderBottom: '1px solid color-mix(in srgb, var(--theme-secondary) 20%, transparent)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div
              className="w-11 h-11 rounded-xl p-1 flex items-center justify-center border transition-transform duration-300 group-hover:scale-105"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-text-on-primary) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--theme-text-on-primary) 20%, transparent)'
              }}
            >
              <img
                src={theme?.logo_url || "/images/bku logo.png"}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {renderBrandText()}
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `relative py-2 text-sm font-semibold tracking-wide transition-colors duration-300 font-headline focus:outline-none ${
                    isActive ? 'font-bold' : ''
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--theme-secondary)' : mutedColor
                })}
              >
                {({ isActive }) => (
                  <>
                    {link.name}
                    {isActive && (
                      <motion.span
                        layoutId="activeIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--theme-secondary)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--theme-surface)',
                color: 'var(--theme-primary)'
              }}
            >
              Info PMB
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Mobile Menu */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl border transition-colors"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-text-on-primary) 5%, transparent)',
              borderColor: 'color-mix(in srgb, var(--theme-text-on-primary) 10%, transparent)',
              color: 'var(--theme-text-on-primary)'
            }}
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden"
            style={{
              backgroundColor: 'var(--theme-primary)',
              borderTop: '1px solid color-mix(in srgb, var(--theme-secondary) 15%, transparent)'
            }}
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                      isActive ? 'font-bold' : ''
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'color-mix(in srgb, var(--theme-secondary) 10%, transparent)' : 'transparent',
                    color: isActive ? 'var(--theme-secondary)' : mutedColor,
                    borderLeft: isActive ? '3px solid var(--theme-secondary)' : '3px solid transparent'
                  })}
                >
                  {link.name}
                </NavLink>
              ))}
              <div className="pt-4 border-t" style={{ borderColor: 'color-mix(in srgb, var(--theme-text-on-primary) 10%, transparent)' }}>
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold shadow-md"
                  style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-primary)' }}
                >
                  Info PMB
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}