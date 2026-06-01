// ===== Modal Utility =====

import { renderMd } from '../utils.js';

export function openModal(title, contentHtml) {
  closeModal();

  var modal = document.createElement('div');
  modal.className = 'preview-modal';
  modal.innerHTML =
    '<div class="preview-overlay"></div>' +
    '<div class="preview-container">' +
      '<div class="preview-header">' +
        '<span>' + escapeHtml(title) + '</span>' +
        '<button class="preview-close">&times;</button>' +
      '</div>' +
      '<div class="preview-content">' +
        '<div class="markdown-preview">' + contentHtml + '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  modal.querySelector('.preview-overlay').addEventListener('click', closeModal);
  modal.querySelector('.preview-close').addEventListener('click', closeModal);

  document.addEventListener('keydown', onEsc);
}

export function openMarkdownModal(title, markdownContent) {
  openModal(title, renderMd(markdownContent));
}

export function openHtmlModal(title, htmlContent) {
  closeModal();

  var modal = document.createElement('div');
  modal.className = 'preview-modal';

  // Build modal shell
  var overlay = document.createElement('div');
  overlay.className = 'preview-overlay';

  var container = document.createElement('div');
  container.className = 'preview-container preview-container--wide';

  var header = document.createElement('div');
  header.className = 'preview-header';
  header.innerHTML = '<span>' + escapeHtml(title) + '</span><button class="preview-close">&times;</button>';

  var content = document.createElement('div');
  content.className = 'preview-content preview-content--html';

  // Build iframe with srcdoc set via property (avoids HTML entity escaping issues)
  var iframe = document.createElement('iframe');
  iframe.className = 'html-embed-frame';
  // No sandbox — content is from our own database, styles need full access
  iframe.srcdoc = htmlContent;

  // Auto-resize iframe to fit content
  iframe.addEventListener('load', function() {
    try {
      var doc = iframe.contentDocument || iframe.contentWindow.document;
      if (doc && doc.body) {
        var h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
        iframe.style.height = Math.min(h + 20, window.innerHeight * 0.88) + 'px';
      }
    } catch(e) {}
  });

  content.appendChild(iframe);
  container.appendChild(header);
  container.appendChild(content);
  modal.appendChild(overlay);
  modal.appendChild(container);
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  overlay.addEventListener('click', closeModal);
  header.querySelector('.preview-close').addEventListener('click', closeModal);

  document.addEventListener('keydown', onEsc);
}

export function openTextModal(title, textContent) {
  openModal(title, '<pre class="text-preview">' + escapeHtml(textContent) + '</pre>');
}

export function openFeedModal(title, content, format) {
  switch (format) {
    case 'html':
      openHtmlModal(title, content);
      break;
    case 'text':
      openTextModal(title, content);
      break;
    default:
      openMarkdownModal(title, content);
  }
}

export function closeModal() {
  var modal = document.querySelector('.preview-modal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
  document.removeEventListener('keydown', onEsc);
}

function onEsc(e) {
  if (e.key === 'Escape') closeModal();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
