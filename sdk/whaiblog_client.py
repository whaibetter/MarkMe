"""
WhaiBlog SDK - Python 客户端
用于 AI Agent 集成 WhaiBlog 博客系统
"""

import requests
import json
import os
from typing import Optional, List, Dict, Any
from pathlib import Path


def _load_config() -> Dict:
    """读取 ~/.whaiblog/config.json 配置文件"""
    config_path = Path.home() / '.whaiblog' / 'config.json'
    try:
        if config_path.exists():
            return json.loads(config_path.read_text(encoding='utf-8'))
    except Exception:
        pass
    return {}


def _save_config(config: Dict):
    """保存配置到 ~/.whaiblog/config.json"""
    config_dir = Path.home() / '.whaiblog'
    config_dir.mkdir(parents=True, exist_ok=True)
    config_path = config_dir / 'config.json'
    config_path.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding='utf-8')


class WhaiBlogClient:
    """WhaiBlog 博客系统 Python SDK (HTTP REST API)

    地址优先级：参数 > 配置文件 > 默认值
    """

    def __init__(self, base_url: str = None, api_key: str = None):
        config = _load_config()

        if base_url:
            self.base_url = base_url.rstrip('/')
        elif config.get('server_url'):
            self.base_url = config['server_url'].rstrip('/')
        else:
            self.base_url = 'http://localhost:8080/api'

        self.api_key = api_key or config.get('api_key', '')

    def _get_bridge_url(self) -> str:
        """获取 bridge URL（用于写操作）"""
        base = self.base_url
        if base.endswith('/api'):
            base = base[:-4]
        return base + '/bridge/tools'

    def _request(self, method: str, endpoint: str, **kwargs) -> Any:
        url = f"{self.base_url}{endpoint}"
        headers = kwargs.pop('headers', {})
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        response = requests.request(method, url, headers=headers, **kwargs)
        response.raise_for_status()
        return response.json()

    def _call_tool(self, tool_name: str, args: Dict = None) -> Any:
        """通过 bridge 调用工具"""
        url = f"{self._get_bridge_url()}/{tool_name}"
        headers = {'Content-Type': 'application/json'}
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        response = requests.post(url, json=args or {}, headers=headers)
        response.raise_for_status()
        return response.json()

    # ========== 配置管理 ==========

    def get_config(self) -> Dict:
        """获取 WhaiBlog 客户端配置"""
        return self._call_tool('get_whaiblog_config')

    def set_config(self, server_url: str, api_key: str = '') -> Dict:
        """设置 WhaiBlog 客户端配置"""
        result = self._call_tool('set_whaiblog_config', {
            'server_url': server_url,
            'api_key': api_key
        })
        # 同时更新本地配置
        if result.get('success'):
            self.base_url = server_url.rstrip('/')
            self.api_key = api_key
        return result

    # ========== 文章管理 ==========

    def create_post(self, title: str, content: str,
                    summary: Optional[str] = None,
                    tags: Optional[List[str]] = None,
                    status: str = "published") -> Dict:
        """创建博客文章"""
        return self._call_tool('create_post', {
            'title': title,
            'content': content,
            'summary': summary,
            'tags': tags or [],
            'status': status
        })

    def get_posts(self, page: int = 1, limit: int = 10,
                  tag: Optional[str] = None,
                  status: str = "published") -> Dict:
        """获取文章列表"""
        params = {"page": page, "limit": limit, "status": status}
        if tag:
            params["tag"] = tag
        return self._request("GET", "/posts", params=params)

    def get_post(self, post_id: int) -> Dict:
        """获取文章详情"""
        return self._request("GET", f"/posts/{post_id}")

    def update_post(self, post_id: int, **kwargs) -> Dict:
        """更新文章"""
        return self._call_tool('update_post', {'id': post_id, **kwargs})

    def delete_post(self, post_id: int) -> Dict:
        """删除文章"""
        return self._call_tool('delete_post', {'id': post_id})

    def list_posts(self, page: int = 1, limit: int = 20, status: str = 'all') -> Dict:
        """列出文章（通过 bridge）"""
        return self._call_tool('list_posts', {
            'page': page, 'limit': limit, 'status': status
        })

    def get_tags(self) -> List[str]:
        """获取所有标签"""
        return self._request("GET", "/tags")

    def get_stats(self) -> Dict:
        """获取博客统计"""
        return self._call_tool('get_stats')

    # ========== 文件管理 ==========

    def list_files(self) -> List[Dict]:
        """列出所有文件"""
        return self._call_tool('list_files')

    def get_file(self, file_id: int) -> Dict:
        """获取文件详情"""
        return self._call_tool('get_file', {'id': file_id})

    def upload_file(self, file_path: str, post_id: Optional[int] = None) -> Dict:
        """上传服务器本地文件"""
        args = {'file_path': file_path}
        if post_id:
            args['post_id'] = post_id
        return self._call_tool('upload_file', args)

    def upload_content(self, filename: str, content_b64: str, post_id: Optional[int] = None) -> Dict:
        """通过 base64 上传文件内容"""
        args = {'filename': filename, 'content': content_b64}
        if post_id:
            args['post_id'] = post_id
        return self._call_tool('upload_content', args)

    def upload_folder(self, folder_path: str, post_id: Optional[int] = None) -> Dict:
        """上传整个文件夹"""
        args = {'folder_path': folder_path}
        if post_id:
            args['post_id'] = post_id
        return self._call_tool('upload_folder', args)

    def update_file(self, file_id: int, **kwargs) -> Dict:
        """更新文件元数据"""
        return self._call_tool('update_file', {'id': file_id, **kwargs})

    def delete_file(self, file_id: int) -> Dict:
        """删除文件"""
        return self._call_tool('delete_file', {'id': file_id})

    # ========== 系统 ==========

    def get_system_info(self) -> Dict:
        """获取系统资源使用情况"""
        return self._call_tool('get_system_info')

    # ========== RSS ==========

    def add_rss_source(self, url: str, title: str = None) -> Dict:
        """添加 RSS 订阅源"""
        args = {'url': url}
        if title:
            args['title'] = title
        return self._call_tool('add_rss_source', args)

    def list_rss_sources(self) -> Dict:
        """列出所有 RSS 订阅源"""
        return self._call_tool('list_rss_sources')

    def remove_rss_source(self, source_id: int) -> Dict:
        """删除 RSS 订阅源"""
        return self._call_tool('remove_rss_source', {'id': source_id})

    def fetch_rss(self, source_id: int = None) -> Dict:
        """从 RSS 源抓取新内容"""
        if source_id:
            return self._call_tool('fetch_rss', {'id': source_id})
        return self._call_tool('fetch_rss')

    def get_rss_status(self) -> Dict:
        """获取 RSS 系统状态"""
        return self._call_tool('get_rss_status')


