import React from 'react';
import { Search, ChevronLeft, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../../store/useAuthStore';
import { getRouteByRole } from '../../utils/roleRoutes';

export default function Error404() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const handleBackToDashboard = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 font-body">
      <div className="max-w-md w-full text-center">
        {/* Illustration Area */}
        <div className="relative mb-8 flex justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-[120px] md:text-[160px] font-black text-bku-primary/10 leading-none select-none font-headline"
          >
            404
          </motion.div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Glassmorphism Card */}
              <div className="w-24 h-24 bg-white/80 backdrop-blur-md rounded-[2rem] shadow-2xl flex items-center justify-center border border-white/50 rotate-12 relative overflow-hidden group">
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-bku-primary/10 rounded-full blur-xl"></div>
                <Search size={44} className="text-bku-primary" strokeWidth={2} />

                {/* Floating Accent */}
                <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-bku-primary rounded-xl shadow-lg flex items-center justify-center text-white rotate-[-12deg]">
                  <Search size={14} strokeWidth={3} />
                </div>
              </div>

              {/* Decorative particles */}
              <div className="absolute top-0 left-0 w-2 h-2 bg-bku-primary rounded-full animate-ping opacity-20"></div>
              <div className="absolute bottom-4 right-2 w-3 h-3 bg-bku-primary/20 rounded-full animate-bounce"></div>
            </div>
          </motion.div>
        </div>

        {/* Text Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h1 className="text-3xl font-extrabold text-[#171717] font-headline mb-4">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-[#737373] text-lg mb-10 font-medium leading-relaxed">
            Maaf, halaman yang kamu cari tidak ada atau sudah dipindahkan ke dimensi lain.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleBackToDashboard}
              className="px-8 py-4 bg-bku-primary text-white rounded-3xl font-bold text-sm shadow-xl hover:bg-[#0B4FAE] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <ChevronLeft size={18} />
              Kembali ke Sebelumnya
            </button>

            <button
              onClick={() => navigate('/student/voice')}
              className="px-8 py-4 bg-white text-[#525252] border-2 border-[#e5e5e5] rounded-3xl font-bold text-sm hover:bg-[#f5f5f5] transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare size={18} />
              Laporkan Masalah
            </button>
          </div>
        </motion.div>

        {/* Footer info */}
        <p className="mt-16 text-xs font-bold text-[#d4d4d4] uppercase tracking-widest">
          BKU Student Hub &bull; Portal v2.0
        </p>
      </div>
    </div>
  );
}
