import { motion } from 'framer-motion';
import { Settings, LogOut, ArrowLeft } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export default function Maintenance() {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden text-center"
      >
        <div className="bg-[var(--theme-primary)] p-8 flex justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm"
          >
            <Settings className="size-16 text-white" />
          </motion.div>
        </div>
        
        <div className="p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Sistem Dalam Perbaikan</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Mohon maaf, saat ini sistem sedang dalam tahap pemeliharaan rutin untuk meningkatkan kualitas layanan. Silakan kembali beberapa saat lagi.
          </p>
          
          <button
            onClick={handleLogout}
            className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="size-5" />
            Keluar dari Akun
          </button>
        </div>
      </motion.div>
    </div>
  );
}
