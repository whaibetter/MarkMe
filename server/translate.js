// ===== Translation Service =====
// Free translation using multiple APIs with fallback

const https = require('https');
const http = require('http');

// Supported languages
const LANGS = {
  'zh': 'Chinese',
  'en': 'English',
  'ja': 'Japanese',
  'ko': 'Korean',
  'fr': 'French',
  'de': 'German',
  'es': 'Spanish',
  'ru': 'Russian',
  'pt': 'Portuguese',
  'ar': 'Arabic'
};

/**
 * Make HTTP(S) request with timeout
 */
function httpGet(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/**
 * MyMemory API - primary, no key required, 5000 chars/day anonymous
 */
async function translateMyMemory(text, from, to) {
  const encoded = encodeURIComponent(text);
  const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${from}|${to}`;
  const raw = await httpGet(url);
  const data = JSON.parse(raw);

  if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
    const result = data.responseData.translatedText;
    // MyMemory sometimes returns all-caps garbage on failure
    if (result === text.toUpperCase() && text !== text.toUpperCase()) {
      throw new Error('MyMemory returned unchanged text');
    }
    return result;
  }
  throw new Error(data.responseDetails || 'MyMemory translation failed');
}

/**
 * Lingva Translate - open source Google Translate frontend
 */
async function translateLingva(text, from, to) {
  const encoded = encodeURIComponent(text);
  // Multiple Lingva instances for fallback
  const instances = [
    'https://lingva.ml',
    'https://translate.ignou.website',
    'https://translate.projectsegfau.lt'
  ];

  for (const host of instances) {
    try {
      const url = `${host}/api/v1/${from}/${to}/${encoded}`;
      const raw = await httpGet(url, 10000);
      const data = JSON.parse(raw);
      if (data.translation) return data.translation;
    } catch (e) {
      continue; // try next instance
    }
  }
  throw new Error('All Lingva instances failed');
}

/**
 * Auto-detect language (simple heuristic)
 */
function detectLang(text) {
  const chinese = (text.match(/[一-鿿]/g) || []).length;
  const japanese = (text.match(/[぀-ゟ゠-ヿ]/g) || []).length;
  const korean = (text.match(/[가-힯ᄀ-ᇿ]/g) || []).length;
  const total = text.length;

  if (japanese > 0) return 'ja';
  if (korean > 0) return 'ko';
  if (chinese / total > 0.1) return 'zh';
  return 'en';
}

/**
 * Translate text with automatic fallback
 * @param {string} text - Text to translate
 * @param {string} to - Target language code (zh, en, ja, etc.)
 * @param {string} [from] - Source language (auto-detect if omitted)
 * @returns {Promise<{translated: string, from: string, to: string, engine: string}>}
 */
async function translate(text, to, from) {
  if (!text || !text.trim()) {
    return { translated: '', from: from || 'en', to, engine: 'none' };
  }

  // Truncate very long text to avoid API limits
  const maxLen = 4500;
  const truncated = text.length > maxLen ? text.substring(0, maxLen) + '...' : text;

  const srcLang = from || detectLang(truncated);
  if (srcLang === to) {
    return { translated: truncated, from: srcLang, to, engine: 'same' };
  }

  const errors = [];

  // Try MyMemory first
  try {
    const result = await translateMyMemory(truncated, srcLang, to);
    return { translated: result, from: srcLang, to, engine: 'mymemory' };
  } catch (e) {
    errors.push('MyMemory: ' + e.message);
  }

  // Fallback to Lingva
  try {
    const result = await translateLingva(truncated, srcLang, to);
    return { translated: result, from: srcLang, to, engine: 'lingva' };
  } catch (e) {
    errors.push('Lingva: ' + e.message);
  }

  throw new Error('All translation engines failed: ' + errors.join('; '));
}

module.exports = { translate, detectLang, LANGS };
