import React, { useEffect } from 'react';
import useThemeStore from '../store/useThemeStore';

export default function ThemeProvider({ children }) {
  const { fetchTheme, theme, applyTheme } = useThemeStore();

  // Fetch theme on mount
  // If __THEME_CONFIG__ is already available (from SSR), use it
  // Otherwise fetch from API
  useEffect(() => {
    fetchTheme();
  }, []);

  // Re-apply theme when route changes (for context-aware colors)
  useEffect(() => {
    const handleRouteChange = () => {
      if (theme) {
        // Delay slightly to ensure route has fully changed
        setTimeout(() => {
          applyTheme(theme);
        }, 10);
      }
    };

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);

    // Also hook into history API for programmatic navigation
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleRouteChange();
    };

    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleRouteChange();
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [theme, applyTheme]);

  // Update favicon dynamically
  useEffect(() => {
    if (theme?.favicon_url) {
      // Update existing favicon
      const existingFavicon = document.querySelector("link[rel='icon']");
      if (existingFavicon) {
        existingFavicon.href = theme.favicon_url;
      } else {
        // Create new favicon link
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = theme.favicon_url;
        document.head.appendChild(link);
      }
    }
  }, [theme?.favicon_url]);

  return <>{children}</>;
}