// ===== Home Page =====

import { fetchJSON, escapeHtml } from '../utils.js';
import { renderPostList } from '../components/post-card.js';
import { renderError } from '../components/error.js';
import { initAnimations, observeElements } from '../animations.js';
import { t } from '../i18n.js';

var API = '/api';
var currentPage = 1;
var limit = 7;
var appEl = null;
var activeTag = null;

export function showHome(app, tag) {
  appEl = app;
  currentPage = 1;
  activeTag = tag || null;
  loadPage();
}

function loadPage() {
  console.log('showHome page', currentPage, 'tag', activeTag);

  var postsUrl = API + '/posts?page=' + currentPage + '&limit=' + limit;
  if (activeTag) {
    postsUrl += '&tag=' + encodeURIComponent(activeTag);
  }

  Promise.all([
    fetchJSON(postsUrl),
    fetchJSON(API + '/tags')
  ]).then(function(results) {
    var data = results[0];
    var allTags = results[1];
    var totalPages = Math.ceil(data.total / limit);
    var html = '';

    // Hero section
    html += '<section class="hero">';
    html += '<div class="hero-corner"></div>';
    html += '<div class="hero-content">';
    html += '<div class="hero-issue hero-reveal" style="animation-delay:0.1s">' + t('blog.issue') + '</div>';
    html += '<h1 class="hero-title hero-reveal" style="animation-delay:0.2s">' + t('blog.title') + '</h1>';
    html += '<p class="hero-subtitle hero-reveal" style="animation-delay:0.35s">' + t('blog.subtitle') + '</p>';
    html += '<div class="hero-meta hero-reveal" style="animation-delay:0.5s">';
    html += '<div class="hero-stat"><span class="hero-stat-num">' + data.total + '</span><span class="hero-stat-label">' + t('blog.articles') + '</span></div>';
    html += '<div class="hero-stat-divider"></div>';
    html += '<div class="hero-stat"><span class="hero-stat-num">' + totalPages + '</span><span class="hero-stat-label">' + t('blog.pages') + '</span></div>';
    html += '</div>';
    html += '</div>';
    html += '</section>';

    // Tag filter bar
    if (allTags.length > 0) {
      html += '<div class="tag-filter reveal">';
      html += '<div class="tag-filter-label">' + t('blog.filterByTag') + '</div>';
      html += '<div class="tag-filter-list">';
      for (var ti = 0; ti < allTags.length; ti++) {
        var isActive = activeTag === allTags[ti];
        html += '<span class="tag tag-filter-item' + (isActive ? ' active' : '') + '" onclick="goTag(\'' + escapeHtml(allTags[ti]) + '\')">' + escapeHtml(allTags[ti]) + '</span>';
      }
      html += '</div>';
      if (activeTag) {
        html += '<div class="tag-filter-active">';
        html += '<span class="tag-filter-current">' + t('blog.showing') + ': <strong>' + escapeHtml(activeTag) + '</strong></span>';
        html += '<button class="tag-filter-clear" onclick="clearTag()">' + t('blog.clearFilter') + ' &times;</button>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Post list with stagger container
    var offset = (currentPage - 1) * limit;
    var posts = data.posts.map(function(p, i) {
      p._index = offset + i;
      return p;
    });
    html += '<div class="post-list-stagger" data-stagger>';
    html += renderPostList(posts, activeTag ? t('blog.emptyTag') : t('blog.empty'));
    html += '</div>';

    // Pagination
    if (totalPages > 1) {
      html += '<div class="pagination reveal">';
      html += '<button ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="window._homePage(' + (currentPage - 1) + ')">&#8249; ' + t('common.prev') + '</button>';
      for (var i = 1; i <= totalPages; i++) {
        html += '<button class="' + (i === currentPage ? 'active' : '') + '" onclick="window._homePage(' + i + ')">' + i + '</button>';
      }
      html += '<button ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="window._homePage(' + (currentPage + 1) + ')">' + t('common.next') + ' &#8250;</button>';
      html += '</div>';
    }

    appEl.innerHTML = html;

    // Init scroll animations
    initAnimations();
    observeElements();
  }).catch(function(err) {
    console.error('Error:', err);
    appEl.innerHTML = renderError('Failed to load: ' + err.message);
  });
}

window._homePage = function(page) {
  currentPage = page;
  loadPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
