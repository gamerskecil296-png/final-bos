/**
 * Siakad Web Portal Design System (Strict SOP Version)
 * 
 * Versi ini dikunci untuk benar-benar mengikuti pola desain Portal Mahasiswa
 * agar tercipta konsistensi 100% di seluruh ekosistem Siakad.
 */

export const UI = {
  // Layout Containers (Sama dengan Student)
  layout: {
    main: "md:ml-64 pt-20 px-6 pb-12 transition-all duration-300",
    canvas: "space-y-8",
  },

  // Card Styles (Mengikuti Student Dashboard)
  card: {
    base: "bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10",
    interactive: "hover:bg-white hover:shadow-md transition-all cursor-pointer",
    // Varian warna pendukung
    accent: "bg-secondary-container/30 p-6 rounded-3xl border border-secondary-container",
  },

  // Typography (Sesuai Student Portal)
  text: {
    h1: "text-4xl font-extrabold text-white font-headline tracking-tight",
    h2: "text-lg font-bold text-primary font-headline",
    h3: "font-bold text-primary text-lg",
    label: "text-sm font-bold text-secondary uppercase tracking-widest font-headline",
    body: "text-on-surface-variant font-medium",
    bodySmall: "text-xs text-on-surface-variant",
    bodyOnPrimary: "text-on-primary-container text-lg font-medium",
  },

  // Button Styles
  button: {
    primary: "bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95",
    secondary: "bg-white text-primary px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95",
    outline: "bg-primary/20 backdrop-blur-md text-white border border-white/20 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/40 transition-all",
    action: "w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-container transition-colors",
  },

  // Badge & Status (Sesuai Student Portal style)
  badge: {
    base: "px-3 py-1 rounded-full text-xs font-bold",
    live: "bg-white/50 px-3 py-1 rounded-full text-xs font-bold text-secondary",
    error: "bg-error/10 text-error p-2 rounded-lg",
    info: "bg-secondary/10 text-secondary p-2 rounded-lg",
  },

  // Input & Forms
  input: {
    base: "bg-surface-container-low p-4 rounded-2xl flex items-center gap-4 group hover:bg-white hover:shadow-md transition-all",
    search: "pl-11 pr-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all",
  }
};
