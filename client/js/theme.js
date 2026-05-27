// ===== Theme Management =====

var themes = ['dark', 'light', 'nord', 'dracula', 'forest', 'cyberpunk'];
var themeLabels = {
  dark: 'Dark',
  light: 'Light',
  nord: 'Nord',
  dracula: 'Dracula',
  forest: 'Forest',
  cyberpunk: 'Cyberpunk'
};

export function initTheme() {
  var saved = localStorage.getItem('markme-theme');
  if (saved && themes.indexOf(saved) >= 0) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  updateToggleLabel();
}

export function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var idx = themes.indexOf(current);
  var next = themes[(idx + 1) % themes.length];
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('markme-theme', next);
  updateToggleLabel();
}

function updateToggleLabel() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var label = document.querySelector('.theme-label');
  if (label) label.textContent = themeLabels[current] || current;
}

export function getThemeLabel(theme) {
  return themeLabels[theme] || theme;
}
