var API = '/api';
var currentPage = 1;
var limit = 10;
var scrollProgressHandler = null;

console.log('app.js v6 loaded');

// ===== THEME MANAGEMENT =====
function initTheme() {
  var saved = localStorage.getItem('markme-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('markme-theme', next);
}

// ===== READING PROGRESS =====
function calcReadingTime(content) {
  if (!content) return 1;
  var text = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/[#*_~>\[\]()!]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  var chineseChars = (text.match(/[一-鿿]/g) || []).length;
  var nonChinese = text.length - chineseChars;
  var minutes = (chineseChars / 400) + (nonChinese / 200);
  return Math.max(1, Math.ceil(minutes));
}

function setupReadingProgress() {
  cleanupReadingProgress();
  var progressBar = document.getElementById('reading-progress');
  if (!progressBar) return;
  progressBar.classList.add('active');

  scrollProgressHandler = function() {
    var content = document.querySelector('.post-content');
    if (!content) return;
    var rect = content.getBoundingClientRect();
    var contentTop = rect.top + window.scrollY;
    var contentHeight = content.offsetHeight;
    var scrolled = window.scrollY - contentTop;
    var total = contentHeight - window.innerHeight;
    var pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
    progressBar.style.setProperty('--progress', pct + '%');
  };
  window.addEventListener('scroll', scrollProgressHandler, { passive: true });
  scrollProgressHandler();
}

function cleanupReadingProgress() {
  if (scrollProgressHandler) {
    window.removeEventListener('scroll', scrollProgressHandler);
    scrollProgressHandler = null;
  }
  var progressBar = document.getElementById('reading-progress');
  if (progressBar) {
    progressBar.classList.remove('active');
    progressBar.style.setProperty('--progress', '0%');
  }
}

// ===== UTILITIES =====
function fetchJSON(url) {
  return fetch(url).then(function(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  });
}

function stripMd(text) {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/!?\[.*?\]\(.+?\)/g, '')
    .trim();
}

function formatDate(dateStr) {
  var d = new Date(dateStr);
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

function renderMd(text) {
  if (typeof marked !== 'undefined') {
    return marked.parse(text);
  }
  return '<p>' + text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
}

function typesetMath(el) {
  if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
    MathJax.typesetPromise([el]).catch(function(err) {
      console.error('MathJax typeset error:', err);
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ===== TOC =====
var tocObserver = null;

function buildTocHtml(items) {
  var html = '<div class="toc-title">目录</div>';
  html += '<ul class="toc-list">';
  for (var i = 0; i < items.length; i++) {
    var cls = items[i].level === 'h3' ? 'toc-link toc-h3' : 'toc-link';
    html += '<li><a class="' + cls + '" href="#' + items[i].id + '">' +
            escapeHtml(items[i].text) + '</a></li>';
  }
  html += '</ul>';
  return html;
}

function createMobileToc(items) {
  removeMobileToc();

  var btn = document.createElement('button');
  btn.className = 'toc-mobile-btn';
  btn.innerHTML = '&#9776;';
  btn.setAttribute('aria-label', '目录');
  document.body.appendChild(btn);

  var overlay = document.createElement('div');
  overlay.className = 'toc-overlay';
  document.body.appendChild(overlay);

  var panel = document.createElement('div');
  panel.className = 'toc-mobile-panel';
  var panelHtml = '<button class="toc-mobile-close">&times;</button>';
  panelHtml += buildTocHtml(items);
  panel.innerHTML = panelHtml;
  document.body.appendChild(panel);

  btn.addEventListener('click', function() {
    overlay.classList.add('open');
    panel.classList.add('open');
  });

  function closePanel() {
    overlay.classList.remove('open');
    panel.classList.remove('open');
  }

  overlay.addEventListener('click', closePanel);
  panel.querySelector('.toc-mobile-close').addEventListener('click', closePanel);

  var links = panel.querySelectorAll('.toc-link');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', closePanel);
  }
}

function removeMobileToc() {
  var existing = document.querySelectorAll('.toc-mobile-btn, .toc-overlay, .toc-mobile-panel');
  for (var i = 0; i < existing.length; i++) {
    existing[i].remove();
  }
}

function setupScrollSpy(items) {
  var links = document.querySelectorAll('.toc-link');
  var headingEls = [];
  for (var i = 0; i < items.length; i++) {
    var el = document.getElementById(items[i].id);
    if (el) headingEls.push(el);
  }

  tocObserver = new IntersectionObserver(function(entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        var id = entries[i].target.id;
        for (var j = 0; j < links.length; j++) {
          links[j].classList.remove('active');
          if (links[j].getAttribute('href') === '#' + id) {
            links[j].classList.add('active');
          }
        }
      }
    }
  }, {
    rootMargin: '-20% 0px -70% 0px'
  });

  for (var k = 0; k < headingEls.length; k++) {
    tocObserver.observe(headingEls[k]);
  }
}

// ===== ROUTING =====
function init() {
  console.log('init called');
  var app = document.getElementById('app');
  var main = document.querySelector('.main');
  if (main) main.classList.remove('post-page');
  removeMobileToc();
  cleanupReadingProgress();
  if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }
  initTheme();

  var path = window.location.pathname;
  var search = window.location.search;
  console.log('Path:', path, 'Search:', search);

  if (path === '/tags') {
    showTags(app);
  } else if (path.indexOf('/post/') === 0) {
    var id = path.split('/')[2];
    showPost(app, id);
  } else if (search.indexOf('tag=') >= 0) {
    var params = new URLSearchParams(search);
    var tag = params.get('tag');
    showTagPosts(app, tag);
  } else {
    showHome(app);
  }
}

// ===== PAGES =====
function showHome(app) {
  console.log('showHome');
  Promise.all([
    fetchJSON(API + '/posts?page=' + currentPage + '&limit=' + limit),
    fetchJSON(API + '/stats'),
    fetchJSON(API + '/tags')
  ]).then(function(results) {
    var data = results[0];
    var stats = results[1];
    var tags = results[2];
    console.log('Got posts:', data.posts.length);

    var html = '';

    // Hero section
    html += '<section class="hero">';
    html += '<div class="hero-content">';
    html += '<p class="hero-greeting hero-reveal" style="animation-delay:0.1s">Welcome to</p>';
    html += '<h1 class="hero-title hero-reveal" style="animation-delay:0.3s">MarkMe</h1>';
    html += '<p class="hero-tagline hero-reveal" style="animation-delay:0.5s">A space for thoughts and words</p>';
    html += '<div class="hero-stats hero-reveal" style="animation-delay:0.7s">';
    html += '<span class="hero-stat"><span class="hero-stat-num">' + stats.posts + '</span> articles</span>';
    html += '<span class="hero-stat-sep"></span>';
    html += '<span class="hero-stat"><span class="hero-stat-num">' + tags.length + '</span> topics</span>';
    html += '</div>';
    html += '</div>';
    html += '</section>';

    // Post list
    html += '<div class="post-list">';

    if (data.posts.length === 0) {
      html += '<p style="text-align:center;color:var(--text-muted);font-weight:300;padding:40px 0;">暂无文章</p>';
    }

    for (var i = 0; i < data.posts.length; i++) {
      var p = data.posts[i];
      var postTags = [];
      try { postTags = JSON.parse(p.tags || '[]'); } catch(e) {}

      html += '<article class="post-card">';
      html += '<h2><a href="/post/' + p.id + '" data-link>' + escapeHtml(p.title) + '</a></h2>';
      html += '<div class="post-meta">' + formatDate(p.created_at) + '</div>';
      html += '<div class="post-summary">' + escapeHtml(stripMd(p.summary || '')) + '</div>';

      if (postTags.length > 0) {
        html += '<div class="tags">';
        for (var j = 0; j < postTags.length; j++) {
          html += '<span class="tag" onclick="goTag(\'' + escapeHtml(postTags[j]) + '\')">' + escapeHtml(postTags[j]) + '</span>';
        }
        html += '</div>';
      }

      html += '</article>';
    }

    html += '</div>';
    app.innerHTML = html;
  }).catch(function(err) {
    console.error('Error:', err);
    app.innerHTML = '<div class="error"><p>加载失败: ' + err.message + '</p></div>';
  });
}

function showPost(app, id) {
  console.log('showPost:', id);
  document.querySelector('.main').classList.add('post-page');
  fetchJSON(API + '/posts/' + id)
    .then(function(post) {
      console.log('Got post:', post.title);
      var tags = [];
      try { tags = JSON.parse(post.tags || '[]'); } catch(e) {}

      var html = '<a href="/" class="back-link" data-link>&larr; 返回首页</a>';
      html += '<article class="post-detail">';
      html += '<h1>' + escapeHtml(post.title) + '</h1>';
      html += '<div class="post-meta">' + formatDate(post.created_at);
      html += '<span class="reading-time">' + calcReadingTime(post.content) + ' min read</span>';

      for (var i = 0; i < tags.length; i++) {
        html += ' <span class="tag" onclick="goTag(\'' + escapeHtml(tags[i]) + '\')">' + escapeHtml(tags[i]) + '</span>';
      }
      html += '</div>';
      html += '<div class="post-content">' + renderMd(post.content) + '</div>';

      if (post.files && post.files.length > 0) {
        html += '<div class="post-files">';
        html += '<h3>附件 (' + post.files.length + ')</h3>';
        html += '<div class="file-list">';

        for (var j = 0; j < post.files.length; j++) {
          var f = post.files[j];
          html += '<div class="file-item">';
          html += '<span class="file-icon">📄</span>';
          html += '<div class="file-info">';
          html += '<div class="file-name">' + escapeHtml(f.original_name) + '</div>';
          html += '<div class="file-size">' + formatSize(f.size) + '</div>';
          html += '</div>';
          html += '<a href="/uploads/' + f.filename + '" download="' + escapeHtml(f.original_name) + '" class="btn-download">下载</a>';
          html += '</div>';
        }

        html += '</div></div>';
      }

      html += '</article>';
      app.innerHTML = html;
      typesetMath(app);

      // Generate TOC
      var headings = app.querySelectorAll('.post-content h2, .post-content h3');
      var tocItems = [];
      for (var hi = 0; hi < headings.length; hi++) {
        var h = headings[hi];
        var slug = 'heading-' + hi + '-' + h.textContent.trim()
          .toLowerCase()
          .replace(/[^\w一-鿿]+/g, '-')
          .replace(/^-|-$/g, '');
        h.id = slug;
        tocItems.push({
          id: slug,
          text: h.textContent.trim(),
          level: h.tagName.toLowerCase()
        });
      }

      if (tocItems.length > 0) {
        var layout = document.createElement('div');
        layout.className = 'post-layout';
        while (app.firstChild) {
          layout.appendChild(app.firstChild);
        }
        var sidebar = document.createElement('aside');
        sidebar.className = 'toc-sidebar';
        sidebar.innerHTML = buildTocHtml(tocItems);
        layout.appendChild(sidebar);
        app.appendChild(layout);
        createMobileToc(tocItems);
        setupScrollSpy(tocItems);
      }

      setupReadingProgress();
    })
    .catch(function(err) {
      console.error('Error:', err);
      app.innerHTML = '<div class="error"><p>加载失败: ' + err.message + '</p></div>';
    });
}

function showTags(app) {
  console.log('showTags');
  fetchJSON(API + '/tags')
    .then(function(tags) {
      console.log('Got tags:', tags);
      var html = '<a href="/" class="back-link" data-link>&larr; 返回首页</a>';
      html += '<h2 class="tag-posts-title">标签</h2>';
      html += '<div class="tag-cloud">';

      if (tags.length === 0) {
        html += '<p style="color:var(--text-muted);font-weight:300;">暂无标签</p>';
      }

      for (var i = 0; i < tags.length; i++) {
        html += '<span class="tag" onclick="goTag(\'' + escapeHtml(tags[i]) + '\')">' + escapeHtml(tags[i]) + '</span>';
      }

      html += '</div>';
      app.innerHTML = html;
    })
    .catch(function(err) {
      console.error('Error:', err);
      app.innerHTML = '<div class="error"><p>加载失败: ' + err.message + '</p></div>';
    });
}

function showTagPosts(app, tag) {
  console.log('showTagPosts:', tag);
  fetchJSON(API + '/posts?tag=' + encodeURIComponent(tag))
    .then(function(data) {
      console.log('Got posts:', data.posts.length);
      var html = '<a href="/" class="back-link" data-link>&larr; 返回首页</a>';
      html += '<h2 class="tag-posts-title">标签: ' + escapeHtml(tag) + '</h2>';
      html += '<div class="post-list">';

      if (data.posts.length === 0) {
        html += '<p style="text-align:center;color:var(--text-muted);font-weight:300;padding:40px 0;">暂无文章</p>';
      }

      for (var i = 0; i < data.posts.length; i++) {
        var p = data.posts[i];
        html += '<article class="post-card">';
        html += '<h2><a href="/post/' + p.id + '" data-link>' + escapeHtml(p.title) + '</a></h2>';
        html += '<div class="post-meta">' + formatDate(p.created_at) + '</div>';
        html += '<div class="post-summary">' + escapeHtml(stripMd(p.summary || '')) + '</div>';
        html += '</article>';
      }

      html += '</div>';
      app.innerHTML = html;
    })
    .catch(function(err) {
      console.error('Error:', err);
      app.innerHTML = '<div class="error"><p>加载失败: ' + err.message + '</p></div>';
    });
}

// ===== NAVIGATION =====
function goTag(tag) {
  console.log('goTag:', tag);
  window.location.href = '/?tag=' + encodeURIComponent(tag);
}

document.addEventListener('click', function(e) {
  if (e.target.closest('.theme-toggle')) {
    toggleTheme();
    return;
  }
  var link = e.target;
  while (link && link.tagName !== 'A') {
    link = link.parentElement;
  }
  if (link && link.hasAttribute('data-link')) {
    e.preventDefault();
    var href = link.getAttribute('href');
    console.log('Navigate to:', href);
    history.pushState(null, '', href);
    init();
  }
});

window.addEventListener('popstate', init);

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem('markme-theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
