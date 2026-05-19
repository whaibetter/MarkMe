#!/usr/bin/env node

/**
 * MarkMe MCP 调用工具
 * 在 Windows 上正确处理 UTF-8 编码
 */

const http = require('http');

const BRIDGE_PORT = process.env.MCP_BRIDGE_PORT || 8081;

function callTool(name, args = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(args);
    const options = {
      hostname: 'localhost',
      port: BRIDGE_PORT,
      path: '/tools/' + name,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data)
      }
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
      reject(new Error(`无法连接到 MCP Bridge (端口 ${BRIDGE_PORT}): ${err.message}\n请先运行: node server/mcp-http-bridge.js`));
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
MarkMe MCP 工具调用器

用法:
  node call-mcp.js <工具名> [参数JSON]

示例:
  node call-mcp.js get_stats
  node call-mcp.js list_posts '{"limit": 5}'
  node call-mcp.js create_post '{"title":"标题","content":"内容","tags":["tag1"]}'
  node call-mcp.js upload_file '{"file_path":"C:/path/to/file.txt"}'
  node call-mcp.js upload_folder '{"folder_path":"C:/path/to/folder"}'

可用工具:
  create_post, update_post, delete_post, list_posts, get_post
  upload_file, upload_folder, list_files, get_file, update_file, replace_file, delete_file
  get_stats
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
