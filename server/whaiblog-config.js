const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.whaiblog');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return null;
}

function setConfig(serverUrl, apiKey) {
  ensureDir();
  const config = getConfig() || {};
  if (serverUrl !== undefined) config.server_url = serverUrl.replace(/\/+$/, '');
  if (apiKey !== undefined) config.api_key = apiKey;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  return config;
}

function ensureConfig() {
  const config = getConfig();
  if (!config || !config.server_url) return null;
  return config;
}

function getConfigPath() {
  return CONFIG_FILE;
}

module.exports = { getConfig, setConfig, ensureConfig, getConfigPath };
