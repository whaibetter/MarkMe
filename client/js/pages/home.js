// ===== Home Page =====

import { fetchJSON } from '../utils.js';
import { renderPostList } from '../components/post-card.js';
import { renderError } from '../components/error.js';

var API = '/api';
var currentPage = 1;
var limit = 10;

export function showHome(app) {
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

    // Hero section - editorial style
    html += '<section class="hero">';
    html += '<div class="hero-content">';
    html += '<h1 class="hero-title hero-reveal" style="animation-delay:0.2s">Wenhai\'s Blog</h1>';
    html += '<p class="hero-subtitle hero-reveal" style="animation-delay:0.3s">Thoughts, ideas, and the written word</p>';
    html += '<div class="hero-meta hero-reveal" style="animation-delay:0.4s">';
    html += '<div class="hero-stat"><span class="hero-stat-num">' + stats.posts + '</span><span class="hero-stat-label">Articles</span></div>';
    html += '<div class="hero-stat-divider"></div>';
    html += '<div class="hero-stat"><span class="hero-stat-num">' + tags.length + '</span><span class="hero-stat-label">Topics</span></div>';
    html += '</div>';
    html += '</div>';
    html += '</section>';

    // Post list
    html += renderPostList(data.posts, 'No articles yet');

    app.innerHTML = html;
  }).catch(function(err) {
    console.error('Error:', err);
    app.innerHTML = renderError('Failed to load: ' + err.message);
  });
}
