// ===== Post Detail Page =====

import { fetchJSON, escapeHtml, formatDate, renderMd, typesetMath, calcReadingTime, formatSize } from '../utils.js';
import { buildTocHtml, createMobileToc, setupScrollSpy } from '../toc.js';
import { setupReadingProgress } from '../reading-progress.js';
import { renderError } from '../components/error.js';

var API = '/api';

export function showPost(app, id) {
  console.log('showPost:', id);
  document.querySelector('.main').classList.add('post-page');
  fetchJSON(API + '/posts/' + id)
    .then(function(post) {
      console.log('Got post:', post.title);
      var tags = [];
      try { tags = JSON.parse(post.tags || '[]'); } catch(e) {}

      var html = '<a href="/?section=blogs" class="back-link" data-link>Back to blogs</a>';
      html += '<article class="post-detail">';

      // Post header
      html += '<div class="post-header">';
      html += '<h1>' + escapeHtml(post.title) + '</h1>';
      html += '<div class="post-meta">' + formatDate(post.created_at);
      html += '<span class="reading-time">' + calcReadingTime(post.content) + ' min read</span>';

      for (var i = 0; i < tags.length; i++) {
        html += ' <span class="tag" onclick="goTag(\'' + escapeHtml(tags[i]) + '\')">' + escapeHtml(tags[i]) + '</span>';
      }
      html += '</div></div>';

      // Post content
      html += '<div class="post-content">' + renderMd(post.content) + '</div>';

      // Files
      if (post.files && post.files.length > 0) {
        html += '<div class="post-files">';
        html += '<h3>Attachments (' + post.files.length + ')</h3>';
        html += '<div class="file-list">';

        for (var j = 0; j < post.files.length; j++) {
          var f = post.files[j];
          html += '<div class="file-item">';
          html += '<span class="file-icon">📄</span>';
          html += '<div class="file-info">';
          html += '<div class="file-name">' + escapeHtml(f.original_name) + '</div>';
          html += '<div class="file-size">' + formatSize(f.size) + '</div>';
          html += '</div>';
          html += '<a href="/uploads/' + f.filename + '" download="' + escapeHtml(f.original_name) + '" class="btn-download">Download</a>';
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
      app.innerHTML = renderError('Failed to load: ' + err.message);
    });
}
