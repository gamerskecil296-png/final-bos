import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Sparkles } from 'lucide-react'

export default function HeroSection({ settings }) {
  // Parse dynamic settings
  const titleText = settings?.hero_title || 'Bentuk Masa Depanmu Bersama UBK';
  const subtitleText = settings?.hero_subtitle || 'Universitas Bhakti Kencana hadir dengan 8 kampus tersebar di Jawa dan Lombok, siap mencetak generasi unggul, mandiri, dan berkarakter melalui 30+ program studi terakreditasi.';
  const isPmbOpen = settings?.is_pmb_open ?? true;
  
  let stats = [
    { value: '30+', label: 'Program Studi' },
    { value: '8', label: 'Kampus Tersebar' },
    { value: '10.000+', label: 'Mahasiswa Aktif' },
    { value: 'A', label: 'Akreditasi' },
  ];

  if (settings?.stats_json) {
    try {
      const parsed = JSON.parse(settings.stats_json);
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        stats = parsed;
      }
    } catch (e) {
      console.error("Failed to parse stats", e);
    }
  }

  // Split title to style the last part if possible
  const words = titleText.split(' ');
  let titleFirst = titleText;
  let titleSecond = '';
  if (words.length > 2) {
    titleSecond = words.slice(-2).join(' ');
    titleFirst = words.slice(0, -2).join(' ');
  } else if (words.length === 2) {
    titleSecond = words[1];
    titleFirst = words[0];
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="/images/unnamed.webp"
          alt="Kampus UBK"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[var(--landing-primary)]/70" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[var(--landing-secondary)]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
        <div className="max-w-3xl">
          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-headline text-white leading-[1.1] mb-6"
          >
            {titleFirst}{' '}
            {titleSecond && (
              <span className="text-[var(--landing-secondary)]">
                {titleSecond}
              </span>
            )}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-white/70 leading-relaxed max-w-2xl mb-10 whitespace-pre-line"
          >
            {subtitleText}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            {isPmbOpen && (
              <Link
                to="/daftar-pkkmb"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white bg-[var(--landing-secondary)] hover:bg-[#B8973E] transition-all hover:scale-105 active:scale-95"
              >
                Daftar Sekarang
                <ChevronRight className="size-5" />
              </Link>
            )}
            <Link
              to="/tentang"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white border-2 border-white/30 hover:border-white/60 hover:bg-white/10 transition-all"
            >
              Jelajahi Kampus
            </Link>
          </motion.div>

          {/* Stats Row */}
          {stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-8 mt-16 pt-8 border-t border-white/10"
            >
              {stats.map((stat, index) => (
                <div key={index}>
                  <p className="text-xl sm:text-2xl font-extrabold font-headline text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm text-white/50 font-medium">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center pt-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
        </motion.div>
      </motion.div>
    </section>
  )
}
