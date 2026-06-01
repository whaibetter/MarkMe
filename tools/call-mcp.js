#!/usr/bin/env node

/**
 * WhaiBlog MCP 调用工具
 * 在 Windows 上正确处理 UTF-8 编码
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 读取配置文件 ~/.whaiblog/config.json
function loadConfig() {
  const configPath = path.join(os.homedir(), '.whaiblog', 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return null;
}

const config = loadConfig();

// 优先级：环境变量 > 配置文件 > 默认值
const BRIDGE_HOST = process.env.MARKME_HOST
  || (config && config.server_url ? new URL(config.server_url).hostname : 'localhost');
const BRIDGE_PORT = process.env.MCP_BRIDGE_PORT
  || (config && config.server_url ? new URL(config.server_url).port : '8081');
const API_KEY = process.env.MARKME_API_KEY
  || (config && config.api_key ? config.api_key : '');

function callTool(name, args = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(args);
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(data)
    };
    if (API_KEY) {
      headers['Authorization'] = 'Bearer ' + API_KEY;
    }
    const options = {
      hostname: BRIDGE_HOST,
      port: BRIDGE_PORT,
      path: '/bridge/tools/' + name,
      method: 'POST',
      headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', (err) => {
      const configPath = path.join(os.homedir(), '.whaiblog', 'config.json');
      reject(new Error(`无法连接到 WhaiBlog 服务器 (${BRIDGE_HOST}:${BRIDGE_PORT}): ${err.message}\n请检查配置文件: ${configPath}\n或设置环境变量: MARKME_HOST / MCP_BRIDGE_PORT`));
    });

    req.write(data);
    req.end();
  });
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
WhaiBlog MCP 工具调用器

用法:
  node call-mcp.js <工具名> [参数JSON]

配置 (优先级从高到低):
  1. 环境变量: MARKME_HOST, MCP_BRIDGE_PORT, MARKME_API_KEY
  2. 配置文件: ~/.whaiblog/config.json
  3. 默认值: localhost:8081

配置文件:
  当前配置: ${config ? JSON.stringify(config) : '未配置'}
  配置路径: ${path.join(os.homedir(), '.whaiblog', 'config.json')}

示例:
  node call-mcp.js get_stats
  node call-mcp.js list_posts '{"limit": 5}'
  node call-mcp.js create_post '{"title":"标题","content":"内容","tags":["tag1"]}'
  node call-mcp.js create_feed '{"title":"标题","content":"内容","source":"来源","tags":["tag1"]}'
  node call-mcp.js list_feeds '{"limit": 10}'
  node call-mcp.js upload_file '{"file_path":"C:/path/to/file.txt"}'
  node call-mcp.js upload_content '{"filename":"test.md","content":"base64内容"}'
  node call-mcp.js upload_folder '{"folder_path":"C:/path/to/folder"}'
  node call-mcp.js get_markme_config
  node call-mcp.js set_markme_config '{"server_url":"http://117.72.196.45:8080"}'

可用工具:
  create_post, update_post, delete_post, list_posts, get_post
  create_feed, list_feeds, get_feed, update_feed, delete_feed
  upload_file, upload_content, upload_folder
  list_files, get_file, update_file, replace_file, replace_file_content, delete_file
  get_stats, get_system_info
  get_markme_config, set_markme_config
`);
    return;
  }

  const toolName = args[0];
  let toolArgs = {};

  if (args[1]) {
    try {
      toolArgs = JSON.parse(args[1]);
    } catch (e) {
      console.error('参数 JSON 格式错误:', e.message);
      process.exit(1);
    }
  }

  try {
    const result = await callTool(toolName, toolArgs);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('错误:', err.message);
    process.exit(1);
  }
}

main();
