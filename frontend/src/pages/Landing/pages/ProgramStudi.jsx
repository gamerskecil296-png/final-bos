import { motion } from 'framer-motion'
import { useRef } from 'react'
import { useInView } from 'framer-motion'
import { Link, useOutletContext } from 'react-router-dom'
import * as Icons from 'lucide-react'

function FacultyCard({ faculty, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const IconComponent = Icons[faculty.icon] || Icons.CircleDot
  const color = faculty.color || 'bg-[var(--landing-primary)]'

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
            <IconComponent className="size-5 text-white" />
          </div>
          <h3 className="font-bold font-headline text-[var(--landing-primary)] text-base">
            {faculty.name}
          </h3>
        </div>
        <ul className="space-y-2">
          {faculty.programs?.map((prog, idx) => {
            const isString = typeof prog === 'string';
            const progName = isString ? prog : prog.name;
            return (
              <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                <div className="size-1.5 rounded-full bg-[var(--landing-secondary)]" />
                {progName}
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  )
}

export default function ProgramStudi() {
  const { settings } = useOutletContext() || {};

  const title = settings?.prodi_page_title || 'Program Studi';
  const subtitle = settings?.prodi_page_subtitle || '30+ program studi terakreditasi siap mencetak lulusan unggul dan berdaya saing.';
  const isPmbOpen = settings?.is_pmb_open ?? true;

  let faculties = [];
  try {
    const parsed = JSON.parse(settings?.programs_items || '[]');
    if (Array.isArray(parsed)) {
      faculties = parsed.map(f => ({
        name: f.faculty,
        description: '', 
        programs: Array.isArray(f.programs) ? f.programs : [],
        icon: f.icon || 'BookOpen',
        color: f.color || 'bg-[var(--landing-primary)]'
      }));
    }
  } catch(e) {}
  if (!faculties.length) {
    faculties = [
      {
        name: 'Fakultas Ilmu Kesehatan',
        description: 'Fakultas dengan program studi unggulan di bidang kesehatan yang menghasilkan tenaga kesehatan profesional dan berkarakter.',
        programs: [
          { name: 'Keperawatan (S1)', accreditation: 'A' },
          { name: 'Farmasi (S1)', accreditation: 'A' },
          { name: 'Kebidanan (D3)', accreditation: 'B' },
        ],
        icon: 'HeartPulse',
        color: 'bg-[var(--landing-primary)]'
      }
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

      {/* Program Cards */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faculties.map((faculty, i) => (
              <FacultyCard key={faculty.name} faculty={faculty} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Icons.GraduationCap className="size-12 text-[var(--landing-secondary)] mx-auto mb-4" />
            <h2 className="text-2xl font-extrabold font-headline text-[var(--landing-primary)] mb-3">
              Tertarik Bergabung?
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto mb-8">
              Daftar sekarang dan jadilah bagian dari keluarga besar Universitas Bhakti Kencana.
            </p>
            {isPmbOpen && (
              <Link
                to="/daftar-pkkmb"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-[var(--landing-primary)] hover:bg-[#152F58] transition-all hover:scale-105 active:scale-95"
              >
                Daftar Jadi Mahasiswa
                <Icons.ChevronRight className="size-5" />
              </Link>
            )}
          </motion.div>
        </div>
      </section>
    </>
  )
}
