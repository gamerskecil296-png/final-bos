import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Building2, Brain, HeartPulse, Users, GraduationCap, 
  BookOpen, Sparkles, HandHelping, User, ChevronRight, Loader2, ArrowLeft 
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../lib/axios';
import useAuthStore from '../../store/useAuthStore';

const ICON_MAP = {
  'shield': Shield,
  'building-2': Building2,
  'brain': Brain,
  'heart-pulse': HeartPulse,
  'users': Users,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  'sparkles': Sparkles,
  'hand-helping': HandHelping,
  'user': User,
};

import { getRouteByRole } from '../../utils/roleRoutes';
export default function RoleSelector({ data, onBack, onError }) {
  const [loading, setLoading] = useState(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSelectRole = async (role) => {
    setLoading(role.role);
    try {
      const response = await api.post('/auth/login/select-role', {
        temp_token: data.tempToken,
        selected_role: role.role,
      });

      if (response.data.success || response.data.status === 'success') {
        const payload = response.data.data || {};
        const token = payload.access_token || payload.token;
        if (!token) {
          onError('Token login tidak ditemukan dari server.');
          return;
        }
        const userPermissions = payload?.user?.permissions || payload?.user?.Permissions || [];
        setAuth(token, payload.user, payload.mahasiswa);
        navigate(getRouteByRole(role.role, userPermissions), { replace: true });
      }
    } catch (error) {
      if (error.response?.data?.message) {
        onError(error.response.data.message);
      } else {
        onError('Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setLoading(null);
    }
  };

  const userName = data.user?.nama || data.user?.email || '';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-[480px] mx-auto"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-[var(--theme-primary)] font-semibold text-sm mb-6 group transition-colors"
      >
        <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-[var(--theme-primary)]/10 transition-colors">
           <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        </div>
        Kembali ke Login
      </button>

      {/* Header */}
      <div className="mb-8 relative">
        <div className="absolute -left-4 -top-4 w-20 h-20 bg-[var(--theme-primary)]/5 rounded-full blur-2xl pointer-events-none" />
        <h2 className="text-3xl font-extrabold font-headline text-slate-900 mb-3 tracking-tight relative z-10">
          Pilih Peran Anda
        </h2>
        <p className="text-slate-500 text-[15px] leading-relaxed font-medium relative z-10">
          {userName && (
            <span className="block mb-1 text-slate-700">
              Halo, <span className="font-bold text-[var(--theme-primary)]">{userName}</span>! 👋
            </span>
          )}
          Akun Anda memiliki beberapa peran. Silakan pilih salah satu untuk melanjutkan.
        </p>
      </div>

      {/* Role Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {data.roles.map((role) => {
          const IconComponent = ICON_MAP[role.icon] || User;
          const isLoading = loading === role.role;
          const isDisabled = loading !== null && loading !== role.role;
          const roleColor = role.color || '#3b82f6';

          return (
            <motion.button
              variants={itemVariants}
              whileHover={!isDisabled && !isLoading ? { scale: 1.015, y: -2 } : {}}
              whileTap={!isDisabled && !isLoading ? { scale: 0.98 } : {}}
              key={role.role}
              onClick={() => handleSelectRole(role)}
              disabled={isDisabled || isLoading}
              className={`w-full group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ease-out text-left flex flex-col ${
                isDisabled ? 'opacity-50 cursor-not-allowed grayscale-[0.5]' : 'cursor-pointer'
              }`}
              style={{
                borderColor: isLoading ? roleColor : 'transparent',
                backgroundColor: isLoading ? `${roleColor}08` : '#ffffff',
                boxShadow: isLoading 
                  ? `0 0 0 4px ${roleColor}15` 
                  : '0 4px 15px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {/* Default Border Gradient (Hidden when loading) */}
              {!isLoading && (
                <div className="absolute inset-0 rounded-2xl border-2 border-slate-100 group-hover:border-transparent transition-colors duration-300 pointer-events-none z-10" />
              )}
              
              {/* Hover Border Gradient */}
              {!isDisabled && !isLoading && (
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"
                  style={{
                    padding: '2px',
                    background: `linear-gradient(135deg, ${roleColor}80, ${roleColor}20)`,
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
              )}

              {/* Hover Background */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"
                style={{ background: `linear-gradient(120deg, ${roleColor}08 0%, transparent 100%)` }}
              />

              {/* Decorative Icon Background */}
              <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 transform group-hover:scale-110 group-hover:rotate-12 pointer-events-none z-0">
                <IconComponent size={120} />
              </div>
              
              <div className="relative z-20 flex items-center gap-4 p-5">
                {/* Icon Container */}
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-sm"
                  style={{ 
                    background: `linear-gradient(135deg, ${roleColor}15, ${roleColor}05)`,
                    border: `1px solid ${roleColor}20`
                  }}
                >
                  {isLoading ? (
                    <Loader2 size={26} className="animate-spin" style={{ color: roleColor }} />
                  ) : (
                    <IconComponent 
                      size={26} 
                      style={{ color: roleColor }} 
                      className="transition-transform duration-300 group-hover:scale-110"
                      strokeWidth={2} 
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-[17px] text-slate-800 group-hover:text-slate-900 transition-colors truncate">
                      {role.label}
                    </h3>
                    {isLoading && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>
                        Memproses
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-slate-500 font-medium leading-snug line-clamp-2">
                    {role.description}
                  </p>
                </div>

                {/* Arrow indicator */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-white group-hover:shadow-md transition-all duration-300 border border-transparent group-hover:border-slate-100">
                  <ChevronRight 
                    size={18} 
                    className="text-slate-400 group-hover:text-slate-700 transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Footer hint */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-8 pt-6 border-t border-slate-100 text-center"
      >
        <p className="text-[13px] text-slate-400 font-medium flex items-center justify-center gap-2">
          <Shield size={14} className="opacity-70" />
          Anda dapat beralih peran kapan saja dengan logout.
        </p>
      </motion.div>
    </motion.div>
  );
}

