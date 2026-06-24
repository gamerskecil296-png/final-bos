import React from 'react';
import { Trophy, MessageSquare, BookOpen, GraduationCap, HeartHandshake, Users, Info } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { PageCard, PageCardHeader } from '@/components/ui/page';

const ACTIVITY_ICONS = {
  achievement: { icon: Trophy, bg: 'bg-primary/10', text: 'text-primary' },
  beasiswa: { icon: BookOpen, bg: 'bg-success/10', text: 'text-success' },
  konseling: { icon: HeartHandshake, bg: 'bg-error/10', text: 'text-error' },
  kencana: { icon: GraduationCap, bg: 'bg-primary/10', text: 'text-primary' },
  voice: { icon: MessageSquare, bg: 'bg-secondary/10', text: 'text-secondary' },
  organisasi: { icon: Users, bg: 'bg-info/10', text: 'text-info' },
};

function formatRelativeTime(date) {
  const diff = (new Date() - new Date(date)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 172800) return 'Kemarin';
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function ActivityFeed({ activities }) {
  return (
    <PageCard className="flex flex-col h-full">
      <PageCardHeader 
        title="Aktivitas Terbaru"
        icon="insights"
      />

      {activities?.length > 0 ? (
        <div className="flex-1 flex flex-col gap-6 relative">
          {/* Vertical line connector */}
          <div className="absolute left-6 top-2 bottom-6 w-[1px] bg-border-muted z-0"></div>
          
          {activities.map((item, i) => {
            const config = ACTIVITY_ICONS[item.tipe] || { icon: Info, bg: 'bg-background', text: 'text-text-muted' };
            return (
              <NavLink 
                key={i} 
                to={item.link || '#'} 
                className="flex items-start gap-4 group/item relative z-10 hover:translate-x-1 transition-transform"
              >
                <div className={`w-12 h-12 ${config.bg} ${config.text} rounded-2xl flex items-center justify-center shrink-0 border border-surface shadow-sm ring-4 ring-surface`}>
                  <config.icon size={22} />
                </div>
                <div className="flex-1 flex flex-col gap-1 pt-1 border-b border-border-muted pb-4 group-last/item:border-0">
                   <p className="text-sm font-bold text-bku-text leading-snug group-hover/item:text-primary transition-colors">
                       {item.deskripsi}
                   </p>
                   <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                       {formatRelativeTime(item.created_at)}
                   </span>
                </div>
              </NavLink>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-40">
           <Info size={40} className="text-text-muted/40 mb-3" />
           <p className="text-sm font-bold text-text-muted text-center max-w-[200px]">
              Belum ada aktivitas. Mulai eksplorasi layanan BKU Student Hub!
           </p>
        </div>
      )}
    </PageCard>
  );
}