class WhaiBlogMCPClient:
    """通过 MCP 协议调用 WhaiBlog (需要 mcp 包)"""

    def __init__(self, server_path: str = None):
        config = _load_config()
        self.server_path = server_path or "C:/Users/whai/Documents/Project/MarkMe/server/mcp-server.js"
        self._session = None

    async def connect(self):
        """连接到 MCP 服务器"""
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        server_params = StdioServerParameters(
            command="node",
            args=[self.server_path]
        )

        self._read, self._write = await stdio_client(server_params).__aenter__()
        self._session = ClientSession(self._read, self._write)
        await self._session.__aenter__()
        await self._session.initialize()

    async def disconnect(self):
        """断开连接"""
        if self._session:
            await self._session.__aexit__(None, None, None)

    async def call_tool(self, tool_name: str, arguments: Dict) -> Any:
        """调用 MCP 工具"""
        result = await self._session.call_tool(tool_name, arguments)
        return result

    async def get_config(self) -> Dict:
        return await self.call_tool('get_whaiblog_config', {})

    async def set_config(self, server_url: str, api_key: str = '') -> Dict:
        return await self.call_tool('set_whaiblog_config', {
            'server_url': server_url,
            'api_key': api_key
        })

    async def create_post(self, title: str, content: str, **kwargs) -> Dict:
        return await self.call_tool("create_post", {
            "title": title,
            "content": content,
            **kwargs
        })

    async def upload_file(self, file_path: str, post_id: Optional[int] = None) -> Dict:
        args = {"file_path": file_path}
        if post_id:
            args["post_id"] = post_id
        return await self.call_tool("upload_file", args)

    async def upload_folder(self, folder_path: str, post_id: Optional[int] = None) -> Dict:
        args = {"folder_path": folder_path}
        if post_id:
            args["post_id"] = post_id
        return await self.call_tool("upload_folder", args)

    async def list_files(self) -> List:
        return await self.call_tool("list_files", {})

    async def get_file(self, file_id: int) -> Dict:
        return await self.call_tool("get_file", {"id": file_id})

    async def update_file(self, file_id: int, **kwargs) -> Dict:
        return await self.call_tool("update_file", {"id": file_id, **kwargs})

    async def delete_file(self, file_id: int) -> str:
        return await self.call_tool("delete_file", {"id": file_id})


# 便捷函数
def create_client(base_url: str = None, api_key: str = None) -> WhaiBlogClient:
    """创建 WhaiBlog 客户端实例"""
    return WhaiBlogClient(base_url, api_key)


# 使用示例
if __name__ == "__main__":
    client = WhaiBlogClient()

    # 检查配置
    config = client.get_config()
    print(f"配置状态: {config}")

    # 获取统计信息
    stats = client.get_stats()
    print(f"博客统计: {stats}")

    # 获取文章列表
    posts = client.get_posts()
    print(f"文章数量: {posts['total']}")
