import React, { useEffect } from 'react';
import { WifiOff, RefreshCcw, CloudOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  useEffect(() => {
    const handleOnline = () => {
      window.location.reload();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 font-body">
      <div className="max-w-md w-full text-center">
        {/* Illustration Area */}
        <div className="relative mb-8 flex justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-[120px] md:text-[160px] font-black text-bku-primary/10 leading-none select-none font-headline uppercase"
          >
            OFF
          </motion.div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pt-8"
          >
            <div className="w-24 h-24 bg-white rounded-[40px] shadow-2xl flex items-center justify-center border border-[#D5E2FF] relative overflow-hidden ring-4 ring-bku-primary/5">
               <div className="absolute top-0 right-0 w-8 h-8 bg-bku-primary/5 rounded-bl-full"></div>
               <WifiOff size={48} className="text-bku-primary" strokeWidth={1.5} />
               <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-[#ef4444] rounded-full flex items-center justify-center text-white">
                 <CloudOff size={16} strokeWidth={2.5} />
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
            Koneksi Terputus
          </h1>
          <p className="text-[#737373] text-lg mb-10 font-medium leading-relaxed">
            Sepertinya kamu sedang offline. Periksa koneksi internet kamu dan coba lagi untuk melanjutkan.
          </p>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
               onClick={handleRetry}
               className="px-8 py-4 bg-bku-primary text-white rounded-3xl font-bold text-sm shadow-xl hover:bg-[#0B4FAE] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
            >
              <RefreshCcw size={18} />
              Coba Lagi
            </button>
          </div>
        </motion.div>

        {/* Status Indicator */}
        <div className="mt-16 flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse"></div>
          <span className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">
            Menunggu Koneksi Kembali...
          </span>
        </div>
      </div>
    </div>
  );
}
