// ===== Theme Management =====

var themes = ['dark', 'light', 'nord', 'dracula', 'forest', 'cyberpunk', 'retro'];
var themeLabels = {
  dark: 'Dark',
  light: 'Light',
  nord: 'Nord',
  dracula: 'Dracula',
  forest: 'Forest',
  cyberpunk: 'Cyberpunk',
  retro: 'Retro'
};

var dropdownOpen = false;

export function initTheme() {
  var saved = localStorage.getItem('markme-theme');
  if (saved && themes.indexOf(saved) >= 0) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-theme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  updateToggleLabel();
}

export function toggleTheme() {
  var toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;

  var dropdown = toggle.querySelector('.theme-dropdown');
  if (dropdown) {
    toggleDropdown(dropdown);
  } else {
    // Fallback: cycle through themes
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var idx = themes.indexOf(current);
    var next = themes[(idx + 1) % themes.length];
    setTheme(next);
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('markme-theme', theme);
  updateToggleLabel();
  updateDropdownActive();
}

function toggleDropdown(dropdown) {
  dropdownOpen = !dropdownOpen;
  if (dropdownOpen) {
    dropdown.classList.add('open');
    updateDropdownActive();
    // Close on outside click
    setTimeout(function() {
      document.addEventListener('click', closeDropdownOutside);
    }, 10);
  } else {
    dropdown.classList.remove('open');
    document.removeEventListener('click', closeDropdownOutside);
  }
}

function closeDropdownOutside(e) {
  var toggle = document.querySelector('.theme-toggle');
  if (toggle && !toggle.contains(e.target)) {
    var dropdown = toggle.querySelector('.theme-dropdown');
    if (dropdown) {
      dropdown.classList.remove('open');
      dropdownOpen = false;
    }
    document.removeEventListener('click', closeDropdownOutside);
  }
}

function updateDropdownActive() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var items = document.querySelectorAll('.theme-dropdown-item');
  for (var i = 0; i < items.length; i++) {
    if (items[i].getAttribute('data-theme') === current) {
      items[i].classList.add('active');
    } else {
      items[i].classList.remove('active');
    }
  }
}

export function createThemeDropdown() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var html = '<div class="theme-dropdown">';
  for (var i = 0; i < themes.length; i++) {
    var t = themes[i];
    html += '<button class="theme-dropdown-item' + (t === current ? ' active' : '') + '" data-theme="' + t + '">';
    html += '<span class="theme-dropdown-dot" data-theme="' + t + '"></span>';
    html += themeLabels[t];
    html += '</button>';
  }
  html += '</div>';
  return html;
}

export function bindDropdownEvents() {
  var items = document.querySelectorAll('.theme-dropdown-item');
  for (var i = 0; i < items.length; i++) {
    items[i].addEventListener('click', function(e) {
      e.stopPropagation();
      var theme = this.getAttribute('data-theme');
      setTheme(theme);
      var dropdown = document.querySelector('.theme-dropdown');
      if (dropdown) {
        dropdown.classList.remove('open');
        dropdownOpen = false;
      }
    });
  }
}

function updateToggleLabel() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var label = document.querySelector('.theme-label');
  if (label) label.textContent = themeLabels[current] || current;
}

export function getThemeLabel(theme) {
  return themeLabels[theme] || theme;
}
