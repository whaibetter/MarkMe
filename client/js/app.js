// ===== MarkMe App Entry Point =====

import { init, goTag } from './router.js';
import { toggleTheme } from './theme.js';

// Navigation event handling
document.addEventListener('click', function(e) {
  if (e.target.closest('.theme-toggle')) {
    toggleTheme();
    return;
  }
  var link = e.target;
  while (link && link.tagName !== 'A') {
    link = link.parentElement;
  }
  if (link && link.hasAttribute('data-link')) {
    e.preventDefault();
    var href = link.getAttribute('href');
    console.log('Navigate to:', href);
    history.pushState(null, '', href);
    init();
  }
});

// Browser back/forward
window.addEventListener('popstate', init);

// System theme change
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem('markme-theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
