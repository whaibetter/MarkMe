// ===== Internationalization =====

var currentLang = 'en';

var translations = {
  en: {
    // Nav
    'nav.feed': 'Feed',
    'nav.blogs': 'Blogs',
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
    'blog.filterByTag': 'Filter by tag',
    'blog.showing': 'Showing',
    'blog.clearFilter': 'Show all',
    'blog.emptyTag': 'No articles with this tag',
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
    // RSS Reader
    'rss.issue': 'RSS Reader',
    'rss.title': 'RSS',
    'rss.subtitle': 'Subscribe to feeds, auto-fetch content',
    'rss.sources': 'Subscription Sources',
    'rss.recentItems': 'Recent Items',
    'rss.subscribeLinks': 'Subscribe Links',
    'rss.postsFeed': 'Blog Posts',
    'rss.feedsFeed': 'Feed Items',
    'rss.allFeed': 'All Content',
    'rss.addSource': 'Add Source',
    'rss.fetchAll': 'Fetch All',
    'rss.fetch': 'Fetch',
    'rss.enable': 'Enable',
    'rss.disable': 'Disable',
    'rss.remove': 'Remove',
    'rss.add': 'Add',
    'rss.cancel': 'Cancel',
    'rss.urlPlaceholder': 'RSS feed URL',
    'rss.titlePlaceholder': 'Title (optional)',
    'rss.noSources': 'No RSS sources yet. Add one to start subscribing.',
    'rss.noItems': 'No RSS items yet. Click "Fetch All" to pull content.',
    'rss.lastFetch': 'Last fetch',
    'rss.never': 'Never',
    'rss.active': 'Active',
    'rss.disabled': 'Disabled',
    'rss.original': 'Original',
    'rss.adminMode': 'Admin Mode',
    'rss.readOnly': 'Read Only',
    'rss.login': 'Login',
    'rss.logout': 'Logout',
    'rss.keyPlaceholder': 'Enter API Key',
    'rss.confirm': 'Confirm',
  },
  zh: {
    // Nav
    'nav.feed': '信息流',
    'nav.blogs': '博客',
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
    'blog.filterByTag': '按标签筛选',
    'blog.showing': '当前',
    'blog.clearFilter': '显示全部',
    'blog.emptyTag': '该标签下暂无文章',
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
    // RSS Reader
    'rss.issue': 'RSS 阅读器',
    'rss.title': 'RSS',
    'rss.subtitle': '订阅信息源，自动抓取内容',
    'rss.sources': '订阅源',
    'rss.recentItems': '最近条目',
    'rss.subscribeLinks': '订阅链接',
    'rss.postsFeed': '博客文章',
    'rss.feedsFeed': '信息流',
    'rss.allFeed': '全部内容',
    'rss.addSource': '添加源',
    'rss.fetchAll': '全部抓取',
    'rss.fetch': '抓取',
    'rss.enable': '启用',
    'rss.disable': '禁用',
    'rss.remove': '删除',
    'rss.add': '添加',
    'rss.cancel': '取消',
    'rss.urlPlaceholder': 'RSS 订阅源 URL',
    'rss.titlePlaceholder': '标题（可选）',
    'rss.noSources': '还没有订阅源，添加一个开始订阅吧。',
    'rss.noItems': '还没有 RSS 条目，点击"全部抓取"拉取内容。',
    'rss.lastFetch': '上次抓取',
    'rss.never': '从未',
    'rss.active': '启用',
    'rss.disabled': '禁用',
    'rss.original': '原文',
    'rss.adminMode': '管理员模式',
    'rss.readOnly': '只读模式',
    'rss.login': '登录',
    'rss.logout': '退出',
    'rss.keyPlaceholder': '输入 API Key',
    'rss.confirm': '确认',
  }
};

export function initLang() {
  var saved = localStorage.getItem('whaiblog-lang');
  if (saved && translations[saved]) {
    currentLang = saved;
  }
  updateLangLabel();
  updateNavText();
}

export function setLang(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem('whaiblog-lang', lang);
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
