// MarkMe 配置文件
// 可通过环境变量或此文件配置

module.exports = {
  // 主服务器端口（前端 + API）
  PORT: process.env.PORT || 8080,

  // MCP HTTP Bridge 端口
  MCP_BRIDGE_PORT: process.env.MCP_BRIDGE_PORT || 8081,

  // API Key（可选，设置后需要认证）
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
