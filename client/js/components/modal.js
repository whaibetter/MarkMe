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
