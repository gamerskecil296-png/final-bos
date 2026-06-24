import { motion } from 'framer-motion'
import { useRef } from 'react'
import { useInView } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { Target, Eye, Award, MapPin } from 'lucide-react'

import LocationsSection from '../components/LocationsSection'

function AnimatedSection({ children, className }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function Tentang() {
  const { settings } = useOutletContext() || {};

  const title = settings?.tentang_title || 'Tentang Universitas Bhakti Kencana';
  const subtitle = settings?.tentang_subtitle || 'Menjadi universitas unggulan dalam pengembangan ilmu pengetahuan, teknologi, dan seni yang berkarakter pada tahun 2035.';
  const visi = settings?.tentang_visi || 'Menjadi Universitas yang unggul dalam pengembangan ilmu pengetahuan, teknologi, dan seni yang berkarakter serta berdaya saing global pada tahun 2035.';
  
  let misi = [];
  try {
    const parsed = JSON.parse(settings?.tentang_misi || '[]');
    misi = Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    misi = (settings?.tentang_misi || '').split('\n').filter(Boolean);
  }
  if (!misi.length) {
    misi = [
      'Menyelenggarakan pendidikan tinggi yang bermutu dan berkarakter.',
      'Melaksanakan penelitian yang inovatif dan bermanfaat bagi masyarakat.',
      'Melaksanakan pengabdian kepada masyarakat berbasis ilmu pengetahuan.',
      'Mengembangkan tata kelola universitas yang profesional dan akuntabel.',
      'Memperkuat jejaring kerja sama nasional dan internasional.',
    ];
  }

  const sejarahLines = (settings?.tentang_sejarah || 'Universitas Bhakti Kencana (UBK) didirikan pada tahun 2005...').split('\n').filter(Boolean);

  let leaders = [];
  try {
    const parsed = JSON.parse(settings?.tentang_leaders || '[]');
    if (Array.isArray(parsed)) {
      leaders = parsed;
    }
  } catch (e) {}
  if (!leaders || !leaders.length) {
    leaders = [
      { name: 'Prof. Dr. H. Ahmad Fauzi, M.Pd.', role: 'Rektor' },
      { name: 'Dr. Hj. Siti Nurjanah, S.Kp., M.Kes.', role: 'Wakil Rektor I' },
      { name: 'Dr. Agus Wijaya, S.E., M.M.', role: 'Wakil Rektor II' },
      { name: 'Dr. Rina Marlina, S.Psi., M.Psi.', role: 'Wakil Rektor III' },
    ];
  }

  return (
    <>
      {/* Header */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/unnamed.webp" alt="Kampus" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[var(--landing-primary)]/70" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl font-extrabold font-headline text-white mb-4"
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-lg max-w-2xl mx-auto"
          >
            {subtitle}
          </motion.p>
        </div>
      </section>

      {/* Visi & Misi */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <AnimatedSection className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="size-14 rounded-xl bg-[var(--landing-primary)]/5 flex items-center justify-center mb-5">
                <Eye className="size-7 text-[var(--landing-primary)]" />
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-[var(--landing-primary)] mb-4">Visi</h2>
              <p className="text-slate-600 leading-relaxed">
                {visi}
              </p>
            </AnimatedSection>

            <AnimatedSection className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="size-14 rounded-xl bg-[var(--landing-primary)]/5 flex items-center justify-center mb-5">
                <Target className="size-7 text-[var(--landing-primary)]" />
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-[var(--landing-primary)] mb-4">Misi</h2>
              <ul className="space-y-3 text-slate-600">
                {misi.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="size-1.5 rounded-full bg-[var(--landing-secondary)] mt-2.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Sejarah */}
      <section className="py-16 lg:py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--landing-secondary)] mb-3">Sejarah</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-headline text-[var(--landing-primary)] mb-6">
              Perjalanan Kami
            </h2>
            <div className="text-slate-600 leading-relaxed space-y-4 text-left">
              {sejarahLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Pimpinan */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--landing-secondary)] mb-3">
              Pimpinan
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-headline text-[var(--landing-primary)]">
              Pimpinan Universitas
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {leaders.map((leader, i) => (
              <AnimatedSection key={leader.name}>
                <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm text-center group hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="size-20 rounded-full bg-[var(--landing-primary)] flex items-center justify-center mx-auto mb-4">
                    <Award className="size-8 text-white" />
                  </div>
                  <h3 className="font-bold font-headline text-[var(--landing-primary)] text-sm mb-1">
                    {leader.name}
                  </h3>
                  <p className="text-xs text-[var(--landing-secondary)] font-semibold">{leader.role}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <LocationsSection settings={settings} hideLink={true} />
    </>
  )
}
