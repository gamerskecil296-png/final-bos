import React from 'react';
import { Lock, ChevronLeft, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../../store/useAuthStore';
import { getRouteByRole } from '../../utils/roleRoutes';

export default function Error403() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const handleGoBack = () => {
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
            className="text-[120px] md:text-[160px] font-black text-[#ef4444]/10 leading-none select-none font-headline"
          >
            403
          </motion.div>

          <motion.div
            initial={{ rotate: -15, opacity: 0 }}
            animate={{ rotate: 5, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pt-8"
          >
            <div className="w-24 h-24 bg-white rounded-[40px] shadow-2xl flex items-center justify-center border border-[#D5E2FF] relative overflow-hidden ring-4 ring-[#ef4444]/5">
              <div className="absolute top-0 right-0 w-8 h-8 bg-[#ef4444]/5 rounded-bl-full"></div>
              <Lock size={48} className="text-[#ef4444]" strokeWidth={1.5} />
              <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-[#ef4444] rounded-full flex items-center justify-center text-white">
                <ShieldAlert size={20} strokeWidth={2} />
              </div>
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
            Akses Ditolak
          </h1>
          <p className="text-[#737373] text-lg mb-10 font-medium leading-relaxed">
            Maaf, kamu tidak memiliki izin yang cukup untuk mengakses halaman terlarang ini.
          </p>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGoBack}
              className="px-8 py-4 bg-[#171717] text-white rounded-3xl font-bold text-sm shadow-xl hover:bg-black transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <ChevronLeft size={18} />
              Kembali ke Sebelumnya
            </button>
          </div>
        </motion.div>

        {/* Footer info */}
        <p className="mt-16 text-xs font-bold text-[#d4d4d4] uppercase tracking-widest text-[#ef4444]/40">
          KEAMANAN SISTEM &bull; BKU
        </p>
      </div>
    </div>
  );
}
