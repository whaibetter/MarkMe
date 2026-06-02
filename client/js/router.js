// ===== Router =====

import { initTheme } from './theme.js';
import { removeMobileToc, disconnectTocObserver } from './toc.js';
import { cleanupReadingProgress } from './reading-progress.js';
import { showProfile } from './pages/profile.js';
import { showHome } from './pages/home.js';
import { showPost } from './pages/post.js';
import { showNotes } from './pages/notes.js';
import { showFeed } from './pages/feed.js';
import { showRssReader } from './pages/rss-reader.js';

export function init() {
  console.log('init called');
  var app = document.getElementById('app');
  var main = document.querySelector('.main');
  if (main) main.classList.remove('post-page');
  removeMobileToc();
  cleanupReadingProgress();
  disconnectTocObserver();
  initTheme();

  var path = window.location.pathname;
  var search = window.location.search;
  console.log('Path:', path, 'Search:', search);

  if (path.indexOf('/post/') === 0) {
    var id = path.split('/')[2];
    showPost(app, id);
    updateNav('');
  } else {
    // Homepage sections
    var params = new URLSearchParams(search);
    var section = params.get('section') || 'feed';
    var tag = params.get('tag');

    if (section === 'feed' && !tag) {
      var source = params.get('source') || '';
      showFeed(app, source);
      updateNav('feed');
    } else if (section === 'blogs' || tag) {
      showHome(app, tag);
      updateNav('blogs');
    } else if (section === 'notes') {
      showNotes(app);
      updateNav('notes');
    } else if (section === 'about') {
      showProfile(app);
      updateNav('about');
    } else if (section === 'rss') {
      showRssReader(app);
      updateNav('rss');
    } else {
      showFeed(app);
      updateNav('feed');
    }
  }
}

function updateNav(active) {
  var links = document.querySelectorAll('.nav a[data-section]');
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    if (link.getAttribute('data-section') === active) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  }
}

// Navigation — go to blogs page with tag filter
export function goTag(tag) {
  console.log('goTag:', tag);
  if (tag) {
    history.pushState(null, '', '/?section=blogs&tag=' + encodeURIComponent(tag));
  } else {
    history.pushState(null, '', '/?section=blogs');
  }
  init();
}

// Clear tag filter — go to blogs page
export function clearTag() {
  history.pushState(null, '', '/?section=blogs');
  init();
}

// Make globally available for onclick handlers
window.goTag = goTag;
window.clearTag = clearTag;
