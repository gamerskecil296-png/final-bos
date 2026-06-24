import { motion } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useInView } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, ArrowUpRight, Calendar, X } from 'lucide-react'
import { getPublicNews, ASSET_URL } from '../../../services/api'
import { stripHtmlAndEntities } from '../../../lib/utils'
import { AnimatePresence } from 'framer-motion'

function NewsCard({ id, title, category, date, excerpt, image, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const navigate = useNavigate()

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      onClick={() => navigate(`/berita/${id || '#'}`)}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden cursor-pointer"
    >
      {image ? (
        <img src={image.startsWith('http') ? image : `${ASSET_URL}${image.startsWith('/') ? image : '/' + image}`} alt={title} className="h-48 w-full object-cover" />
      ) : (
        <div className="h-48 bg-[var(--landing-primary)]/5 flex items-center justify-center">
          <div className="text-center">
            <div className="size-12 rounded-xl bg-[var(--landing-primary)]/10 flex items-center justify-center mx-auto mb-2">
              <Calendar className="size-6 text-[var(--landing-primary)]" />
            </div>
            <p className="text-xs text-slate-400 font-medium">Featured News</p>
          </div>
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--landing-secondary)]">
            {category}
          </span>
          <span className="text-xs text-slate-400">{date}</span>
        </div>
        <h3 className="font-bold font-headline text-[var(--landing-primary)] mb-2 group-hover:text-[var(--landing-secondary)] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-3 whitespace-pre-wrap">
          {excerpt}
        </p>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--landing-primary)] group-hover:gap-2 transition-all cursor-pointer">
          Baca Selengkapnya
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </motion.article>
  )
}


export default function NewsSection({ settings }) {
  const title = settings?.news_title || 'Berita & Artikel'
  const subtitle = settings?.news_subtitle || 'Terbaru dari UBK'
  const desc = settings?.news_desc || 'Ikuti perkembangan terbaru tentang kegiatan, prestasi, dan pengumuman dari Universitas Bhakti Kencana.'

  const [newsList, setNewsList] = useState([])

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await getPublicNews(3)
        if (response?.status === 'success' && response.data && response.data.length > 0) {
          const formattedNews = response.data.map(item => ({
            id: item.slug || item.id,
            title: item.Judul,
            category: item.Kategori || item.Status || 'Pengumuman',
            date: new Date(item.TanggalPublish).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            excerpt: stripHtmlAndEntities(item.Isi || ''),
            image: item.GambarURL || null
          }))
          setNewsList(formattedNews)
        }
      } catch (error) {
        console.error("Failed to fetch public news:", error)
      }
    }
    fetchNews()
  }, [])

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {newsList.map((item, i) => (
            <NewsCard key={i} {...item} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link
            to="/berita"
            className="inline-flex items-center gap-2 text-[var(--landing-primary)] font-bold hover:gap-3 transition-all"
          >
            Lihat Semua Berita
            <ChevronRight className="size-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
