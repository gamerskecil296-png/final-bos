import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'

const defaultPrograms = [
  {
    faculty: 'Fakultas Ilmu Kesehatan',
    icon: 'Heart',
    color: 'bg-[var(--landing-primary)]',
    programs: ['Keperawatan (S1)', 'Farmasi (S1)', 'Kebidanan (D3)'],
  },
  {
    faculty: 'Fakultas Ilmu Sosial & Humaniora',
    icon: 'BookOpen',
    color: 'bg-[var(--landing-primary)]',
    programs: ['Psikologi (S1)', 'Ilmu Komunikasi (S1)', 'Hukum (S1)'],
  },
  {
    faculty: 'Fakultas Sains & Teknologi',
    icon: 'Microscope',
    color: 'bg-[var(--landing-primary)]',
    programs: ['Informatika (S1)', 'Sistem Informasi (S1)', 'Bioteknologi (S1)'],
  },
  {
    faculty: 'Fakultas Ekonomi & Bisnis',
    icon: 'Scale',
    color: 'bg-[var(--landing-primary)]',
    programs: ['Manajemen (S1)', 'Akuntansi (S1)', 'Ekonomi Syariah (S1)'],
  },
  {
    faculty: 'Fakultas Pendidikan & Keguruan',
    icon: 'Computer',
    color: 'bg-[var(--landing-primary)]',
    programs: ['PGSD (S1)', 'PAUD (S1)', 'Bimbingan Konseling (S1)'],
  },
  {
    faculty: 'Program Profesi',
    icon: 'Building2',
    color: 'bg-[var(--landing-primary)]',
    programs: ['Profesi Ners', 'Profesi Apoteker', 'Profesi Psikolog'],
  },
]

function ProgramCard({ faculty, icon: iconName, color, programs, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const Icon = Icons[iconName] || Icons.CircleDot

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
    >
      <div className={`h-2 ${color}`} />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`size-10 rounded-xl ${color} flex items-center justify-center`}>
            <Icon className="size-5 text-white" />
          </div>
          <h3 className="font-bold font-headline text-[var(--landing-primary)] text-base">
            {faculty}
          </h3>
        </div>
        <ul className="space-y-2">
          {programs?.map((prog) => (
            <li key={prog} className="flex items-center gap-2 text-sm text-slate-600">
              <div className="size-1.5 rounded-full bg-[var(--landing-secondary)]" />
              {prog}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

export default function ProgramsSection({ settings }) {
  const title = settings?.programs_title || 'Program Akademik'
  const subtitle = settings?.programs_subtitle || 'Program Studi Unggulan'
  const desc = settings?.programs_desc || 'Beragam program studi terakreditasi yang dirancang untuk menyongsong karir masa depan.'
  
  let programsList = defaultPrograms
  if (settings?.programs_items) {
    try {
      const parsed = JSON.parse(settings.programs_items)
      if (Array.isArray(parsed) && parsed.length > 0) {
        programsList = parsed
      }
    } catch (e) {
      console.error("Failed to parse programs items", e)
    }
  }

  return (
    <section className="py-16 lg:py-24">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {programsList.map((prog, i) => (
            <ProgramCard key={i} {...prog} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link
            to="/program-studi"
            className="inline-flex items-center gap-2 text-[var(--landing-primary)] font-bold hover:gap-3 transition-all"
          >
            Lihat Semua Program Studi
            <Icons.ChevronRight className="size-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
