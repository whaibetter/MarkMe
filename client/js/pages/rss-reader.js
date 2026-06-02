// ===== RSS Reader Page =====

import { fetchJSON, escapeHtml, formatDate } from '../utils.js';
import { renderError } from '../components/error.js';
import { openFeedModal } from '../components/modal.js';
import { initAnimations, observeElements } from '../animations.js';
import { t } from '../i18n.js';

var appEl = null;
var authRequired = false;

function getApiKey() {
  return localStorage.getItem('whaiblog-rss-key') || '';
}

function setApiKey(key) {
  if (key) {
    localStorage.setItem('whaiblog-rss-key', key);
  } else {
    localStorage.removeItem('whaiblog-rss-key');
  }
}

function authHeaders() {
  var key = getApiKey();
  var h = { 'Content-Type': 'application/json' };
  if (key) h['Authorization'] = 'Bearer ' + key;
  return h;
}

function authFetch(url, opts) {
  opts = opts || {};
  opts.headers = authHeaders();
  return fetch(url, opts).then(function(r) {
    if (r.status === 401) {
      setApiKey('');
      loadPage();
      throw new Error('Unauthorized');
    }
    return r.json();
  });
}

export function showRssReader(app) {
  appEl = app;
  loadPage();
}

function loadPage() {
  Promise.all([
    fetchJSON('/api/rss/auth'),
    fetchJSON('/api/rss/sources'),
    fetchJSON('/api/feeds?limit=50')
  ]).then(function(results) {
    authRequired = results[0].required;
    var sources = results[1];
    var feeds = results[2];
    var isAdmin = !authRequired || !!getApiKey();
    var html = '';

    // Hero
    html += '<section class="hero">';
    html += '<div class="hero-content">';
    html += '<div class="hero-issue hero-reveal" style="animation-delay:0.1s">' + t('rss.issue') + '</div>';
    html += '<h1 class="hero-title hero-reveal" style="animation-delay:0.2s">' + t('rss.title') + '</h1>';
    html += '<p class="hero-subtitle hero-reveal" style="animation-delay:0.35s">' + t('rss.subtitle') + '</p>';
    html += '</div>';
    html += '</section>';

    // Auth bar (only when auth is required)
    if (authRequired) {
      html += '<div class="rss-auth-bar reveal">';
      if (isAdmin) {
        html += '<span class="rss-auth-status">' + t('rss.adminMode') + '</span>';
        html += '<button class="rss-btn rss-btn--small" onclick="window._rssLogout()">' + t('rss.logout') + '</button>';
      } else {
        html += '<span class="rss-auth-status">' + t('rss.readOnly') + '</span>';
        html += '<button class="rss-btn rss-btn--small rss-btn--primary" onclick="window._rssShowLogin()">' + t('rss.login') + '</button>';
      }
      html += '</div>';

      // Login form (hidden by default)
      if (!isAdmin) {
        html += '<div class="rss-add-form" id="rss-login-form" style="display:none">';
        html += '<input type="password" id="rss-login-key" placeholder="' + t('rss.keyPlaceholder') + '" class="rss-input">';
        html += '<button class="rss-btn rss-btn--primary" onclick="window._rssDoLogin()">' + t('rss.confirm') + '</button>';
        html += '<button class="rss-btn" onclick="window._rssHideLogin()">' + t('rss.cancel') + '</button>';
        html += '</div>';
      }
    }

    // RSS Sources Section
    html += '<div class="rss-section reveal">';
    html += '<div class="rss-section-header">';
    html += '<h2 class="rss-section-title">' + t('rss.sources') + '</h2>';
    if (isAdmin) {
      html += '<div class="rss-actions">';
      html += '<button class="rss-btn" onclick="window._rssFetchAll()">' + t('rss.fetchAll') + '</button>';
      html += '<button class="rss-btn rss-btn--primary" onclick="window._rssShowAdd()">' + t('rss.addSource') + '</button>';
      html += '</div>';
    }
    html += '</div>';

    // Add source form (admin only, hidden by default)
    if (isAdmin) {
      html += '<div class="rss-add-form" id="rss-add-form" style="display:none">';
      html += '<input type="text" id="rss-add-url" placeholder="' + t('rss.urlPlaceholder') + '" class="rss-input">';
      html += '<input type="text" id="rss-add-title" placeholder="' + t('rss.titlePlaceholder') + '" class="rss-input">';
      html += '<button class="rss-btn rss-btn--primary" onclick="window._rssAddSource()">' + t('rss.add') + '</button>';
      html += '<button class="rss-btn" onclick="window._rssHideAdd()">' + t('rss.cancel') + '</button>';
      html += '</div>';
    }

    // Sources list
    if (sources.length === 0) {
      html += '<div class="rss-empty">' + t('rss.noSources') + '</div>';
    } else {
      html += '<div class="rss-sources-list">';
      for (var i = 0; i < sources.length; i++) {
        html += renderSourceCard(sources[i], isAdmin);
      }
      html += '</div>';
    }
    html += '</div>';

    // RSS Feed Items Section
    html += '<div class="rss-section reveal">';
    html += '<h2 class="rss-section-title">' + t('rss.recentItems') + ' (' + feeds.total + ')</h2>';

    if (feeds.feeds.length === 0) {
      html += '<div class="rss-empty">' + t('rss.noItems') + '</div>';
    } else {
      html += '<div class="rss-items-list">';
      for (var j = 0; j < feeds.feeds.length; j++) {
        html += renderRssItem(feeds.feeds[j]);
      }
      html += '</div>';
    }
    html += '</div>';

    // RSS Feed Links
    html += '<div class="rss-section reveal">';
    html += '<h2 class="rss-section-title">' + t('rss.subscribeLinks') + '</h2>';
    html += '<div class="rss-links">';
    html += '<a href="/rss/posts.xml" target="_blank" class="rss-link">📝 ' + t('rss.postsFeed') + '</a>';
    html += '<a href="/rss/feeds.xml" target="_blank" class="rss-link">📰 ' + t('rss.feedsFeed') + '</a>';
    html += '<a href="/rss/all.xml" target="_blank" class="rss-link">📋 ' + t('rss.allFeed') + '</a>';
    html += '</div>';
    html += '</div>';

    appEl.innerHTML = html;

    // Init scroll animations
    initAnimations();
    observeElements();
  }).catch(function(err) {
    console.error('RSS Reader error:', err);
    appEl.innerHTML = renderError('Failed to load: ' + err.message);
  });
}

