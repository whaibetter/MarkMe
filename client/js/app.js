// ===== WhaiBlog App Entry Point =====

import { init, goTag } from './router.js';
import { toggleTheme, createThemeDropdown, bindDropdownEvents } from './theme.js';
import { initAnimations, cleanupAnimations } from './animations.js';

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
    cleanupAnimations();
    history.pushState(null, '', href);
    init();
  }
});

// Browser back/forward
window.addEventListener('popstate', function() {
  cleanupAnimations();
  init();
});

// System theme change
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem('markme-theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
}

// Header scroll effect
var header = document.querySelector('.header');
if (header) {
  var lastScroll = 0;
  window.addEventListener('scroll', function() {
    var scrollY = window.scrollY;
    if (scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScroll = scrollY;
  }, { passive: true });
}

// Inject theme dropdown into toggle button
function setupThemeDropdown() {
  var toggle = document.querySelector('.theme-toggle');
  if (toggle && !toggle.querySelector('.theme-dropdown')) {
    toggle.insertAdjacentHTML('beforeend', createThemeDropdown());
    bindDropdownEvents();
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  init();
  initAnimations();
  setupThemeDropdown();
});
