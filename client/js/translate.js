// ===== One-Click Translation =====

import { fetchJSON, escapeHtml } from './utils.js';

var LANGS = null;

async function getLangs() {
  if (LANGS) return LANGS;
  try {
    LANGS = await fetchJSON('/api/translate/langs');
  } catch (e) {
    LANGS = { 'zh': '中文', 'en': 'English', 'ja': '日本語', 'ko': '한국어', 'fr': 'Français', 'de': 'Deutsch', 'es': 'Español' };
  }
  return LANGS;
}

/**
 * Create a translate button for a content block
 * @param {HTMLElement} contentEl - The element containing text to translate
 * @param {string} [contentType='post'] - 'post' or 'feed'
 * @param {number} [contentId] - ID for caching
 */
export async function addTranslateButton(contentEl, contentType, contentId) {
  var langs = await getLangs();
  var currentLang = localStorage.getItem('whaiblog-lang') || 'zh';
  // Default target: if page is Chinese, translate to English; otherwise to Chinese
  var defaultTarget = currentLang === 'zh' ? 'en' : 'zh';

  // Create wrapper
  var wrapper = document.createElement('div');
  wrapper.className = 'translate-wrapper';

  // Create button
  var btn = document.createElement('button');
  btn.className = 'translate-btn';
  btn.innerHTML = '&#x1f30d; Translate';
  btn.title = 'Translate this content';

  // Create language selector (hidden by default)
  var selector = document.createElement('div');
  selector.className = 'translate-selector';
  selector.style.display = 'none';

  var langKeys = Object.keys(langs);
  for (var i = 0; i < langKeys.length; i++) {
    var key = langKeys[i];
    var opt = document.createElement('button');
    opt.className = 'translate-lang-opt' + (key === defaultTarget ? ' active' : '');
    opt.setAttribute('data-lang', key);
    opt.textContent = langs[key];
    opt.addEventListener('click', function() {
      var lang = this.getAttribute('data-lang');
      doTranslate(contentEl, lang, btn, wrapper);
      selector.style.display = 'none';
    });
    selector.appendChild(opt);
  }

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (selector.style.display === 'none') {
      selector.style.display = 'flex';
    } else {
      // Direct translate to default target
      doTranslate(contentEl, defaultTarget, btn, wrapper);
      selector.style.display = 'none';
    }
  });

  // Close selector on outside click
  document.addEventListener('click', function() {
    selector.style.display = 'none';
  });

  wrapper.appendChild(btn);
  wrapper.appendChild(selector);

  // Insert before the content
  contentEl.parentNode.insertBefore(wrapper, contentEl);
}

/**
 * Perform translation
 */
async function doTranslate(el, targetLang, btn, wrapper) {
  var originalText = el.textContent.trim();
  if (!originalText) return;

  // Check cache
  var cacheKey = 'translate-' + hashCode(originalText) + '-' + targetLang;
  var cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    applyTranslation(el, cached, targetLang, wrapper);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '&#x23f3; Translating...';

  try {
    // Split long text into chunks
    var chunks = splitText(originalText, 4000);
    var results = [];

    for (var i = 0; i < chunks.length; i++) {
      var res = await fetchJSON('/api/translate?text=' + encodeURIComponent(chunks[i]) + '&to=' + targetLang);
      results.push(res.translated);
    }

    var translated = results.join('\n');

    // Cache
    sessionStorage.setItem(cacheKey, translated);

    applyTranslation(el, translated, targetLang, wrapper);
  } catch (e) {
    btn.innerHTML = '&#x26a0; Failed';
    setTimeout(function() {
      btn.innerHTML = '&#x1f30d; Translate';
      btn.disabled = false;
    }, 2000);
  }
}

function applyTranslation(el, translated, lang, wrapper) {
  // Store original for restore
  if (!el.getAttribute('data-original')) {
    el.setAttribute('data-original', el.innerHTML);
  }

  // Replace content
  el.innerHTML = '<div class="translate-result">' + escapeHtml(translated).replace(/\n/g, '<br>') + '</div>';

  // Update button to show restore option
  var btn = wrapper.querySelector('.translate-btn');
  btn.disabled = false;
  btn.innerHTML = '&#x1f4ac; Translated → ' + lang.toUpperCase();
  btn.onclick = function(e) {
    e.stopPropagation();
    el.innerHTML = el.getAttribute('data-original');
    el.removeAttribute('data-original');
    btn.innerHTML = '&#x1f30d; Translate';
    btn.onclick = null; // will be re-bound by the outer handler
  };
}

function splitText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  var chunks = [];
  var paragraphs = text.split(/\n\n+/);
  var current = '';
  for (var i = 0; i < paragraphs.length; i++) {
    if ((current + '\n\n' + paragraphs[i]).length > maxLen && current) {
      chunks.push(current);
      current = paragraphs[i];
    } else {
      current = current ? current + '\n\n' + paragraphs[i] : paragraphs[i];
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function hashCode(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
