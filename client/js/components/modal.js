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
  modal.innerHTML =
    '<div class="preview-overlay"></div>' +
    '<div class="preview-container preview-container--wide">' +
      '<div class="preview-header">' +
        '<span>' + escapeHtml(title) + '</span>' +
        '<button class="preview-close">&times;</button>' +
      '</div>' +
      '<div class="preview-content preview-content--html">' +
        '<iframe class="html-embed-frame" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" srcdoc="' + escapeAttr(wrapHtml(htmlContent)) + '"></iframe>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  modal.querySelector('.preview-overlay').addEventListener('click', closeModal);
  modal.querySelector('.preview-close').addEventListener('click', closeModal);

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

function wrapHtml(html) {
  return html.replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
