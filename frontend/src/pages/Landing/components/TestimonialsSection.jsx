import { motion } from 'framer-motion'
import { useRef } from 'react'
import { useInView } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const defaultTestimonials = [
  {
    name: 'Aulia Rahman',
    role: 'Alumni Psikologi 2023',
    image: null,
    content:
      'Kuliah di UBK memberikan pengalaman luar biasa. Dosen-dosennya sangat mendukung dan fasilitas kampusnya lengkap. Saya bangga menjadi bagian dari Bhakti Kencana.',
  },
  {
    name: 'Dewi Sartika',
    role: 'Mahasiswi Keperawatan',
    image: null,
    content:
      'Program keperawatan UBK sangat berkualitas. Praktikum di rumah sakit mitra memberikan pengalaman nyata yang sangat berharga untuk persiapan karir.',
  },
  {
    name: 'Rizky Pratama',
    role: 'Alumni Informatika 2024',
    image: null,
    content:
      'Berkat bekal ilmu dan soft skill yang diajarkan di UBK, saya berhasil bekerja di perusahaan teknologi ternama. Kampus ini benar-benar mencetak lulusan siap kerja.',
  },
]

function TestimonialCard({ name, role, content, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="relative p-8 rounded-2xl bg-white border border-slate-100 shadow-sm"
    >
      <Quote className="size-8 text-[var(--landing-secondary)]/20 absolute top-6 right-6" />
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="size-4 fill-[var(--landing-secondary)] text-[var(--landing-secondary)]" />
        ))}
      </div>
      <p className="text-slate-600 leading-relaxed mb-6">&ldquo;{content}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-[var(--landing-primary)] flex items-center justify-center text-white font-bold text-sm">
          {name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <p className="font-bold text-sm text-slate-800">{name}</p>
          <p className="text-xs text-slate-400">{role}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function TestimonialsSection({ settings }) {
  const title = settings?.testimonials_title || 'Testimoni'
  const subtitle = settings?.testimonials_subtitle || 'Kata Mereka tentang UBK'
  const desc = settings?.testimonials_desc || 'Pengalaman dari alumni dan mahasiswa yang telah merasakan langsung pendidikan di Universitas Bhakti Kencana.'
  
  let testimonialsList = defaultTestimonials
  if (settings?.testimonials_items) {
    try {
      const parsed = JSON.parse(settings.testimonials_items)
      if (Array.isArray(parsed) && parsed.length > 0) {
        testimonialsList = parsed
      }
    } catch (e) {
      console.error("Failed to parse testimonials items", e)
    }
  }

  return (
    <section className="py-16 lg:py-24 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--landing-secondary)] mb-3">
            {title}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-headline text-[var(--landing-primary)]">
            {subtitle}
          </h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">
            {desc}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonialsList.map((t, i) => (
            <TestimonialCard key={i} {...t} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
