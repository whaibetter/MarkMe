// ===== Home Page =====

import { fetchJSON } from '../utils.js';
import { renderPostList } from '../components/post-card.js';
import { renderError } from '../components/error.js';

var API = '/api';
var currentPage = 1;
var limit = 7;
var appEl = null;

export function showHome(app) {
  appEl = app;
  currentPage = 1;
  loadPage();
}

function loadPage() {
  console.log('showHome page', currentPage);
  fetchJSON(API + '/posts?page=' + currentPage + '&limit=' + limit)
    .then(function(data) {
      var totalPages = Math.ceil(data.total / limit);
      var html = '';

      // Hero section
      html += '<section class="hero">';
      html += '<div class="hero-content">';
      html += '<h1 class="hero-title hero-reveal" style="animation-delay:0.2s">Wenhai\'s Blog</h1>';
      html += '<p class="hero-subtitle hero-reveal" style="animation-delay:0.3s">Thoughts, ideas, and the written word</p>';
      html += '<div class="hero-meta hero-reveal" style="animation-delay:0.4s">';
      html += '<div class="hero-stat"><span class="hero-stat-num">' + data.total + '</span><span class="hero-stat-label">Articles</span></div>';
      html += '</div>';
      html += '</div>';
      html += '</section>';

      // Post list
      var offset = (currentPage - 1) * limit;
      var posts = data.posts.map(function(p, i) {
        p._index = offset + i;
        return p;
      });
      html += renderPostList(posts, 'No articles yet');

      // Pagination
      if (totalPages > 1) {
        html += '<div class="pagination">';
        html += '<button ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="window._homePage(' + (currentPage - 1) + ')">&#8249; Prev</button>';
        for (var i = 1; i <= totalPages; i++) {
          html += '<button class="' + (i === currentPage ? 'active' : '') + '" onclick="window._homePage(' + i + ')">' + i + '</button>';
        }
        html += '<button ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="window._homePage(' + (currentPage + 1) + ')">Next &#8250;</button>';
        html += '</div>';
      }

      appEl.innerHTML = html;
    })
    .catch(function(err) {
      console.error('Error:', err);
      appEl.innerHTML = renderError('Failed to load: ' + err.message);
    });
}

window._homePage = function(page) {
  currentPage = page;
  loadPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