function renderSourceCard(source, isAdmin) {
  var statusClass = source.enabled ? 'active' : 'disabled';
  var errorBadge = source.error_count > 0 ? '<span class="rss-source-errors">' + source.error_count + ' errors</span>' : '';
  var lastFetch = source.last_fetched ? formatDate(source.last_fetched) : t('rss.never');

  var html = '<div class="rss-source-card ' + statusClass + '">';
  html += '<div class="rss-source-info">';
  html += '<div class="rss-source-title">' + escapeHtml(source.title || source.url) + '</div>';
  html += '<div class="rss-source-url">' + escapeHtml(source.url) + '</div>';
  html += '<div class="rss-source-meta">';
  html += '<span>' + t('rss.lastFetch') + ': ' + lastFetch + '</span>';
  html += errorBadge;
  if (source.last_error) {
    html += '<span class="rss-source-error-msg">' + escapeHtml(source.last_error).substring(0, 80) + '</span>';
  }
  html += '</div>';
  html += '</div>';
  if (isAdmin) {
    html += '<div class="rss-source-actions">';
    html += '<button class="rss-btn rss-btn--small" onclick="window._rssFetchOne(' + source.id + ')">' + t('rss.fetch') + '</button>';
    html += '<button class="rss-btn rss-btn--small" onclick="window._rssToggle(' + source.id + ',' + (source.enabled ? 0 : 1) + ')">' + (source.enabled ? t('rss.disable') : t('rss.enable')) + '</button>';
    html += '<button class="rss-btn rss-btn--small rss-btn--danger" onclick="window._rssRemove(' + source.id + ')">' + t('rss.remove') + '</button>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderRssItem(item) {
  var html = '<div class="rss-item-card" onclick="window._rssOpenItem(' + item.id + ')">';
  html += '<div class="rss-item-header">';
  html += '<h3 class="rss-item-title">' + escapeHtml(item.title) + '</h3>';
  if (item.source) {
    html += '<span class="rss-item-source">' + escapeHtml(item.source) + '</span>';
  }
  html += '</div>';
  if (item.summary) {
    html += '<p class="rss-item-summary">' + escapeHtml(item.summary) + '</p>';
  }
  html += '<div class="rss-item-footer">';
  html += '<span class="rss-item-date">' + formatDate(item.created_at) + '</span>';
  if (item.url) {
    html += '<a href="' + escapeHtml(item.url) + '" target="_blank" class="rss-item-link" onclick="event.stopPropagation()">' + t('rss.original') + '</a>';
  }
  html += '</div>';
  html += '</div>';
  return html;
}

// ===== Auth =====
window._rssShowLogin = function() {
  var form = document.getElementById('rss-login-form');
  if (form) form.style.display = 'flex';
};

window._rssHideLogin = function() {
  var form = document.getElementById('rss-login-form');
  if (form) form.style.display = 'none';
};

window._rssDoLogin = function() {
  var input = document.getElementById('rss-login-key');
  var key = input ? input.value.trim() : '';
  if (!key) return;
  setApiKey(key);
  loadPage();
};

window._rssLogout = function() {
  setApiKey('');
  loadPage();
};

// ===== Admin Actions =====
window._rssShowAdd = function() {
  var form = document.getElementById('rss-add-form');
  if (form) form.style.display = 'flex';
};

window._rssHideAdd = function() {
  var form = document.getElementById('rss-add-form');
  if (form) form.style.display = 'none';
};

window._rssAddSource = function() {
  var urlInput = document.getElementById('rss-add-url');
  var titleInput = document.getElementById('rss-add-title');
  var url = urlInput ? urlInput.value.trim() : '';
  var title = titleInput ? titleInput.value.trim() : '';

  if (!url) return alert('Please enter a URL');

  authFetch('/api/rss/sources', {
    method: 'POST',
    body: JSON.stringify({ url: url, title: title || null })
  }).then(function(result) {
    if (result.success) {
      loadPage();
    } else {
      alert(result.error || 'Failed to add source');
    }
  }).catch(function() {});
};

window._rssRemove = function(id) {
  if (!confirm('Remove this RSS source?')) return;
  authFetch('/api/rss/sources/' + id, { method: 'DELETE' })
    .then(function() { loadPage(); })
    .catch(function() {});
};

window._rssToggle = function(id, enabled) {
  authFetch('/api/rss/sources/' + id, {
    method: 'PUT',
    body: JSON.stringify({ enabled: enabled })
  }).then(function() { loadPage(); })
    .catch(function() {});
};

window._rssFetchOne = function(id) {
  authFetch('/api/rss/fetch/' + id, { method: 'POST' })
    .then(function(result) {
      if (result.success) {
        alert('Fetched ' + (result.newItems || 0) + ' new items');
        loadPage();
      } else {
        alert('Error: ' + (result.error || 'Unknown'));
      }
    }).catch(function() {});
};

window._rssFetchAll = function() {
  authFetch('/api/rss/fetch', { method: 'POST' })
    .then(function(result) {
      var total = result.results ? result.results.reduce(function(s, r) { return s + (r.newItems || 0); }, 0) : 0;
      alert('Fetched ' + total + ' new items from ' + (result.results ? result.results.length : 0) + ' sources');
      loadPage();
    }).catch(function() {});
};

window._rssOpenItem = function(id) {
  fetchJSON('/api/feeds/' + id)
    .then(function(feed) {
      openFeedModal(feed.title, feed.content, feed.format || 'markdown');
    })
    .catch(function(err) {
      console.error('RSS item error:', err);
    });
};
