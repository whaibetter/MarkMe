// ===== Table of Contents =====

import { escapeHtml } from './utils.js';

var tocObserver = null;

export function buildTocHtml(items) {
  var html = '<div class="toc-title">Contents</div>';
  html += '<ul class="toc-list">';
  for (var i = 0; i < items.length; i++) {
    var cls = items[i].level === 'h3' ? 'toc-link toc-h3' : 'toc-link';
    html += '<li><a class="' + cls + '" href="#' + items[i].id + '">' +
            escapeHtml(items[i].text) + '</a></li>';
  }
  html += '</ul>';
  return html;
}

export function createMobileToc(items) {
  removeMobileToc();

  var btn = document.createElement('button');
  btn.className = 'toc-mobile-btn';
  btn.innerHTML = '&#9776;';
  btn.setAttribute('aria-label', 'Table of Contents');
  document.body.appendChild(btn);

  var overlay = document.createElement('div');
  overlay.className = 'toc-overlay';
  document.body.appendChild(overlay);

  var panel = document.createElement('div');
  panel.className = 'toc-mobile-panel';
  var panelHtml = '<button class="toc-mobile-close">&times;</button>';
  panelHtml += buildTocHtml(items);
  panel.innerHTML = panelHtml;
  document.body.appendChild(panel);

  btn.addEventListener('click', function() {
    overlay.classList.add('open');
    panel.classList.add('open');
  });

  function closePanel() {
    overlay.classList.remove('open');
    panel.classList.remove('open');
  }

  overlay.addEventListener('click', closePanel);
  panel.querySelector('.toc-mobile-close').addEventListener('click', closePanel);

  var links = panel.querySelectorAll('.toc-link');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', closePanel);
  }
}

export function removeMobileToc() {
  var existing = document.querySelectorAll('.toc-mobile-btn, .toc-overlay, .toc-mobile-panel');
  for (var i = 0; i < existing.length; i++) {
    existing[i].remove();
  }
}

export function setupScrollSpy(items) {
  var links = document.querySelectorAll('.toc-link');
  var headingEls = [];
  for (var i = 0; i < items.length; i++) {
    var el = document.getElementById(items[i].id);
    if (el) headingEls.push(el);
  }

  tocObserver = new IntersectionObserver(function(entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        var id = entries[i].target.id;
        for (var j = 0; j < links.length; j++) {
          links[j].classList.remove('active');
          if (links[j].getAttribute('href') === '#' + id) {
            links[j].classList.add('active');
          }
        }
      }
    }
  }, {
    rootMargin: '-20% 0px -70% 0px'
  });

  for (var k = 0; k < headingEls.length; k++) {
    tocObserver.observe(headingEls[k]);
  }
}

export function disconnectTocObserver() {
  if (tocObserver) {
    tocObserver.disconnect();
    tocObserver = null;
  }
}
