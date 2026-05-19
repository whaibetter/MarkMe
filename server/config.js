// MarkMe 配置文件
// 可通过环境变量或此文件配置

module.exports = {
  // 主服务器端口（前端 + API）
  PORT: process.env.PORT || 8080,

  // MCP HTTP Bridge 端口
  MCP_BRIDGE_PORT: process.env.MCP_BRIDGE_PORT || 8081,

  // 监听地址（0.0.0.0 = 公网可访问，127.0.0.1 = 仅本地）
  HOST: process.env.MARKME_HOST || '0.0.0.0',

  // API Key（远程访问时强烈建议设置）
  API_KEY: process.env.MARKME_API_KEY || '',

  // 上传文件大小限制（字节）
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 50 * 1024 * 1024,

  // 允许的文件扩展名
  ALLOWED_EXTENSIONS: [
    '.md', '.txt', '.json', '.csv', '.xml', '.yaml', '.yml',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.zip', '.tar', '.gz',
    '.html', '.css', '.js'
  ]
};
