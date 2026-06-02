import { fetchJSON, escapeHtml, formatDate } from '../utils.js';
import { renderError } from '../components/error.js';
import { openFeedModal } from '../components/modal.js';
import { t } from '../i18n.js';

var API = '/api';
var appEl = null;
var currentPage = 1;
var currentSource = '';
var limit = 20;

export function showFeed(app) {
  appEl = app;
  currentPage = 1;
  currentSource = '';
  loadSources();
}

function loadSources() {
  fetchJSON(API + '/feeds/sources')
    .then(function(data) { renderSourceBar(data.sources || []); })
    .catch(function() { /* ignore, still load feeds */ })
    .finally(function() { loadPage(); });
}

function renderSourceBar(sources) {
  var html = '<div class="feed-source-bar">';
  for (var i = 0; i < sources.length; i++) {
    var s = sources[i];
    var active = currentSource === s.value ? ' active' : '';
    html += '<button class="feed-source-btn' + active + '" data-source="' + escapeHtml(s.value) + '">' + escapeHtml(s.name) + '</button>';
  }
  html += '</div>';
  var existing = appEl.querySelector('.feed-source-bar');
  if (existing) existing.remove();
  appEl.insertAdjacentHTML('afterbegin', html);
  appEl.querySelector('.feed-source-bar').addEventListener('click', function(e) {
    var btn = e.target.closest('.feed-source-btn');
    if (btn) {
      currentSource = btn.getAttribute('data-source') || '';
      currentPage = 1;
      loadPage();
    }
  });
}

function loadPage() {
  var url = API + '/feeds?page=' + currentPage + '&limit=' + limit;
  if (currentSource) url += '&source=' + encodeURIComponent(currentSource);

  fetchJSON(url)
    .then(function(data) {
      var totalPages = Math.ceil(data.total / limit);
      var html = '';

      html += '<section class="hero">';
      html += '<div class="hero-content">';
      html += '<div class="hero-issue hero-reveal" style="animation-delay:0.1s">' + t('feed.issue') + '</div>';
      html += '<h1 class="hero-title hero-reveal" style="animation-delay:0.2s">' + t('feed.title') + '</h1>';
      html += '<p class="hero-subtitle hero-reveal" style="animation-delay:0.35s">' + t('feed.subtitle') + '</p>';
      html += '<div class="hero-meta hero-reveal" style="animation-delay:0.5s">';
      html += '<div class="hero-stat"><span class="hero-stat-num">' + data.total + '</span><span class="hero-stat-label">' + t('feed.items') + '</span></div>';
      html += '</div>';
      html += '</div>';
      html += '</section>';

      if (data.feeds.length === 0) {
        html += '<div class="feed-empty">' + t('feed.empty') + '</div>';
      } else {
        html += '<div class="feed-list">';
        for (var i = 0; i < data.feeds.length; i++) {
          html += renderFeedCard(data.feeds[i]);
        }
        html += '</div>';
      }

      if (totalPages > 1) {
        html += '<div class="pagination reveal">';
        html += '<button ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="window._feedPage(' + (currentPage - 1) + ')">&#8249; ' + t('common.prev') + '</button>';
        for (var p = 1; p <= totalPages; p++) {
          html += '<button class="' + (p === currentPage ? 'active' : '') + '" onclick="window._feedPage(' + p + ')">' + p + '</button>';
        }
        html += '<button ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="window._feedPage(' + (currentPage + 1) + ')">' + t('common.next') + ' &#8250;</button>';
        html += '</div>';
      }

      var existingContent = appEl.querySelector('.hero');
      if (existingContent) existingContent.remove();
      var existingList = appEl.querySelector('.feed-list');
      if (existingList) existingList.remove();
      var existingPagination = appEl.querySelector('.pagination');
      if (existingPagination) existingPagination.remove();
      var existingEmpty = appEl.querySelector('.feed-empty');
      if (existingEmpty) existingEmpty.remove();

      var sourceBar = appEl.querySelector('.feed-source-bar');
      if (sourceBar) {
        sourceBar.insertAdjacentHTML('afterend', html);
      } else {
        appEl.innerHTML = html;
      }

      var feedList = appEl.querySelector('.feed-list');
      if (feedList) {
        feedList.addEventListener('click', function(e) {
          var card = e.target.closest('.feed-card');
          if (card) {
            var id = card.getAttribute('data-feed-id');
            if (id) openFeedDetail(Number(id));
          }
        });
      }
    })
    .catch(function(err) {
      console.error('Feed error:', err);
      appEl.innerHTML = renderError('Failed to load feed: ' + err.message);
    });
}

function renderFeedCard(feed) {
  var feedTags = [];
  try { feedTags = JSON.parse(feed.tags || '[]'); } catch(e) {}

  var format = feed.format || 'markdown';
  var formatLabels = { markdown: 'MD', html: 'HTML', text: 'TXT' };

  var html = '<article class="feed-card" data-feed-id="' + feed.id + '">';
  html += '<div class="feed-card-header">';
  html += '<h3 class="feed-card-title">' + escapeHtml(feed.title) + '</h3>';
  html += '<div class="feed-card-badges">';
  if (format !== 'markdown') {
    html += '<span class="feed-card-format feed-card-format--' + format + '">' + (formatLabels[format] || format) + '</span>';
  }
  if (feed.source) {
    html += '<span class="feed-card-source">' + escapeHtml(feed.source) + '</span>';
  }
  html += '</div>';
  html += '</div>';

  if (feed.summary) {
    html += '<p class="feed-card-summary">' + escapeHtml(feed.summary) + '</p>';
  }

  html += '<div class="feed-card-footer">';
  html += '<span class="feed-card-date">' + formatDate(feed.created_at) + '</span>';
  if (feedTags.length > 0) {
    html += '<div class="feed-card-tags">';
    for (var j = 0; j < feedTags.length; j++) {
      html += '<span class="tag">' + escapeHtml(feedTags[j]) + '</span>';
    }
    html += '</div>';
  }
  html += '</div>';
  html += '</article>';
  return html;
}

function openFeedDetail(id) {
  fetchJSON(API + '/feeds/' + id)
    .then(function(feed) {
      openFeedModal(feed.title, feed.content, feed.format || 'markdown');
    })
    .catch(function(err) {
      console.error('Feed detail error:', err);
    });
}

window._feedPage = function(page) {
  currentPage = page;
  loadPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};