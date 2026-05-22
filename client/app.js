var API = '/api';
var currentPage = 1;
var limit = 10;

console.log('app.js v5 loaded');

function fetchJSON(url) {
  return fetch(url).then(function(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  });
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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function init() {
  console.log('init called');
  var app = document.getElementById('app');
  var main = document.querySelector('.main');
  if (main) main.classList.remove('post-page');
  removeMobileToc();
  if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }

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

function showHome(app) {
  console.log('showHome');
  fetchJSON(API + '/posts?page=' + currentPage + '&limit=' + limit)
    .then(function(data) {
      console.log('Got posts:', data.posts.length);
      var html = '<div class="post-list">';

      if (data.posts.length === 0) {
        html += '<p style="text-align:center;color:#666;">暂无文章</p>';
      }

      for (var i = 0; i < data.posts.length; i++) {
        var p = data.posts[i];
        var tags = [];
        try { tags = JSON.parse(p.tags || '[]'); } catch(e) {}

        html += '<article class="post-card">';
        html += '<h2><a href="/post/' + p.id + '" data-link>' + escapeHtml(p.title) + '</a></h2>';
        html += '<div class="post-meta">' + formatDate(p.created_at) + '</div>';
        html += '<div class="post-summary">' + escapeHtml(p.summary || '') + '</div>';

        if (tags.length > 0) {
          html += '<div class="tags">';
          for (var j = 0; j < tags.length; j++) {
            html += '<span class="tag" onclick="goTag(\'' + escapeHtml(tags[j]) + '\')">' + escapeHtml(tags[j]) + '</span>';
          }
          html += '</div>';
        }

        html += '</article>';
      }

      html += '</div>';
      app.innerHTML = html;
    })
    .catch(function(err) {
      console.error('Error:', err);
      app.innerHTML = '<p style="color:red">加载失败: ' + err.message + '</p>';
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
    })
    .catch(function(err) {
      console.error('Error:', err);
      app.innerHTML = '<p style="color:red">加载失败: ' + err.message + '</p>';
    });
}

function showTags(app) {
  console.log('showTags');
  fetchJSON(API + '/tags')
    .then(function(tags) {
      console.log('Got tags:', tags);
      var html = '<a href="/" class="back-link" data-link>&larr; 返回首页</a>';
      html += '<h2 style="margin:20px 0;">标签</h2>';
      html += '<div class="tags" style="gap:12px;">';

      if (tags.length === 0) {
        html += '<p style="color:#666;">暂无标签</p>';
      }

      for (var i = 0; i < tags.length; i++) {
        html += '<span class="tag" style="font-size:16px;padding:8px 16px;cursor:pointer;" onclick="goTag(\'' + escapeHtml(tags[i]) + '\')">' + escapeHtml(tags[i]) + '</span>';
      }

      html += '</div>';
      app.innerHTML = html;
    })
    .catch(function(err) {
      console.error('Error:', err);
      app.innerHTML = '<p style="color:red">加载失败: ' + err.message + '</p>';
    });
}

function showTagPosts(app, tag) {
  console.log('showTagPosts:', tag);
  fetchJSON(API + '/posts?tag=' + encodeURIComponent(tag))
    .then(function(data) {
      console.log('Got posts:', data.posts.length);
      var html = '<a href="/" class="back-link" data-link>&larr; 返回首页</a>';
      html += '<h2 style="margin:20px 0;">标签: ' + escapeHtml(tag) + '</h2>';
      html += '<div class="post-list">';

      if (data.posts.length === 0) {
        html += '<p style="text-align:center;color:#666;">暂无文章</p>';
      }

      for (var i = 0; i < data.posts.length; i++) {
        var p = data.posts[i];
        html += '<article class="post-card">';
        html += '<h2><a href="/post/' + p.id + '" data-link>' + escapeHtml(p.title) + '</a></h2>';
        html += '<div class="post-meta">' + formatDate(p.created_at) + '</div>';
        html += '<div class="post-summary">' + escapeHtml(p.summary || '') + '</div>';
        html += '</article>';
      }

      html += '</div>';
      app.innerHTML = html;
    })
    .catch(function(err) {
      console.error('Error:', err);
      app.innerHTML = '<p style="color:red">加载失败: ' + err.message + '</p>';
    });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 跳转到标签页面
function goTag(tag) {
  console.log('goTag:', tag);
  window.location.href = '/?tag=' + encodeURIComponent(tag);
}

// 点击链接处理
document.addEventListener('click', function(e) {
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

// 前进后退
window.addEventListener('popstate', init);

// 启动
document.addEventListener('DOMContentLoaded', init);
