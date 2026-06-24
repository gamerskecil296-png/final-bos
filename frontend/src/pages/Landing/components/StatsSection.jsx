import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import * as Icons from 'lucide-react'

// Default fallback data
const defaultStats = [
  { icon: 'GraduationCap', value: '30+', label: 'Program Studi' },
  { icon: 'Building2', value: '8', label: 'Kampus Tersebar' },
  { icon: 'Users', value: '10.000+', label: 'Mahasiswa Aktif' },
  { icon: 'Award', value: 'A', label: 'Akreditasi Institusi' },
  { icon: 'BookOpen', value: '200+', label: 'Dosen Berkualitas' },
  { icon: 'Globe', value: '50+', label: 'Mitra Kerja Sama' },
]

function StatCard({ iconName, value, label, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  
  // Resolve icon from string name
  const Icon = Icons[iconName] || Icons.CircleDot

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
    >
      <div className="size-12 rounded-xl bg-[var(--landing-primary)]/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="size-6 text-[var(--landing-primary)]" />
      </div>
      <p className="text-2xl font-extrabold font-headline text-[var(--landing-primary)] mb-1">
        {value}
      </p>
      <p className="text-sm text-slate-500 font-medium">{label}</p>
    </motion.div>
  )
}

export default function StatsSection({ settings }) {
  const title = settings?.stats_section_title || 'Fakta & Angka'
  const subtitle = settings?.stats_section_subtitle || 'UBK dalam Angka'
  const desc = settings?.stats_section_desc || 'Berbagai pencapaian dan pertumbuhan yang telah kami raih dalam perjalanan menjadi universitas terkemuka.'
  
  let statsList = defaultStats
  if (settings?.stats_section_items) {
    try {
      const parsed = JSON.parse(settings.stats_section_items)
      if (Array.isArray(parsed) && parsed.length > 0) {
        statsList = parsed
      }
    } catch (e) {
      console.error("Failed to parse stats items", e)
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {statsList.map((stat, i) => (
            <StatCard key={i} iconName={stat.icon} value={stat.value} label={stat.label} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
