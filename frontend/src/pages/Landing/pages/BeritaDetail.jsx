import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicNewsDetail, getPublicNews } from '../../../services/api';
import { stripHtmlAndEntities } from '../../../lib/utils';
import { motion } from 'framer-motion';
import { Calendar, ArrowLeft } from 'lucide-react';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '');
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

export default function BeritaDetail() {
  const { id } = useParams();
  const [news, setNews] = useState(null);
  const [recentNews, setRecentNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch current news
        const detailRes = await getPublicNewsDetail(id);
        if (detailRes?.status === 'success' && detailRes.data) {
          setNews({
            id: detailRes.data.id,
            title: detailRes.data.Judul,
            category: detailRes.data.Kategori || detailRes.data.Status || 'Pengumuman',
            date: new Date(detailRes.data.TanggalPublish).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            content: detailRes.data.Isi,
            image: detailRes.data.GambarURL || null,
            metaDescription: detailRes.data.MetaDescription || '',
            focusKeyword: detailRes.data.FocusKeyword || ''
          });
        } else {
          setError('Berita tidak ditemukan.');
        }

        // Fetch recent news for sidebar
        const recentRes = await getPublicNews(5);
        if (recentRes?.status === 'success' && recentRes.data) {
          const formattedRecent = recentRes.data
            .filter(item => String(item.id) !== String(id))
            .slice(0, 4)
            .map(item => ({
              id: item.id,
              title: item.Judul,
              category: item.Kategori || item.Status || 'Pengumuman',
              date: new Date(item.TanggalPublish).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              image: item.GambarURL || null
            }));
          setRecentNews(formattedRecent);
        }
      } catch (err) {
        console.error(err);
        setError('Gagal memuat detail berita.');
      } finally {
        setLoading(false);
      }
    };

    // Scroll to top when id changes
    window.scrollTo(0, 0);
    fetchData();
  }, [id]);

  // SEO Effect
  useEffect(() => {
    if (news) {
      document.title = `${news.title} | Universitas Bhakti Kencana`;

      // Update meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      // Use metaDescription if available, otherwise fallback to stripping HTML from content
      metaDesc.setAttribute('content', news.metaDescription || stripHtmlAndEntities(news.content || '').substring(0, 160));
    }
  }, [news]);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex items-center justify-center bg-white">
        <p className="text-slate-500">Memuat berita...</p>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center bg-white">
        <p className="text-red-500 mb-4">{error || 'Berita tidak ditemukan.'}</p>
        <Link to="/berita" className="text-[var(--landing-primary)] font-bold hover:underline inline-flex items-center gap-2">
          <ArrowLeft className="size-4" /> Kembali ke Berita
        </Link>
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pt-32 pb-20 bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col lg:flex-row gap-12">

          {/* Left Column: Main Content */}
          <div className="lg:w-2/3">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-6">
              <Link to="/" className="hover:text-[var(--landing-primary)] transition-colors">HOME</Link>
              <span>/</span>
              <span className="text-[var(--landing-primary)]">{news.category}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-headline text-[var(--landing-primary)] mb-6 leading-tight">
              {news.title}
            </h1>

            <div className="flex items-center gap-4 mb-8">
              <span className="px-3 py-1 bg-[var(--landing-primary)]/10 text-[var(--landing-primary)] text-xs font-bold uppercase tracking-widest rounded-lg">
                {news.category}
              </span>
              <span className="text-sm text-slate-500 font-medium flex items-center gap-2">
                <Calendar className="size-4" />
                {news.date}
              </span>
            </div>

            {news.image && (
              <div className="mb-10 rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                <img src={getImageUrl(news.image)} alt={news.title} className="w-full h-auto object-cover max-h-[500px]" />
              </div>
            )}

            <div
              className="prose prose-slate prose-lg max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: news.content }}
            />
          </div>

          {/* Right Column: Sidebar */}
          <div className="lg:w-1/3">
            <div className="sticky top-32">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <h3 className="text-sm font-bold tracking-widest text-[var(--landing-primary)] uppercase">
                  Berita Terkait
                </h3>
                <Link to="/berita" className="text-xs font-bold text-[var(--landing-secondary)] hover:underline uppercase tracking-wider">
                  Lihat Semua
                </Link>
              </div>

              <div className="space-y-6">
                {recentNews.length > 0 ? recentNews.map((item, index) => (
                  <Link key={item.id} to={`/berita/${item.id}`} className="group flex gap-4 items-start">
                    <span className="text-4xl font-extrabold text-slate-200 leading-none mt-1 group-hover:text-[var(--landing-secondary)] transition-colors">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="text-[13px] sm:text-sm font-bold text-[var(--landing-primary)] group-hover:text-[var(--landing-secondary)] transition-colors mb-2 line-clamp-3 leading-snug">
                        {item.title}
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">{item.date}</span>
                    </div>
                    {item.image ? (
                      <img src={getImageUrl(item.image)} alt={item.title} className="size-20 sm:size-24 rounded-xl object-cover shadow-sm border border-slate-100 flex-shrink-0" />
                    ) : (
                      <div className="size-20 sm:size-24 rounded-xl bg-[var(--landing-primary)]/5 flex items-center justify-center flex-shrink-0">
                        <Calendar className="size-5 text-[var(--landing-primary)]/40" />
                      </div>
                    )}
                  </Link>
                )) : (
                  <p className="text-sm text-slate-500">Tidak ada berita terkait saat ini.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.article>
  );
}
