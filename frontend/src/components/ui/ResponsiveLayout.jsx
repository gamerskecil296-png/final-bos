import React from 'react'
import { cn } from "@/lib/utils"

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Icon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>info</span>;

/**
/**
 * PageContainer - Pembungkus utama halaman yang menjamin padding konsisten tanpa double padding
 */
export const PageContainer = ({ children, className }) => (
  <div className={cn("w-full space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12", className)}>
    {children}
  </div>
)

/**
 * PageHeader - Header halaman yang responsif dengan design card akademik premium
 */
export const PageHeader = ({ icon: CustomIcon, title, description, category = "Fakultas Portal", activeTag, children }) => {
  const isMaterialSymbol = typeof CustomIcon === 'string';

  return (
    <section className="relative overflow-hidden rounded-2xl p-6 md:p-8 border border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm mb-6">
      {/* Subtle geometric grid background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/40 to-slate-100/30" />
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, var(--theme-primary) 1px, transparent 1px), radial-gradient(circle at 80% 20%, var(--theme-primary) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      {/* Accent glow blobs */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-10 right-40 w-48 h-48 bg-blue-400/5 rounded-full blur-2xl" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-4">
            {/* Clean visual anchor icon */}
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/[0.02] border border-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm relative overflow-hidden group/icon">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300" />
              {CustomIcon && (
                isMaterialSymbol ? (
                  <span className="material-symbols-outlined text-primary relative z-10 transition-transform duration-300 group-hover/icon:scale-110" style={{ fontSize: '26px' }}>{CustomIcon}</span>
                ) : (
                  <CustomIcon className="text-primary relative z-10 transition-transform duration-300 group-hover/icon:scale-110 size-6 md:size-7" />
                )
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-primary/5 text-primary border border-primary/10">
                  {category}
                </span>
                {activeTag && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {activeTag}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-headline leading-none">
                {title}
              </h1>
            </div>
          </div>

          {/* Perfectly aligned description block */}
          {description && (
            <p className="text-slate-500 font-medium text-xs md:text-sm max-w-3xl leading-relaxed mt-3 pl-0 md:pl-[72px]">
              {description}
            </p>
          )}
        </div>

        {/* Action and quick count balance box */}
        {children && (
          <div className="flex flex-row lg:flex-col items-end gap-3 shrink-0 self-stretch lg:self-auto justify-between lg:justify-center border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
            <div className="flex items-center gap-2">
              {children}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * ResponsiveGrid - Grid otomatis yang menyesuaikan layar
 */
export const ResponsiveGrid = ({ children, cols = 3, className }) => {
  const colMap = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }
  return (
    <div className={cn("grid gap-4 md:gap-6", colMap[cols] || colMap[3], className)}>
      {children}
    </div>
  )
}

/**
 * ResponsiveCard - Card yang dioptimasi untuk mobile (padding menyesuaikan)
 */
export const ResponsiveCard = ({ children, className, noPadding = false }) => (
  <div className={cn(
    "glass-card border border-slate-200/60 shadow-none rounded-2xl overflow-hidden transition-all duration-300",
    className
  )}>
    <div className={cn(noPadding ? "" : "p-5 md:p-8")}>
      {children}
    </div>
  </div>
)
