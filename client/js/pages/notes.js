// ===== Notes Page =====

import { renderMd, fetchJSON } from '../utils.js';
import { buildTocHtml, createMobileToc, setupScrollSpy, removeMobileToc, disconnectTocObserver, bindTocClicks } from '../toc.js';

var currentPath = '';

export function showNotes(app) {
  var params = new URLSearchParams(window.location.search);
  var filePath = params.get('path') || '';

  app.innerHTML =
    '<div class="notes-layout">' +
      '<div class="notes-sidebar-overlay" id="notes-overlay"></div>' +
      '<aside class="notes-sidebar" id="notes-sidebar">' +
        '<div class="notes-sidebar-title">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>' +
          'Notes' +
        '</div>' +
        '<ul class="notes-tree" id="notes-tree"></ul>' +
      '</aside>' +
      '<div class="notes-content" id="notes-content">' +
        '<div class="notes-loading"><div class="loading-ring"></div><span>Loading</span></div>' +
      '</div>' +
    '</div>' +
    '<button class="notes-mobile-toggle" id="notes-mobile-toggle">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>' +
    '</button>';

  // Mobile sidebar toggle
  var toggle = document.getElementById('notes-mobile-toggle');
  var sidebar = document.getElementById('notes-sidebar');
  var overlay = document.getElementById('notes-overlay');

  toggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  overlay.addEventListener('click', function() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });

  // Check status first, then load
  checkStatusAndLoad(app, filePath);
}

function checkStatusAndLoad(app, filePath) {
  fetchJSON('/api/notes/status')
    .then(function(status) {
      if (status.status === 'ready') {
        loadTreeAndContent(app, filePath);
      } else if (status.status === 'cloning') {
        showSyncing(app, 'Cloning repository... This may take a moment.');
        pollUntilReady(app, filePath);
      } else if (status.status === 'pulling') {
        loadTreeAndContent(app, filePath);
      } else if (status.status === 'error') {
        showError(app, 'Sync failed: ' + (status.error || 'Unknown error'));
      } else {
        showSyncing(app, 'Initializing...');
        pollUntilReady(app, filePath);
      }
    })
    .catch(function() {
      // Status endpoint might not exist yet, try loading directly
      loadTreeAndContent(app, filePath);
    });
}

function pollUntilReady(app, filePath) {
  var retries = 0;
  var maxRetries = 60; // 60 * 3s = 3 minutes max

  var timer = setInterval(function() {
    retries++;
    if (retries > maxRetries) {
      clearInterval(timer);
      showError(app, 'Repository clone timed out. Please try again later.');
      return;
    }

    fetchJSON('/api/notes/status')
      .then(function(status) {
        if (status.status === 'ready') {
          clearInterval(timer);
          loadTreeAndContent(app, filePath);
        } else if (status.status === 'error') {
          clearInterval(timer);
          showError(app, 'Sync failed: ' + (status.error || 'Unknown error'));
        }
        // still cloning/pulling, keep polling
      })
      .catch(function() {
        // ignore polling errors
      });
  }, 3000);
}

function loadTreeAndContent(app, filePath) {
  loadTree('', 1, function() {
    if (filePath) {
      loadFile(filePath);
    } else {
      showEmpty();
    }
  });
}

function showSyncing(app, message) {
  var contentEl = document.getElementById('notes-content');
  if (contentEl) {
    contentEl.innerHTML =
      '<div class="notes-empty">' +
        '<div class="loading-ring"></div>' +
        '<div class="notes-empty-title">' + escapeHtml(message) + '</div>' +
        '<div class="notes-empty-sub">The page will refresh automatically</div>' +
      '</div>';
  }
}

function showError(app, message) {
  var contentEl = document.getElementById('notes-content');
  if (contentEl) {
    contentEl.innerHTML =
      '<div class="notes-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>' +
        '<div class="notes-empty-title">Unable to load notes</div>' +
        '<div class="notes-empty-sub">' + escapeHtml(message) + '</div>' +
      '</div>';
  }
  var treeEl = document.getElementById('notes-tree');
  if (treeEl) treeEl.innerHTML = '';
}

function loadTree(treePath, depth, callback) {
  fetchJSON('/api/notes/tree?path=' + encodeURIComponent(treePath) + '&depth=' + depth)
    .then(function(data) {
      if (data.error) {
        document.getElementById('notes-tree').innerHTML =
          '<li class="notes-error">' + escapeHtml(data.error) + '</li>';
        return;
      }
      renderTree(data.tree, document.getElementById('notes-tree'), treePath || '');
      if (callback) callback();
    })
    .catch(function(err) {
      document.getElementById('notes-tree').innerHTML =
        '<li class="notes-error">Failed to load: ' + escapeHtml(err.message) + '</li>';
    });
}

