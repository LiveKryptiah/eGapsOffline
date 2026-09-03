/**
 * ==============================================================================
 * THEME.JS - Universal Light & Dark Mode Manager for eRPAS
 * Default: Light Mode | Persisted in localStorage ('rpas_theme')
 * ==============================================================================
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'rpas_theme';

  function getSavedTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'light';
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
    updateToggleButtons(theme);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  function updateToggleButtons(theme) {
    const buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(btn => {
      if (theme === 'dark') {
        btn.setAttribute('title', 'Switch to Light Mode (Default)');
        btn.innerHTML = `
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        `;
      } else {
        btn.setAttribute('title', 'Switch to Dark Mode (Green Deck)');
        btn.innerHTML = `
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        `;
      }
    });
  }

  window.toggleTheme = function () {
    const current = getSavedTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  window.setTheme = function (theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  };

  // Run on initial load
  const initialTheme = getSavedTheme();
  applyTheme(initialTheme);

  document.addEventListener('DOMContentLoaded', () => {
    updateToggleButtons(getSavedTheme());
  });

})();
