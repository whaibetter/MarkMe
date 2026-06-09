// ===== Modal Utility =====

import { renderMd } from '../utils.js';
import { addTranslateButton } from '../translate.js';

export function openModal(title, contentHtml, enableTranslate) {
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

  // Add translate button to modal content
  if (enableTranslate !== false) {
    var previewContent = modal.querySelector('.markdown-preview');
    if (previewContent) {
      addTranslateButton(previewContent, 'feed');
    }
  }

  modal.querySelector('.preview-overlay').addEventListener('click', closeModal);
  modal.querySelector('.preview-close').addEventListener('click', closeModal);

  document.addEventListener('keydown', onEsc);
}

export function openMarkdownModal(title, markdownContent) {
  openModal(title, renderMd(markdownContent));
}

export function openHtmlModal(title, htmlContent) {
  closeModal();

  // Extract body content from full HTML document
  var bodyContent = htmlContent;
  var bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    bodyContent = bodyMatch[1];
  }

  // Extract <style> tags to inject separately
  var styles = '';
  var styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  var sm;
  while ((sm = styleRegex.exec(htmlContent)) !== null) {
    styles += sm[1];
  }

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

  // Inject extracted styles scoped to this container
  if (styles) {
    var styleEl = document.createElement('style');
    styleEl.textContent = styles;
    content.appendChild(styleEl);
  }

  // Render body content directly
  var wrapper = document.createElement('div');
  wrapper.className = 'html-embed-root';
  wrapper.innerHTML = bodyContent;
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
  // Auto-detect HTML content even when format is 'markdown'
  var isHtml = format === 'html' || (content && /^\s*<[a-z][\s\S]*>/i.test(content));
  if (isHtml) {
    openHtmlModal(title, content);
  } else if (format === 'text') {
    openTextModal(title, content);
  } else {
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
