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

  var overlay = document.createElement('div');
  overlay.className = 'preview-overlay';

  var container = document.createElement('div');
  container.className = 'preview-container preview-container--wide';

  var header = document.createElement('div');
  header.className = 'preview-header';
  header.innerHTML = '<span>' + escapeHtml(title) + '</span><button class="preview-close">&times;</button>';

  var content = document.createElement('div');
  content.className = 'preview-content preview-content--html';

  // Render HTML directly — no iframe, avoids CSP/sandbox issues
  content.innerHTML = htmlContent;

  // Re-write the HTML into its own root to isolate styles
  // Extract the body content and wrap it
  var wrapper = document.createElement('div');
  wrapper.className = 'html-embed-root';
  wrapper.style.cssText = 'width:100%;min-height:60vh;overflow:auto;';
  wrapper.innerHTML = htmlContent;

  // Remove the content we just set, replace with wrapper
  content.removeChild(content.firstChild);
  content.appendChild(wrapper);

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
