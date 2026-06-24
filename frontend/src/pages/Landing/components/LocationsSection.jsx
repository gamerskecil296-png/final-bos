import { motion } from 'framer-motion'
import { useRef } from 'react'
import { useInView } from 'framer-motion'
import { MapPin, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const defaultCampuses = [
  { name: 'Bandung', file: 'bandung.jpg', desc: 'Kampus Pusat' },
  { name: 'Jakarta', file: 'jakarta.jpg', desc: 'Kampus Jakarta' },
  { name: 'Garut', file: 'Garut.jpg', desc: 'Kampus Garut' },
  { name: 'Tasikmalaya', file: 'tasik.jpg', desc: 'Kampus Tasikmalaya' },
  { name: 'Subang', file: 'Subang.jpg', desc: 'Kampus Subang' },
  { name: 'Serang', file: 'serang.jpg', desc: 'Kampus Serang' },
  { name: 'Kendal', file: 'kendal.jpg', desc: 'Kampus Kendal' },
  { name: 'Mataram', file: 'mataram.jpg', desc: 'Kampus Mataram' },
]

function CampusCard({ name, file, desc, address, gmaps_url, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  const imgSrc = file && (file.startsWith('http') || file.startsWith('/')) 
    ? file 
    : `/images/Kampus/${file || 'bandung.jpg'}`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
    >
      <div className="relative h-44 overflow-hidden shrink-0">
        <img
          src={imgSrc}
          alt={`Kampus ${name}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-3 left-4">
          <h3 className="font-bold font-headline text-white text-base">{desc || name}</h3>
          {desc && <p className="text-xs text-white/70">{name}</p>}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col text-sm text-slate-500">
        <div className="flex items-start gap-2">
          <MapPin className="size-4 text-[var(--landing-secondary)] shrink-0 mt-0.5" />
          {gmaps_url ? (
            <a 
              href={gmaps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 hover:text-[var(--landing-primary)] hover:underline transition-colors"
            >
              {address || `Jl. Soekarno Hatta No. 754, ${name}`}
            </a>
          ) : (
            <span className="line-clamp-2">{address || `Jl. Soekarno Hatta No. 754, ${name}`}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function LocationsSection({ settings, hideLink = false }) {
  const title = settings?.locations_title || 'Lokasi'
  const subtitle = settings?.locations_subtitle || '8 Kampus Tersebar'
  const desc = settings?.locations_desc || 'UBK hadir di 8 kota strategis di Pulau Jawa dan Lombok untuk memudahkan akses pendidikan tinggi berkualitas.'
  
  let locationsList = defaultCampuses
  if (settings?.locations_items) {
    try {
      const parsed = JSON.parse(settings.locations_items)
      if (Array.isArray(parsed) && parsed.length > 0) {
        locationsList = parsed
      }
    } catch (e) {
      console.error("Failed to parse locations items", e)
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {locationsList.map((campus, i) => (
            <CampusCard key={i} {...campus} index={i} />
          ))}
        </div>

        {!hideLink && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Link
              to="/tentang"
              className="inline-flex items-center gap-2 text-[var(--landing-primary)] font-bold hover:gap-3 transition-all"
            >
              Lihat Semua Lokasi
              <ChevronRight className="size-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  )
}
