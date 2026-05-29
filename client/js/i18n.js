// ===== Internationalization =====

var currentLang = 'en';

var translations = {
  en: {
    // Nav
    'nav.feed': 'Feed',
    'nav.blogs': 'Blogs',
    'nav.topics': 'Topics',
    'nav.notes': 'Notes',
    'nav.about': 'About',
    // Feed page
    'feed.issue': 'Information Flow',
    'feed.title': 'Feed',
    'feed.subtitle': 'Curated news and insights',
    'feed.items': 'Items',
    'feed.empty': 'No feed items yet',
    // Blog page
    'blog.issue': 'Personal Blog',
    'blog.title': "Wenhai's Blog",
    'blog.subtitle': 'Thoughts, ideas, and the written word',
    'blog.articles': 'Articles',
    'blog.pages': 'Pages',
    'blog.empty': 'No articles yet',
    // Common
    'common.prev': 'Prev',
    'common.next': 'Next',
    'common.loading': 'Loading...',
    'common.error': 'Failed to load',
    // Tags
    'tags.title': 'Topics',
    'tags.empty': 'No tags yet',
    // Profile
    'profile.loading': 'Loading profile',
    'profile.error': 'Unable to load profile',
    // Notes
    'notes.title': 'Notes',
    'notes.loading': 'Loading notes...',
  },
  zh: {
    // Nav
    'nav.feed': '信息流',
    'nav.blogs': '博客',
    'nav.topics': '话题',
    'nav.notes': '笔记',
    'nav.about': '关于',
    // Feed page
    'feed.issue': '信息动态',
    'feed.title': '信息流',
    'feed.subtitle': '精选资讯与洞察',
    'feed.items': '条目',
    'feed.empty': '暂无信息流',
    // Blog page
    'blog.issue': '个人博客',
    'blog.title': 'Wenhai 的博客',
    'blog.subtitle': '思考、想法与文字',
    'blog.articles': '文章',
    'blog.pages': '页',
    'blog.empty': '暂无文章',
    // Common
    'common.prev': '上一页',
    'common.next': '下一页',
    'common.loading': '加载中...',
    'common.error': '加载失败',
    // Tags
    'tags.title': '话题',
    'tags.empty': '暂无标签',
    // Profile
    'profile.loading': '加载个人主页',
    'profile.error': '无法加载个人主页',
    // Notes
    'notes.title': '笔记',
    'notes.loading': '加载笔记中...',
  }
};

export function initLang() {
  var saved = localStorage.getItem('markme-lang');
  if (saved && translations[saved]) {
    currentLang = saved;
  }
  updateLangLabel();
  updateNavText();
}

export function setLang(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem('markme-lang', lang);
  updateLangLabel();
  updateNavText();
}

export function getLang() {
  return currentLang;
}

export function t(key) {
  var dict = translations[currentLang] || translations.en;
  return dict[key] || translations.en[key] || key;
}

export function toggleLang() {
  setLang(currentLang === 'en' ? 'zh' : 'en');
}

function updateLangLabel() {
  var label = document.querySelector('.lang-label');
  if (label) label.textContent = currentLang === 'en' ? 'EN' : '中';
}

function updateNavText() {
  var navLinks = document.querySelectorAll('.nav a[data-section]');
  for (var i = 0; i < navLinks.length; i++) {
    var section = navLinks[i].getAttribute('data-section');
    var key = 'nav.' + section;
    navLinks[i].textContent = t(key);
  }
}
