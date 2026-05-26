// ===== Tags Page =====

import { fetchJSON, escapeHtml } from '../utils.js';
import { renderPostList } from '../components/post-card.js';
import { renderError } from '../components/error.js';

var API = '/api';

export function showTags(app) {
  console.log('showTags');
  fetchJSON(API + '/tags')
    .then(function(tags) {
      console.log('Got tags:', tags);
      var html = '<a href="/" class="back-link" data-link>Back to home</a>';
      html += '<h2 class="tag-posts-title">Topics</h2>';
      html += '<div class="tag-cloud">';

      if (tags.length === 0) {
        html += '<p style="color:var(--text-muted);font-weight:300;">No topics yet</p>';
      }

      for (var i = 0; i < tags.length; i++) {
        html += '<span class="tag" onclick="goTag(\'' + escapeHtml(tags[i]) + '\')">' + escapeHtml(tags[i]) + '</span>';
      }

      html += '</div>';
      app.innerHTML = html;
    })
    .catch(function(err) {
      console.error('Error:', err);
      app.innerHTML = renderError('Failed to load: ' + err.message);
    });
}

export function showTagPosts(app, tag) {
  console.log('showTagPosts:', tag);
  fetchJSON(API + '/posts?tag=' + encodeURIComponent(tag))
    .then(function(data) {
      console.log('Got posts:', data.posts.length);
      var html = '<a href="/" class="back-link" data-link>Back to home</a>';
      html += '<h2 class="tag-posts-title">Topic: <span>' + escapeHtml(tag) + '</span></h2>';

      html += renderPostList(data.posts, 'No articles with this topic');

      app.innerHTML = html;
    })
    .catch(function(err) {
      console.error('Error:', err);
      app.innerHTML = renderError('Failed to load: ' + err.message);
    });
}
