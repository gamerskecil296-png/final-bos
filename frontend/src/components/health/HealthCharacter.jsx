import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// Konversi emoji karakter ke URL CDN Twemoji (Twitter emoji SVG — konsisten semua platform)
function twemojiUrl(emoji) {
  const codepoints = [...emoji]
    .map((c) => c.codePointAt(0).toString(16))
    .filter((cp) => cp !== 'fe0f') // hapus variation selector
    .join('-');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
}

// Mapping kondisi → emoji + animasi + halo glow
const CONDITION_CONFIG = {
  prima: {
    emoji: '🤩',
    animation: { animate: { y: [-4, 4, -4], rotate: [-3, 3, -3] }, transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
    halo: 'bg-yellow-300/40',
  },
  sehat: {
    emoji: '😊',
    animation: { animate: { y: [-3, 3, -3] }, transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } },
    halo: 'bg-emerald-300/40', 
  },
  kurus: {
    emoji: '😟',
    animation: { animate: { y: [-5, 5, -5] }, transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
    halo: 'bg-blue-300/30',
  },
  gemuk: {
    emoji: '😹', 
    animation: { animate: { scaleY: [1, 0.97, 1], scaleX: [1, 1.02, 1] }, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
    halo: 'bg-amber-300/35',
  },
  obesitas: {
    emoji: '😰',
    animation: { animate: { scaleY: [1, 0.95, 1] }, transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } },
    halo: 'bg-orange-400/35',
  },
  hipertensi: {
    emoji: '🤯',
    animation: { animate: { x: [-2, 2, -2, 2, 0] }, transition: { duration: 0.3, repeat: Infinity, ease: 'linear' } },
    halo: 'bg-red-400/40',
  },
  perhatian: {
    emoji: '😕',
    animation: { animate: { scale: [0.97, 1.03, 0.97] }, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
    halo: 'bg-amber-300/35',
  },
  nodata: {
    emoji: '😶',
    animation: { animate: { opacity: [0.4, 0.65, 0.4] }, transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } },
    halo: 'bg-neutral-300/20',
  },
};

export default function HealthCharacter({ bmi, sistolik, diastolik, statusKesehatan, className = '' }) {
  const condition = useMemo(() => {
    const vBmi = parseFloat(bmi);
    const vSis = parseInt(sistolik);
    const vDia = parseInt(diastolik);

    if (!bmi && !sistolik && !diastolik) return 'nodata';

    // Hipertensi → paling kritis
    if (vSis >= 140 || vDia >= 90) return 'hipertensi';

    // Status backend
    if (statusKesehatan) {
      const s = statusKesehatan.toLowerCase();
      if (s.includes('bahaya') || s.includes('kritis') || s.includes('tindak') || s.includes('darurat')) return 'hipertensi';
      if (s.includes('pantauan') || s.includes('waspada') || s.includes('observasi')) return 'perhatian';
    }

    // BMI
    if (!isNaN(vBmi)) {
      if (vBmi >= 30) return 'obesitas';
      if (vBmi >= 25) return 'gemuk';
      if (vBmi < 18.5) return 'kurus';
    }

    // Pre-hipertensi
    if ((!isNaN(vSis) && vSis >= 120 && vSis < 140) || (!isNaN(vDia) && vDia >= 80 && vDia < 90)) return 'perhatian';

    // Prima: semua ideal
    const bmiIdeal = !isNaN(vBmi) && vBmi >= 18.5 && vBmi < 25;
    const bpIdeal = !isNaN(vSis) && vSis < 120 && !isNaN(vDia) && vDia < 80;
    if (bmiIdeal && bpIdeal) return 'prima';

    return 'sehat';
  }, [bmi, sistolik, diastolik, statusKesehatan]);

  const { emoji, animation, halo } = CONDITION_CONFIG[condition];
  const emojiSrc = twemojiUrl(emoji);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Glow halo */}
      <motion.div
        className={`absolute inset-0 rounded-full blur-xl opacity-90 ${halo}`}
        animate={{ scale: [0.85, 1.15, 0.85] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Emoji via Twemoji CDN — konsisten semua platform */}
      <motion.div
        className="relative z-10 flex items-center justify-center w-full h-full"
        animate={animation.animate}
        transition={animation.transition}
      >
        <img
          src={emojiSrc}
          alt={emoji}
          draggable={false}
          style={{ width: '70%', height: '70%', objectFit: 'contain', userSelect: 'none' }}
        />
      </motion.div>
    </div>
  );
}
