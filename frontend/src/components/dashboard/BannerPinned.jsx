import React, { useState, useEffect } from 'react';
import { Megaphone, X, MoveRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function BannerPinned({ banner }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (banner?.aktif) {
      const dismissed = localStorage.getItem(`dismissed_banner_${banner.id}`);
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  }, [banner]);

  const handleDismiss = () => {
    localStorage.setItem(`dismissed_banner_${banner.id}`, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-primary text-white py-3 px-6 rounded-2xl mb-6 flex items-center justify-between shadow-lg shadow-primary/30 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-1.5 rounded-lg">
          <Megaphone size={18} className="text-white" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <p className="text-sm font-bold leading-tight">{banner.pesan}</p>
          <NavLink 
            to={banner.link} 
            className="text-xs font-extrabold flex items-center gap-1.5 hover:underline decoration-2 underline-offset-4"
          >
            Selengkapnya <MoveRight size={14} />
          </NavLink>
        </div>
      </div>
      <button 
        onClick={handleDismiss}
        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors ml-4"
      >
        <X size={18} />
      </button>
    </div>
  );
}
