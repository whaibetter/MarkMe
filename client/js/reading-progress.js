// ===== Reading Progress =====

var scrollProgressHandler = null;

export function setupReadingProgress() {
  cleanupReadingProgress();
  var progressBar = document.getElementById('reading-progress');
  if (!progressBar) return;
  progressBar.classList.add('active');

  scrollProgressHandler = function() {
    var content = document.querySelector('.post-content');
    if (!content) return;
    var rect = content.getBoundingClientRect();
    var contentTop = rect.top + window.scrollY;
    var contentHeight = content.offsetHeight;
    var scrolled = window.scrollY - contentTop;
    var total = contentHeight - window.innerHeight;
    var pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
    progressBar.style.setProperty('--progress', pct + '%');
  };
  window.addEventListener('scroll', scrollProgressHandler, { passive: true });
  scrollProgressHandler();
}

export function cleanupReadingProgress() {
  if (scrollProgressHandler) {
    window.removeEventListener('scroll', scrollProgressHandler);
    scrollProgressHandler = null;
  }
  var progressBar = document.getElementById('reading-progress');
  if (progressBar) {
    progressBar.classList.remove('active');
    progressBar.style.setProperty('--progress', '0%');
  }
}
