import { motion } from 'framer-motion'
import { useRef } from 'react'
import { useInView } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react'

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

export default function Kontak() {
  const { settings } = useOutletContext() || {};

  const title = settings?.kontak_title || 'Hubungi Kami';
  const subtitle = settings?.kontak_subtitle || 'Punya pertanyaan? Kami siap membantu Anda.';
  const address = settings?.kontak_address || 'Jl. Soekarno Hatta No. 754, Bandung 40286';
  const emails = (settings?.kontak_email || 'info@ubk.ac.id, pmb@ubk.ac.id').split(',').map(s => s.trim()).filter(Boolean);
  const phones = (settings?.kontak_phone || '(022) 1234-5678, (022) 5678-1234').split(',').map(s => s.trim()).filter(Boolean);
  const jamOpr = (settings?.kontak_jam_opr || 'Senin - Jumat: 08.00 - 16.00\nSabtu: 08.00 - 12.00').split('\n').filter(Boolean);

  let locations = [];
  try {
    const parsed = JSON.parse(settings?.locations_items || '[]');
    if (Array.isArray(parsed)) {
      locations = parsed;
    }
  } catch(e) {}
  if (!locations || !locations.length) {
    locations = [
      { name: 'Kampus Bandung (Pusat)', address: 'Jl. Soekarno Hatta No. 754, Bandung 40286', contact: '(022) 1234-5678' }
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

      {/* Contact Form & Info */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <AnimatedSection>
              <h2 className="text-2xl font-extrabold font-headline text-[var(--landing-primary)] mb-6">
                Kirim Pesan
              </h2>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Anda"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[var(--landing-primary)] focus:ring-4 focus:ring-[var(--landing-primary)]/5 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="email@anda.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[var(--landing-primary)] focus:ring-4 focus:ring-[var(--landing-primary)]/5 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Subjek
                  </label>
                  <input
                    type="text"
                    placeholder="Subjek pesan"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[var(--landing-primary)] focus:ring-4 focus:ring-[var(--landing-primary)]/5 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Pesan
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Tulis pesan Anda..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[var(--landing-primary)] focus:ring-4 focus:ring-[var(--landing-primary)]/5 transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-[var(--landing-primary)] hover:bg-[#152F58] transition-all hover:scale-105 active:scale-95"
                >
                  <Send className="size-4" />
                  Kirim Pesan
                </button>
              </form>
            </AnimatedSection>

            {/* Info */}
            <AnimatedSection>
              <h2 className="text-2xl font-extrabold font-headline text-[var(--landing-primary)] mb-6">
                Informasi Kontak
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="size-12 rounded-xl bg-[var(--landing-primary)]/5 flex items-center justify-center shrink-0">
                    <MapPin className="size-6 text-[var(--landing-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 mb-1">Kantor Pusat</h3>
                    <p className="text-sm text-slate-500">
                      {address}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="size-12 rounded-xl bg-[var(--landing-primary)]/5 flex items-center justify-center shrink-0">
                    <Phone className="size-6 text-[var(--landing-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 mb-1">Telepon</h3>
                    {phones.map((p, i) => <p key={i} className="text-sm text-slate-500">{p}</p>)}
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="size-12 rounded-xl bg-[var(--landing-primary)]/5 flex items-center justify-center shrink-0">
                    <Mail className="size-6 text-[var(--landing-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 mb-1">Email</h3>
                    {emails.map((e, i) => <p key={i} className="text-sm text-slate-500">{e}</p>)}
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="size-12 rounded-xl bg-[var(--landing-primary)]/5 flex items-center justify-center shrink-0">
                    <Clock className="size-6 text-[var(--landing-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 mb-1">Jam Operasional</h3>
                    {jamOpr.map((jam, i) => <p key={i} className="text-sm text-slate-500">{jam}</p>)}
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Campus Locations */}
      <section className="py-16 lg:py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--landing-secondary)] mb-3">
              Lokasi Kampus
            </p>
            <h2 className="text-2xl font-extrabold font-headline text-[var(--landing-primary)]">
              Temukan Kampus Terdekat
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {locations.map((loc, idx) => (
              <AnimatedSection key={idx}>
                <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-lg transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <MapPin className="size-5 text-[var(--landing-secondary)] shrink-0 mt-0.5" />
                    <h3 className="font-bold font-headline text-[var(--landing-primary)]">{loc.name}</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-2 ml-8">{loc.address}</p>
                  {loc.contact && (
                    <div className="ml-8 space-y-1">
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <Phone className="size-3" /> {loc.contact}
                      </p>
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
