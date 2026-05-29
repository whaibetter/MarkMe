// ===== Scroll-Triggered Reveal System =====
// Lightweight IntersectionObserver-based animation system

var observer = null;
var staggerObserver = null;

var REVEAL_CLASS = 'reveal';
var STAGGER_CLASS = 'reveal-stagger';
var VISIBLE_CLASS = 'revealed';

function createObserver() {
  if (observer) return;

  observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add(VISIBLE_CLASS);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  staggerObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var children = entry.target.querySelectorAll('.' + STAGGER_CLASS);
        for (var i = 0; i < children.length; i++) {
          (function(el, delay) {
            setTimeout(function() {
              el.classList.add(VISIBLE_CLASS);
            }, delay);
          })(children[i], i * 80);
        }
        staggerObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -30px 0px'
  });
}

export function initAnimations() {
  createObserver();
  observeElements();
}

export function observeElements() {
  if (!observer) createObserver();

  var reveals = document.querySelectorAll('.' + REVEAL_CLASS);
  for (var i = 0; i < reveals.length; i++) {
    if (!reveals[i].classList.contains(VISIBLE_CLASS)) {
      observer.observe(reveals[i]);
    }
  }

  var staggers = document.querySelectorAll('[data-stagger]');
  for (var j = 0; j < staggers.length; j++) {
    if (!staggers[j].hasAttribute('data-stagger-observed')) {
      staggers[j].setAttribute('data-stagger-observed', 'true');
      staggerObserver.observe(staggers[j]);
    }
  }
}

export function cleanupAnimations() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (staggerObserver) {
    staggerObserver.disconnect();
    staggerObserver = null;
  }
}
