/* LAN Lab — light/dark theme toggle.
   Works alongside the inline <head> script that applies the saved theme
   synchronously to avoid a flash on page load. Vanilla JS, no libraries. */

(function () {
  'use strict';

  const STORAGE_KEY = 'lanlab-theme';

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Tell the browser which colour scheme is active (form controls, scrollbars).
    document.documentElement.style.colorScheme = theme;
    // Keep the address-bar / status-bar colour in sync.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f7f8fa' : '#0f1419');
    }
    // Update the toggle button's aria label so screen readers describe the
    // *action* (what clicking will do) rather than the current state.
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute(
        'aria-label',
        theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
      );
      btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    }
    // Notify other scripts (e.g. the hero canvas) so they can re-read --accent.
    window.dispatchEvent(new Event('themechange'));
  }

  function init() {
    // Make sure aria state / meta colour match what the inline boot script set.
    applyTheme(currentTheme());

    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* private mode */ }
      applyTheme(next);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
