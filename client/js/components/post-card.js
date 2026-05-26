// ===== Post Card Component =====

import { escapeHtml, stripMd, formatDate } from '../utils.js';

export function renderPostCard(post, index) {
  var postTags = [];
  try { postTags = JSON.parse(post.tags || '[]'); } catch(e) {}

  var num = String(index + 1).padStart(2, '0');

  var html = '<article class="post-card">';
  html += '<span class="post-card-num">' + num + '</span>';
  html += '<div class="post-card-content">';
  html += '<h2><a href="/post/' + post.id + '" data-link>' + escapeHtml(post.title) + '</a></h2>';
  html += '<div class="post-meta">' + formatDate(post.created_at) + '</div>';
  html += '<div class="post-summary">' + escapeHtml(stripMd(post.summary || '')) + '</div>';

  if (postTags.length > 0) {
    html += '<div class="tags">';
    for (var j = 0; j < postTags.length; j++) {
      html += '<span class="tag" onclick="goTag(\'' + escapeHtml(postTags[j]) + '\')">' + escapeHtml(postTags[j]) + '</span>';
    }
    html += '</div>';
  }

  html += '</div></article>';
  return html;
}

export function renderPostList(posts, emptyMessage) {
  if (posts.length === 0) {
    return '<div class="post-list-empty">' + (emptyMessage || 'No articles yet') + '</div>';
  }

  var html = '<div class="post-list">';
  for (var i = 0; i < posts.length; i++) {
    html += renderPostCard(posts[i], posts[i]._index != null ? posts[i]._index : i);
  }
  html += '</div>';
  return html;
}
