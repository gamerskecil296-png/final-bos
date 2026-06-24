import React from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import useThemeStore from '../../store/useThemeStore';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const { theme } = useThemeStore();

  // Text colors for dark background
  const textColor = 'var(--theme-text-on-primary)';
  const mutedColor = 'var(--theme-muted-on-primary)';

  const renderBrandText = () => {
    const name = theme?.site_name || 'Bhakti Kencana University';
    const words = name.split(' ');
    if (words.length <= 2) {
      return (
        <div className="flex flex-col leading-tight">
          <span className="font-bold tracking-wide font-headline" style={{ color: textColor }}>
            {words.join(' ')}
          </span>
        </div>
      );
    }
    const firstLine = words.slice(0, 2).join(' ');
    const secondLine = words.slice(2).join(' ');
    return (
      <div className="flex flex-col leading-tight">
        <span className="font-bold tracking-wide font-headline" style={{ color: textColor }}>
          {firstLine}
        </span>
        <span className="text-sm font-medium tracking-wide font-headline" style={{ color: mutedColor }}>
          {secondLine}
        </span>
      </div>
    );
  };

  return (
    <footer
      className="pt-16 pb-8 font-inter"
      style={{
        backgroundColor: 'var(--theme-primary)',
        borderTop: '1px solid color-mix(in srgb, var(--theme-secondary) 20%, transparent)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

          {/* Brand */}
          <div className="space-y-5">
            <Link to="/" className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl p-1 flex items-center justify-center border"
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
            <p className="text-sm leading-relaxed" style={{ color: mutedColor }}>
              Membangun tenaga kesehatan unggul, kompeten, dan berkarakter mulia untuk Indonesia.
            </p>
            <div className="flex gap-3">
              <a
                href="https://bku.ac.id"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-text-on-primary) 5%, transparent)',
                  color: mutedColor,
                  border: '1px solid color-mix(in srgb, var(--theme-text-on-primary) 10%, transparent)'
                }}
              >
                <Globe className="size-4" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest font-headline" style={{ color: 'var(--theme-secondary)' }}>
              Tautan Cepat
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link 
                  to="/" 
                  className="transition-colors hover:text-[var(--theme-text-on-primary)]"
                  style={{ color: mutedColor }}
                >
                  Beranda
                </Link>
              </li>
              <li>
                <Link 
                  to="/about" 
                  className="transition-colors hover:text-[var(--theme-text-on-primary)]"
                  style={{ color: mutedColor }}
                >
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link 
                  to="/academic" 
                  className="transition-colors hover:text-[var(--theme-text-on-primary)]"
                  style={{ color: mutedColor }}
                >
                  Akademik
                </Link>
              </li>
              <li>
                <Link 
                  to="/services" 
                  className="transition-colors hover:text-[var(--theme-text-on-primary)]"
                  style={{ color: mutedColor }}
                >
                  Fasilitas
                </Link>
              </li>
              <li>
                <Link 
                  to="/login" 
                  className="transition-colors hover:text-[var(--theme-text-on-primary)]"
                  style={{ color: mutedColor }}
                >
                  Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* contact */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest font-headline" style={{ color: 'var(--theme-secondary)' }}>
              Kontak
            </h3>
            <div className="space-y-2.5 text-sm" style={{ color: mutedColor }}>
              <p>Jl. Soekarno Hatta No. 754</p>
              <p>Kota Bandung, Jawa Barat</p>
              <p>(022) 7806123</p>
              <p>info@bku.ac.id</p>
            </div>
          </div>

          {/* Sertifikasi */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest font-headline" style={{ color: 'var(--theme-secondary)' }}>
              Akreditasi
            </h3>
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text-on-primary) 5%, transparent)' }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: textColor }}>ISO 21001:2018</p>
                <p className="text-[10px]" style={{ color: mutedColor }}>Sistem Manajemen Pendidikan</p>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: textColor }}>Akreditasi BAN-PT</p>
                <p className="text-[10px]" style={{ color: mutedColor }}>Terakreditasi Baik Sekali</p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom */}
        <div
          className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{
            borderTop: '1px solid color-mix(in srgb, var(--theme-text-on-primary) 10%, transparent)',
            color: mutedColor
          }}
        >
          <p>&copy; {currentYear} {theme?.site_name || 'Universitas Bhakti Kencana'}. Hak Cipta Dilindungi.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:opacity-80 transition-opacity">Privasi</Link>
            <Link to="/terms" className="hover:opacity-80 transition-opacity">Ketentuan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}