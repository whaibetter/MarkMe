// ===== Post Detail Page =====

import { fetchJSON, escapeHtml, formatDate, renderMd, typesetMath, calcReadingTime, formatSize } from '../utils.js';
import { buildTocHtml, createMobileToc, setupScrollSpy, bindTocClicks } from '../toc.js';
import { setupReadingProgress } from '../reading-progress.js';
import { addTranslateButton } from '../translate.js';
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

      // External link indicators (report §4.2.3)
      var contentLinks = app.querySelectorAll('.post-content a');
      for (var li = 0; li < contentLinks.length; li++) {
        var a = contentLinks[li];
        if (a.hostname && a.hostname !== window.location.hostname) {
          a.target = '_blank';
          a.rel = 'noopener';
          a.classList.add('external-link');
        }
      }

      // Image lazy loading (report §5.1)
      var contentImgs = app.querySelectorAll('.post-content img');
      for (var img_i = 0; img_i < contentImgs.length; img_i++) {
        contentImgs[img_i].loading = 'lazy';
      }

      // One-click translate button
      var postContent = app.querySelector('.post-content');
      if (postContent) {
        addTranslateButton(postContent, 'post', post.id);
      }

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

        // Inline TOC toggle for 900-1200px range (report §4.2.1)
        var toggleBtn = document.createElement('button');
        toggleBtn.className = 'toc-inline-toggle';
        toggleBtn.innerHTML = '&#9776; Contents';
        toggleBtn.addEventListener('click', function() {
          sidebar.style.display = sidebar.style.display === 'block' ? 'none' : 'block';
          sidebar.style.position = 'fixed';
          sidebar.style.right = '32px';
          sidebar.style.top = '72px';
          sidebar.style.zIndex = '100';
          sidebar.style.background = 'var(--panel-bg)';
          sidebar.style.backdropFilter = 'blur(var(--blur-strong))';
          sidebar.style.border = '1px solid var(--border)';
          sidebar.style.borderRadius = 'var(--radius-sm)';
          sidebar.style.padding = '16px';
          sidebar.style.boxShadow = 'var(--shadow-md)';
        });
        var postDetail = layout.querySelector('.post-detail');
        if (postDetail) {
          postDetail.insertBefore(toggleBtn, postDetail.firstChild);
        }

        app.appendChild(layout);
        createMobileToc(tocItems);
        setupScrollSpy(tocItems);
        bindTocClicks(layout);
      }

      setupReadingProgress();
    })
    .catch(function(err) {
      console.error('Error:', err);
      app.innerHTML = renderError('Failed to load: ' + err.message);
    });
}
