// ===== Feed Page =====

import { fetchJSON, escapeHtml, formatDate } from '../utils.js';
import { renderError } from '../components/error.js';
import { openMarkdownModal } from '../components/modal.js';

var API = '/api';
var appEl = null;
var currentPage = 1;
var limit = 20;

export function showFeed(app) {
  appEl = app;
  currentPage = 1;
  loadPage();
}

function loadPage() {
  fetchJSON(API + '/feeds?page=' + currentPage + '&limit=' + limit)
    .then(function(data) {
      var totalPages = Math.ceil(data.total / limit);
      var html = '';

      // Hero
      html += '<section class="hero">';
      html += '<div class="hero-content">';
      html += '<div class="hero-issue hero-reveal" style="animation-delay:0.1s">Information Flow</div>';
      html += '<h1 class="hero-title hero-reveal" style="animation-delay:0.2s">Feed</h1>';
      html += '<p class="hero-subtitle hero-reveal" style="animation-delay:0.35s">Curated news and insights</p>';
      html += '<div class="hero-meta hero-reveal" style="animation-delay:0.5s">';
      html += '<div class="hero-stat"><span class="hero-stat-num">' + data.total + '</span><span class="hero-stat-label">Items</span></div>';
      html += '</div>';
      html += '</div>';
      html += '</section>';

      // Feed cards
      if (data.feeds.length === 0) {
        html += '<div class="feed-empty">No feed items yet</div>';
      } else {
        html += '<div class="feed-list">';
        for (var i = 0; i < data.feeds.length; i++) {
          html += renderFeedCard(data.feeds[i], i);
        }
        html += '</div>';
      }

      // Pagination
      if (totalPages > 1) {
        html += '<div class="pagination reveal">';
        html += '<button ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="window._feedPage(' + (currentPage - 1) + ')">&#8249; Prev</button>';
        for (var p = 1; p <= totalPages; p++) {
          html += '<button class="' + (p === currentPage ? 'active' : '') + '" onclick="window._feedPage(' + p + ')">' + p + '</button>';
        }
        html += '<button ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="window._feedPage(' + (currentPage + 1) + ')">Next &#8250;</button>';
        html += '</div>';
      }

      appEl.innerHTML = html;
    })
    .catch(function(err) {
      console.error('Feed error:', err);
      appEl.innerHTML = renderError('Failed to load feed: ' + err.message);
    });
}

function renderFeedCard(feed) {
  var feedTags = [];
  try { feedTags = JSON.parse(feed.tags || '[]'); } catch(e) {}

  var html = '<article class="feed-card" onclick="window._openFeed(' + feed.id + ')">';
  html += '<div class="feed-card-header">';
  html += '<h3 class="feed-card-title">' + escapeHtml(feed.title) + '</h3>';
  if (feed.source) {
    html += '<span class="feed-card-source">' + escapeHtml(feed.source) + '</span>';
  }
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

window._openFeed = function(id) {
  fetchJSON(API + '/feeds/' + id)
    .then(function(feed) {
      openMarkdownModal(feed.title, feed.content);
    })
    .catch(function(err) {
      console.error('Feed detail error:', err);
    });
};

window._feedPage = function(page) {
  currentPage = page;
  loadPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
