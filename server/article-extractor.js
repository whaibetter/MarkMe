const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const cheerio = require('cheerio');

/**
 * 从 URL 提取文章正文内容
 * @param {string} url - 文章 URL
 * @returns {Promise<{title: string, content: string, textContent: string} | null>}
 */
async function extractArticle(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article && article.content) {
      return {
        title: article.title,
        content: article.content,
        textContent: article.textContent
      };
    }

    // Fallback: 使用 cheerio 提取主要内容
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside').remove();

    // 尝试常见的内容选择器
    const selectors = ['article', 'main', '.post-content', '.entry-content', '.article-body', '#content'];
    let content = '';

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.html();
        break;
      }
    }

    if (!content) {
      content = $('body').html();
    }

    return {
      title: $('title').text() || '',
      content: content || '',
      textContent: content ? cheerio.load(content).text() : ''
    };
  } catch (error) {
    console.error(`[ArticleExtractor] Error extracting ${url}:`, error.message);
    return null;
  }
}

/**
 * 检查内容是否过短（少于指定字数）
 * @param {string} content - 内容文本
 * @param {number} minLength - 最小字数（默认 100）
 * @returns {boolean}
 */
function isContentTooShort(content, minLength = 100) {
  if (!content) return true;
  const text = content.replace(/<[^>]*>/g, '').trim();
  return text.length < minLength;
}

module.exports = {
  extractArticle,
  isContentTooShort
};
