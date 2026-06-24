import React from 'react';
import { NavLink } from 'react-router-dom';

const quickAccess = [
  { name: 'KENCANA', icon: 'school', path: '/student/kencana', bg: 'bg-primary/10', textClass: 'text-primary', border: 'border-primary/20', label: 'Program Pengenalan Kampus & PKKMB' },
  { name: 'Achievement', icon: 'emoji_events', path: '/student/achievement', bg: 'bg-warning/10', textClass: 'text-warning', border: 'border-warning/20', label: 'Lapor dan kelola prestasi akademikmu' },
  { name: 'Scholarship', icon: 'workspace_premium', path: '/student/scholarship', bg: 'bg-success/10', textClass: 'text-success', border: 'border-success/20', label: 'Temukan dan daftar beasiswa tersedia' },
  { name: 'Organisasi', icon: 'groups', path: '/student/organisasi', bg: 'bg-primary/10', textClass: 'text-primary', border: 'border-primary/20', label: 'Kelola keorganisasian dan daftar Ormawa' },
  { name: 'Counseling', icon: 'support_agent', path: '/student/counseling', bg: 'bg-secondary/10', textClass: 'text-secondary', border: 'border-secondary/20', label: 'Jadwalkan sesi konseling bersama ahli' },
  { name: 'Health', icon: 'monitor_heart', path: '/student/health', bg: 'bg-error/10', textClass: 'text-error', border: 'border-error/20', label: 'Pantau data kesehatanmu' },
  { name: 'Student Voice', icon: 'chat', path: '/student/voice', bg: 'bg-info/10', textClass: 'text-info', border: 'border-info/20', label: 'Sampaikan aspirasi dan pengaduanmu' },
];

export default function QuickAccessGrid() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-4 w-1.5 rounded-full bg-primary" />
        <h2 className="text-sm font-semibold text-text-muted">Akses Cepat</h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {quickAccess.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={`group bg-surface rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 border border-border hover:border-primary/30 hover:bg-primary/5`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm ${item.bg}`}>
              <span className={`material-symbols-outlined ${item.textClass}`} style={{ fontSize: '20px' }}>{item.icon}</span>
            </div>
            <span className="text-xs font-semibold text-text-muted group-hover:text-primary text-center leading-tight transition-colors">
              {item.name}
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}