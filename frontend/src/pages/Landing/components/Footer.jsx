import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, ChevronRight } from 'lucide-react'
import { FaInstagram, FaYoutube, FaFacebook, FaTwitter, FaLinkedin, FaTiktok } from 'react-icons/fa6'

const campuses = [
  { name: 'Kampus Bandung', address: 'Jl. Soekarno Hatta No. 754, Bandung' },
  { name: 'Kampus Jakarta', address: 'Jl. Raya Ciputat Parung No. 21, Jakarta Selatan' },
  { name: 'Kampus Garut', address: 'Jl. Raya Garut - Tasikmalaya Km. 23' },
  { name: 'Kampus Tasikmalaya', address: 'Jl. Raya Timur No. 89, Tasikmalaya' },
  { name: 'Kampus Subang', address: 'Jl. Raya Subang - Cirebon Km. 12' },
  { name: 'Kampus Serang', address: 'Jl. Raya Serang - Pandeglang Km. 5' },
  { name: 'Kampus Kendal', address: 'Jl. Raya Kendal - Semarang Km. 8' },
  { name: 'Kampus Mataram', address: 'Jl. Raya Mataram - Lombok Barat' },
]

const programs = [
  { name: 'Sarjana (S1)', path: '/program-studi' },
  { name: 'Diploma (D3)', path: '/program-studi' },
  { name: 'Profesi', path: '/program-studi' },
]

export default function Footer({ settings }) {
  const desc = settings?.footer_desc || 'Menjadi universitas unggulan dalam pengembangan ilmu pengetahuan, teknologi, dan seni yang berkarakter pada tahun 2035.';
  const copyright = settings?.footer_copyright || 'Universitas Bhakti Kencana. All rights reserved.';
  
  const socialLinks = (() => {
    try {
      const parsed = JSON.parse(settings?.footer_socials || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  
  const campusList = (() => {
    try {
      const parsed = JSON.parse(settings?.locations_items || '[]');
      return Array.isArray(parsed) ? parsed : campuses;
    } catch {
      return campuses;
    }
  })();
  
  // We only show first 8 campuses
  const displayCampuses = campusList.slice(0, 8);

  const getSocialIcon = (platform) => {
    switch(platform?.toLowerCase()) {
      case 'instagram': return <FaInstagram className="size-4" />;
      case 'youtube': return <FaYoutube className="size-4" />;
      case 'facebook': return <FaFacebook className="size-4" />;
      case 'twitter': return <FaTwitter className="size-4" />;
      case 'linkedin': return <FaLinkedin className="size-4" />;
      case 'tiktok': return <FaTiktok className="size-4" />;
      default: return <span className="text-xs font-bold uppercase">{platform?.[0]}</span>;
    }
  };

  return (
    <footer className="bg-[var(--landing-primary)] text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/bku logo.png"
                alt="UBK"
                className="h-10 w-auto brightness-0 invert"
              />
              <div>
                <h3 className="text-lg font-headline font-bold leading-tight text-white">
                  Universitas Bhakti Kencana
                </h3>
                <p className="text-[11px] text-white/60 font-medium tracking-wider">
                  UNGGUL · MANDIRI · BERKARAKTER
                </p>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              {desc}
            </p>
            <div className="flex gap-3">
              {socialLinks.length > 0 ? socialLinks.map((soc, i) => (
                <a
                  key={i}
                  href={soc.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white/70 hover:text-white"
                  title={soc.platform}
                >
                  {getSocialIcon(soc.platform)}
                </a>
              )) : (
                ['instagram', 'youtube', 'facebook', 'twitter'].map((soc) => (
                  <a
                    key={soc}
                    href="#"
                    className="size-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white/70 hover:text-white"
                  >
                    {getSocialIcon(soc)}
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Campuses */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-5 text-[var(--landing-secondary)]">
              Kampus Kami
            </h4>
            <ul className="space-y-3">
              {displayCampuses.map((campus) => (
                <li key={campus.name}>
                  <div className="flex items-start gap-2">
                    <MapPin className="size-4 text-white/40 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">{campus.name}</p>
                      <p className="text-xs text-white/50">{campus.address || campus.desc}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Programs */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-5 text-[var(--landing-secondary)]">
              Program Akademik
            </h4>
            <ul className="space-y-3">
              {programs.map((prog) => (
                <li key={prog.name}>
                  <Link
                    to={prog.path}
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors group"
                  >
                    <ChevronRight className="size-3 text-[var(--landing-secondary)] group-hover:translate-x-0.5 transition-transform" />
                    {prog.name}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="text-sm font-bold uppercase tracking-widest mb-5 mt-8 text-[var(--landing-secondary)]">
              Lainnya
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Berita', path: '/berita' },
                { label: 'Tentang Kami', path: '/tentang' },
                { label: 'Kontak', path: '/kontak' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors group"
                  >
                    <ChevronRight className="size-3 text-[var(--landing-secondary)] group-hover:translate-x-0.5 transition-transform" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-5 text-[var(--landing-secondary)]">
              Hubungi Kami
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="size-5 text-[var(--landing-secondary)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">Telepon</p>
                  <p className="text-sm text-white/60">{settings?.kontak_phone || '(022) 1234-5678'}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="size-5 text-[var(--landing-secondary)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">Email</p>
                  <p className="text-sm text-white/60">{settings?.kontak_email || 'info@ubk.ac.id'}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="size-5 text-[var(--landing-secondary)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">Kantor Pusat</p>
                  <p className="text-sm text-white/60">
                    {settings?.kontak_address || 'Jl. Soekarno Hatta No. 754, Bandung 40286'}
                  </p>
                </div>
              </li>
            </ul>


          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/40">
              &copy; {new Date().getFullYear()} {copyright}
            </p>
            <div className="flex items-center gap-6">
              <Link to="/kebijakan-privasi" className="text-xs text-white/40 hover:text-white/60 transition-colors">
                Kebijakan Privasi
              </Link>
              <Link to="/syarat-ketentuan" className="text-xs text-white/40 hover:text-white/60 transition-colors">
                Syarat & Ketentuan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
