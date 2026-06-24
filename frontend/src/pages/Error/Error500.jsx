import React from 'react';
import { RefreshCcw, ServerCrash, ChevronLeft, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../../store/useAuthStore';
import { getRouteByRole } from '../../utils/roleRoutes';

export default function Error500() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const handleBackToDashboard = () => {
    navigate(-1);
  };
  const handleRefresh = () => {
    window.location.reload();
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
            className="text-[120px] md:text-[160px] font-black text-[#737373]/10 leading-none select-none font-headline"
          >
            500
          </motion.div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pt-8"
          >
            <div className="w-24 h-24 bg-white rounded-[40px] shadow-2xl flex items-center justify-center border border-[#e5e5e5] relative overflow-hidden ring-4 ring-[#737373]/5">
               <div className="absolute top-0 right-0 w-8 h-8 bg-[#737373]/5 rounded-bl-full"></div>
               <ServerCrash size={48} className="text-[#525252]" strokeWidth={1.5} />
               <motion.div 
                 animate={{ opacity: [1, 0, 1] }} 
                 transition={{ repeat: Infinity, duration: 1.5 }}
                 className="absolute -bottom-2 -right-2 w-10 h-10 bg-bku-primary rounded-full flex items-center justify-center text-white"
               >
                 <Zap size={20} fill="currentColor" strokeWidth={0} />
               </motion.div>
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
            Terjadi Kesalahan Server
          </h1>
          <p className="text-[#737373] text-lg mb-10 font-medium leading-relaxed">
            Ups! Sepertinya ada kabel yang tercabut di ruang server kami. Tim teknis sedang berupaya memperbaikinya.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
               onClick={handleRefresh}
               className="px-8 py-4 bg-bku-primary text-white rounded-3xl font-bold text-sm shadow-xl hover:bg-[#0B4FAE] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCcw size={18} />
              Coba Lagi
            </button>
            
            <button
               onClick={handleBackToDashboard}
               className="px-8 py-4 bg-white text-[#525252] border-2 border-[#e5e5e5] rounded-3xl font-bold text-sm hover:bg-[#f5f5f5] transition-all flex items-center justify-center gap-2"
            >
              <ChevronLeft size={18} />
              Kembali ke Sebelumnya
            </button>
          </div>
        </motion.div>

        {/* Footer info */}
        <p className="mt-16 text-xs font-bold text-[#d4d4d4] uppercase tracking-widest">
          STATUS SISTEM &bull; KRITIS
        </p>
      </div>
    </div>
  );
}
