import { create } from 'zustand';

// Inject Google Font
const injectGoogleFont = (fontName) => {
  if (!fontName) return;
  const id = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
};

// Helper: Calculate luminance
const getLuminance = (hex) => {
  if (!hex) return 0.5;
  const rgb = hex.replace('#', '').match(/.{2}/g);
  if (!rgb || rgb.length < 3) return 0.5;

  let r = parseInt(rgb[0], 16) / 255;
  let g = parseInt(rgb[1], 16) / 255;
  let b = parseInt(rgb[2], 16) / 255;

  r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Helper: Auto-calculate text color based on background
const getAutoTextColor = (bgColor, threshold = 0.179) => {
  const luminance = getLuminance(bgColor);
  return luminance < threshold ? '#FFFFFF' : '#1B1C1C';
};

// Helper: Get muted text color
const getMutedColor = (textColor) => {
  return textColor === '#FFFFFF' ? '#E2E8F0' : '#64748B';
};

// Generate all theme colors
const generateColors = (t) => {
  const primary = t.color_primary || '#2563EB';
  const secondary = t.color_secondary || '#EAB308';
  const accent = t.color_accent || '#FDE047';
  const background = t.color_background || '#F8FAFC';
  const surface = t.color_surface || '#FFFFFF';

  // Text on background
  const textOnBg = getAutoTextColor(background);
  const mutedOnBg = getMutedColor(textOnBg);

  // Text on surface
  const textOnSurface = getAutoTextColor(surface);
  const mutedOnSurface = getMutedColor(textOnSurface);

  // Landing Colors
  const landingPrimary = t.landing_color_primary || primary;
  const landingSecondary = t.landing_color_secondary || secondary;
  const landingAccent = t.landing_color_accent || accent;
  const landingBackground = t.landing_color_background || background;
  const landingSurface = t.landing_color_surface || surface;

  const landingText = getAutoTextColor(landingBackground);
  const landingTextMuted = getMutedColor(landingText);
  const landingTextOnSurface = getAutoTextColor(landingSurface);
  const landingTextMutedOnSurface = getMutedColor(landingTextOnSurface);
  const landingTextOnPrimary = getAutoTextColor(landingPrimary, 0.6);
  const landingMutedOnPrimary = getMutedColor(landingTextOnPrimary);

  // Text on Primary
  // Kita gunakan threshold 0.6 khusus untuk primary agar warna vibrant (seperti oranye) tetap mendapat teks putih
  const textOnPrimary = getAutoTextColor(primary, 0.6);
  const mutedOnPrimary = getMutedColor(textOnPrimary);

  // Sidebar
  const sidebarBg = t.sidebar_bg_color || primary;
  const sidebarText = t.sidebar_text_color || getAutoTextColor(sidebarBg, 0.6);
  const sidebarTextMuted = t.sidebar_text_muted_color || getMutedColor(sidebarText);

  return {
    primary,
    secondary,
    accent,
    background,
    surface,

    // Text on background
    text: textOnBg,
    textMuted: mutedOnBg,

    // Text on surface
    textOnSurface,
    textMutedOnSurface: mutedOnSurface,

    // Landing Colors
    landingPrimary,
    landingSecondary,
    landingAccent,
    landingBackground,
    landingSurface,
    landingText,
    landingTextMuted,
    landingTextOnSurface,
    landingTextMutedOnSurface,
    landingTextOnPrimary,
    landingMutedOnPrimary,

    // Text on primary (HERO sections use this)
    textOnPrimary,
    mutedOnPrimary,

    // Heading = text on background
    h1: textOnBg,
    h2: textOnBg,
    h3: textOnBg,
    h4: textOnBg,

    // Sidebar
    sidebarBg,
    sidebarText,
    sidebarTextMuted,

    // Border
    border: t.color_border || '#E2E8F0',
    borderMuted: t.color_border_muted || '#F1F5F9',

    // State
    success: t.color_success || '#22C55E',
    warning: t.color_warning || '#EAB308',
    error: t.color_error || '#EF4444',
    info: t.color_info || '#3B82F6',

    // Button
    buttonRadius: t.button_radius || '0.75rem',

    // Fonts
    fontHeadline: `'${t.font_headline || 'Plus Jakarta Sans'}', sans-serif`,
    fontBody: `'${t.font_body || 'Inter'}', sans-serif`,
  };
};

let themeObserver = null;

const initObserver = () => {
  if (themeObserver) return themeObserver;

  themeObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          applyFontToElement(node);
        }
      });
    });
  });

  themeObserver.observe(document.body, { childList: true, subtree: true });
  return themeObserver;
};

