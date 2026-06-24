import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getPublicLandingSettings } from '../../../services/api'

export default function KebijakanPrivasi() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getPublicLandingSettings();
        if (res?.data?.kebijakan_privasi) {
          setContent(res.data.kebijakan_privasi);
        }
      } catch (error) {
        console.error('Failed to load kebijakan privasi:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to="/" className="inline-flex items-center text-sm font-medium text-[var(--landing-primary)] hover:text-blue-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Link>
          <h1 className="text-4xl font-headline font-bold text-gray-900 mb-4">Kebijakan Privasi</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 prose prose-blue max-w-none prose-headings:font-headline prose-p:text-gray-600"
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : content ? (
            <div className="space-y-4">
              {content.split('\n').map((line, idx) => (
                line.trim() ? (
                  <p key={idx} className={line.match(/^\d+\./) ? 'font-bold text-lg text-gray-900 mt-6' : ''}>
                    {line}
                  </p>
                ) : null
              ))}
            </div>
          ) : (
            <p>Konten belum tersedia.</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
