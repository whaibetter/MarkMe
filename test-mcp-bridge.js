/**
 * 测试 MCP HTTP Bridge
 */

const http = require('http');

const BRIDGE_URL = 'http://localhost:3001';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BRIDGE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: { 'Content-Type': 'application/json' }
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

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testBridge() {
  console.log('=== Testing MCP HTTP Bridge ===\n');

  try {
    // 1. 列出工具
    console.log('1. Listing available tools...');
    const tools = await request('GET', '/tools');
    console.log(`   Found ${tools.tools.length} tools:`);
    tools.tools.forEach(t => console.log(`   - ${t.name}: ${t.description}`));
    console.log();

    // 2. 获取统计
    console.log('2. Getting stats...');
    const stats = await request('POST', '/tools/get_stats');
    console.log('   Stats:', JSON.stringify(stats.data, null, 2));
    console.log();

    // 3. 列出文章
    console.log('3. Listing posts...');
    const posts = await request('POST', '/tools/list_posts', { limit: 5 });
    console.log(`   Found ${posts.data.length} posts`);
    console.log();

    // 4. 列出文件
    console.log('4. Listing files...');
    const files = await request('POST', '/tools/list_files');
    console.log(`   Found ${files.data.length} files`);
    console.log();

    // 5. 创建文章 (测试)
    console.log('5. Creating test post...');
    const createResult = await request('POST', '/tools/create_post', {
      title: 'MCP Bridge 测试',
      content: '# 测试\n\n这是通过 MCP HTTP Bridge 创建的文章',
      tags: ['test', 'mcp']
    });
    console.log('   Result:', createResult.success ? 'Success' : 'Failed');
    if (createResult.data) {
      console.log(`   Post ID: ${createResult.data.id}`);
    }
    console.log();

    console.log('=== All tests passed! ===');

  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('\nMake sure the MCP HTTP Bridge is running:');
    console.log('  node server/mcp-http-bridge.js');
  }
}

testBridge();
