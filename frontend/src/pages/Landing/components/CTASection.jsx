import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function CTASection({ settings }) {
  const title = settings?.cta_title || 'Mulai Perjalananmu'
  const subtitle = settings?.cta_subtitle || 'Siap Bergabung dengan UBK?'
  const desc = settings?.cta_desc || 'Daftar sekarang dan jadilah bagian dari 10.000+ mahasiswa yang telah memilih Universitas Bhakti Kencana sebagai tempat mengembangkan potensi diri.'
  const buttonText = settings?.cta_button_text || 'Daftar Sekarang'
  const buttonLink = settings?.cta_button_link || '/daftar-pkkmb'
  const isPmbOpen = settings?.is_pmb_open ?? true;

  return (
    <section className="py-16 lg:py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--landing-primary)]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--landing-secondary)]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />

      {/* Pattern */}
      <div className="absolute inset-0 opacity-5 bg-[var(--landing-primary)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--landing-secondary)] mb-4">
            {title}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-headline text-white mb-4">
            {subtitle}
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-10">
            {desc}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {isPmbOpen && (
              <Link
                to={buttonLink}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all hover:scale-105 active:scale-95"
                style={{ background: 'var(--landing-secondary)', color: 'var(--landing-primary)' }}
              >
                {buttonText}
                <ChevronRight className="size-5" />
              </Link>
            )}
            <Link
              to="/kontak"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white border-2 border-white/30 hover:border-white/60 hover:bg-white/10 transition-all"
            >
              Hubungi Kami
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