function renderTree(items, container, parentPath) {
  container.innerHTML = '';

  items.forEach(function(item) {
    var li = document.createElement('li');

    if (item.type === 'directory') {
      var dirRow = document.createElement('div');
      dirRow.className = 'notes-tree-item';
      dirRow.innerHTML =
        '<svg class="tree-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>' +
        '<svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>' +
        '<span class="tree-name">' + escapeHtml(item.name) + '</span>';

      var childUl = document.createElement('ul');
      childUl.className = 'notes-tree';
      childUl.style.display = 'none';

      dirRow.addEventListener('click', function(e) {
        e.stopPropagation();
        var arrow = dirRow.querySelector('.tree-arrow');
        var isOpen = childUl.style.display !== 'none';

        if (isOpen) {
          childUl.style.display = 'none';
          arrow.classList.remove('expanded');
        } else {
          childUl.style.display = 'block';
          arrow.classList.add('expanded');
          if (childUl.children.length === 0) {
            childUl.innerHTML = '<li style="padding:0.3rem 0.6rem;font-size:0.85rem;color:var(--text-muted)">Loading...</li>';
            fetchJSON('/api/notes/tree?path=' + encodeURIComponent(item.path) + '&depth=1')
              .then(function(data) {
                if (data.error) { childUl.innerHTML = '<li class="notes-error">' + escapeHtml(data.error) + '</li>'; return; }
                renderTree(data.tree, childUl, item.path);
              })
              .catch(function(err) { childUl.innerHTML = '<li class="notes-error">' + escapeHtml(err.message) + '</li>'; });
          }
        }
      });

      li.appendChild(dirRow);
      li.appendChild(childUl);
    } else {
      var fileRow = document.createElement('div');
      fileRow.className = 'notes-tree-item';
      fileRow.setAttribute('data-path', item.path);

      var fileIcon = getFileIcon(item.name);
      fileRow.innerHTML =
        '<svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + fileIcon + '</svg>' +
        '<span class="tree-name">' + escapeHtml(item.name) + '</span>';

      fileRow.addEventListener('click', function(e) {
        e.stopPropagation();
        var allItems = document.querySelectorAll('.notes-tree-item.active');
        for (var i = 0; i < allItems.length; i++) allItems[i].classList.remove('active');
        fileRow.classList.add('active');

        loadFile(item.path);

        var sidebar = document.getElementById('notes-sidebar');
        var overlayEl = document.getElementById('notes-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlayEl) overlayEl.classList.remove('open');
      });

      li.appendChild(fileRow);
    }

    container.appendChild(li);
  });
}

function loadFile(filePath) {
  currentPath = filePath;
  var contentEl = document.getElementById('notes-content');
  contentEl.innerHTML = '<div class="notes-loading"><div class="loading-ring"></div><span>Loading</span></div>';

  var newUrl = '/?section=notes&path=' + encodeURIComponent(filePath);
  history.pushState(null, '', newUrl);

  fetchJSON('/api/notes/file?path=' + encodeURIComponent(filePath))
    .then(function(data) {
      if (data.error) {
        contentEl.innerHTML = '<div class="notes-error">' + escapeHtml(data.error) + '</div>';
        return;
      }

      var header =
        '<div class="notes-file-header">' +
          '<div class="notes-file-path">' + escapeHtml(data.path) + '</div>' +
          '<div class="notes-file-title">' + escapeHtml(data.name) + '</div>' +
        '</div>';

      if (data.type === 'binary') {
        var ext = (data.name.split('.').pop() || '').toLowerCase();
        var imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];
        var pdfExts = ['pdf'];

        if (imageExts.indexOf(ext) >= 0) {
          contentEl.innerHTML = header +
            '<img src="' + escapeHtml(data.url) + '" alt="' + escapeHtml(data.name) + '" style="max-width:100%;border-radius:8px;" />';
        } else if (pdfExts.indexOf(ext) >= 0) {
          contentEl.innerHTML = header +
            '<iframe src="' + escapeHtml(data.url) + '" style="width:100%;height:75vh;border:1px solid var(--border);border-radius:8px;" frameborder="0"></iframe>';
        } else {
          var fileTypes = {
            'xmind': 'XMind mind map',
            'mp3': 'Audio', 'wav': 'Audio', 'ogg': 'Audio',
            'mp4': 'Video', 'webm': 'Video', 'avi': 'Video',
            'zip': 'Archive', 'tar': 'Archive', 'gz': 'Archive', 'rar': 'Archive',
            'doc': 'Word Document', 'docx': 'Word Document',
            'xls': 'Excel Spreadsheet', 'xlsx': 'Excel Spreadsheet',
            'ppt': 'Presentation', 'pptx': 'Presentation'
          };
          var fileType = fileTypes[ext] || ext.toUpperCase() + ' file';
          contentEl.innerHTML = header +
            '<div class="notes-empty">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:0.4;margin-bottom:1rem"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>' +
              '<div class="notes-empty-title">' + escapeHtml(fileType) + '</div>' +
              '<div class="notes-empty-sub">Preview not available for this file type</div>' +
              '<a href="' + escapeHtml(data.url) + '" target="_blank" download style="margin-top:1rem;display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1.2rem;background:var(--accent);color:#fff;border-radius:6px;text-decoration:none;font-size:0.9rem">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
                'Download' +
              '</a>' +
            '</div>';
        }
        return;
      }

      // Text / Markdown
      var html = header;
      if (data.type === 'markdown') {
        html += '<div class="notes-toc-layout"><div class="notes-markdown markdown-body">' + renderMd(data.content) + '</div></div>';
      } else {
        html += '<pre style="background:var(--code-bg);padding:1rem;border-radius:8px;overflow-x:auto;line-height:1.6;font-size:0.9rem">' +
          escapeHtml(data.content) + '</pre>';
      }

      contentEl.innerHTML = html;

      if (window.MathJax && window.MathJax.typeset) {
        window.MathJax.typeset();
      }

      // Generate TOC for markdown files
      removeMobileToc();
      disconnectTocObserver();
      if (data.type === 'markdown') {
        var mdEl = contentEl.querySelector('.notes-markdown');
        var tocLayout = contentEl.querySelector('.notes-toc-layout');
        if (mdEl && tocLayout) {
          var headings = mdEl.querySelectorAll('h2, h3');
          var tocItems = [];
          for (var hi = 0; hi < headings.length; hi++) {
            var h = headings[hi];
            var slug = 'notes-h-' + hi + '-' + h.textContent.trim()
              .toLowerCase()
              .replace(/[^\w一-鿿]+/g, '-')
              .replace(/^-|-$/g, '');
            h.id = slug;
            tocItems.push({ id: slug, text: h.textContent.trim(), level: h.tagName.toLowerCase() });
          }
          if (tocItems.length > 0) {
            var tocSidebar = document.createElement('aside');
            tocSidebar.className = 'notes-toc-sidebar toc-sidebar';
            tocSidebar.innerHTML = buildTocHtml(tocItems);
            tocLayout.appendChild(tocSidebar);
            createMobileToc(tocItems);
            setupScrollSpy(tocItems);
            bindTocClicks(tocLayout);
          }
        }
      }

      markActiveInSidebar(filePath);
    })
    .catch(function(err) {
      contentEl.innerHTML = '<div class="notes-error">Failed to load: ' + escapeHtml(err.message) + '</div>';
    });
}