const applyFontToElement = (el) => {
  if (!el || !el.classList || !el.tagName) return;

  const tag = el.tagName;
  if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag)) {
    el.style.fontFamily = useThemeStore.getState().fontHeadline || "'Plus Jakarta Sans', sans-serif";
  }
  if (el.classList.contains('font-headline')) {
    el.style.fontFamily = useThemeStore.getState().fontHeadline || "'Plus Jakarta Sans', sans-serif";
  }
  if (el.classList.contains('font-body') || el.classList.contains('font-inter')) {
    el.style.fontFamily = useThemeStore.getState().fontBody || "'Inter', sans-serif";
  }
};

const useThemeStore = create((set, get) => ({
  theme: null,
  isLoaded: false,
  error: null,

  fetchTheme: async () => {
    try {
      // Check SSR pre-loaded config
      if (window.__THEME_CONFIG__) {
        const config = window.__THEME_CONFIG__;
        window.__THEME_CONFIG__ = null;
        set({ theme: config, isLoaded: true });
        get().applyTheme(config);
        initObserver();
        return config;
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API_BASE_URL}/public/theme`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.status === 'success') {
        set({ theme: data.data, isLoaded: true });
        get().applyTheme(data.data);
        initObserver();
        return data.data;
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error('[ThemeStore] Error:', err);
      set({ error: err.message, isLoaded: true });
      return null;
    }
  },

  applyTheme: (t) => {
    if (!t) return;

    const root = document.documentElement.style;
    const c = generateColors(t);

    // Main colors
    root.setProperty('--theme-primary', c.primary);
    root.setProperty('--theme-secondary', c.secondary);
    root.setProperty('--theme-accent', c.accent);
    root.setProperty('--theme-bg', c.background);
    root.setProperty('--theme-surface', c.surface);

    // Text colors
    root.setProperty('--theme-text', c.text);
    root.setProperty('--theme-text-muted', c.textMuted);
    root.setProperty('--theme-text-on-primary', c.textOnPrimary);
    root.setProperty('--theme-muted-on-primary', c.mutedOnPrimary);
    // Text on surface
    root.setProperty('--theme-text-on-surface', c.textOnSurface);
    root.setProperty('--theme-muted-on-surface', c.mutedOnSurface);

    // Landing colors
    root.setProperty('--landing-primary', c.landingPrimary);
    root.setProperty('--landing-secondary', c.landingSecondary);
    root.setProperty('--landing-accent', c.landingAccent);
    root.setProperty('--landing-bg', c.landingBackground);
    root.setProperty('--landing-surface', c.landingSurface);
    root.setProperty('--landing-text', c.landingText);
    root.setProperty('--landing-text-muted', c.landingTextMuted);
    root.setProperty('--landing-text-on-surface', c.landingTextOnSurface);
    root.setProperty('--landing-muted-on-surface', c.landingTextMutedOnSurface);
    root.setProperty('--landing-text-on-primary', c.landingTextOnPrimary);
    root.setProperty('--landing-muted-on-primary', c.landingMutedOnPrimary);

    // Heading colors
    root.setProperty('--theme-h1', c.h1);
    root.setProperty('--theme-h2', c.h2);
    root.setProperty('--theme-h3', c.h3);
    root.setProperty('--theme-h4', c.h4);

    // Sidebar
    root.setProperty('--theme-sidebar-bg', c.sidebarBg);
    root.setProperty('--theme-sidebar-text', c.sidebarText);
    root.setProperty('--theme-sidebar-text-muted', c.sidebarTextMuted);

    // Border
    root.setProperty('--theme-border', c.border);
    root.setProperty('--theme-border-muted', c.borderMuted);

    // State
    root.setProperty('--theme-success', c.success);
    root.setProperty('--theme-warning', c.warning);
    root.setProperty('--theme-error', c.error);
    root.setProperty('--theme-info', c.info);

    // Button
    root.setProperty('--theme-btn-radius', c.buttonRadius);

    // Fonts
    root.setProperty('--theme-font-headline', c.fontHeadline);
    root.setProperty('--theme-font-body', c.fontBody);
    document.body.style.fontFamily = c.fontBody;

    // Inject fonts
    injectGoogleFont(t.font_headline);
    injectGoogleFont(t.font_body);
  },

  previewTheme: (overrides) => {
    const current = get().theme;
    if (current) get().applyTheme({ ...current, ...overrides });
  },

  revertPreview: () => {
    const theme = get().theme;
    if (theme) get().applyTheme(theme);
  }
}));

export default useThemeStore;