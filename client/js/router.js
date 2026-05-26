// ===== Router =====

import { initTheme } from './theme.js';
import { removeMobileToc, disconnectTocObserver } from './toc.js';
import { cleanupReadingProgress } from './reading-progress.js';
import { showProfile } from './pages/profile.js';
import { showHome } from './pages/home.js';
import { showPost } from './pages/post.js';
import { showTags, showTagPosts } from './pages/tags.js';

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

  if (path === '/tags') {
    showTags(app);
    updateNav('topics');
  } else if (path.indexOf('/post/') === 0) {
    var id = path.split('/')[2];
    showPost(app, id);
    updateNav('');
  } else if (search.indexOf('tag=') >= 0) {
    var params = new URLSearchParams(search);
    var tag = params.get('tag');
    showTagPosts(app, tag);
    updateNav('topics');
  } else {
    // Homepage sections
    var section = new URLSearchParams(search).get('section') || 'blogs';
    if (section === 'blogs') {
      showHome(app);
      updateNav('blogs');
    } else if (section === 'topics') {
      showTags(app);
      updateNav('topics');
    } else if (section === 'home') {
      showProfile(app);
      updateNav('home');
    } else {
      showHome(app);
      updateNav('blogs');
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

// Navigation
export function goTag(tag) {
  console.log('goTag:', tag);
  window.location.href = '/?section=topics&tag=' + encodeURIComponent(tag);
}

// Make goTag available globally for onclick handlers
window.goTag = goTag;