function markActiveInSidebar(filePath) {
  var allItems = document.querySelectorAll('.notes-tree-item');
  for (var i = 0; i < allItems.length; i++) {
    if (allItems[i].getAttribute('data-path') === filePath) {
      allItems[i].classList.add('active');
      var parent = allItems[i].closest('.notes-tree');
      while (parent) {
        if (parent.style.display === 'none') {
          parent.style.display = 'block';
          var arrow = parent.previousElementSibling ? parent.previousElementSibling.querySelector('.tree-arrow') : null;
          if (arrow) arrow.classList.add('expanded');
        }
        parent = parent.parentElement ? parent.parentElement.closest('.notes-tree') : null;
      }
    } else {
      allItems[i].classList.remove('active');
    }
  }
}

function showEmpty() {
  var contentEl = document.getElementById('notes-content');
  contentEl.innerHTML =
    '<div class="notes-empty">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>' +
      '<div class="notes-empty-title">Select a note</div>' +
      '<div class="notes-empty-sub">Choose a file from the sidebar to start reading</div>' +
    '</div>';
}

function getFileIcon(name) {
  var ext = name.split('.').pop().toLowerCase();
  var icons = {
    'md':   '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    'pdf':  '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',
    'jpg':  '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    'jpeg': '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    'png':  '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    'gif':  '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    'webp': '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    'svg':  '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    'html': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    'css':  '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    'js':   '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    'json': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    'py':   '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    'java': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    'xmind':'<circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z"/>'
  };
  return icons[ext] || '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
