"""
MarkMe Blog SDK - Python 客户端
用于 AI Agent 集成 MarkMe 博客系统
"""

import requests
from typing import Optional, List, Dict, Any
from pathlib import Path


class MarkMeClient:
    """MarkMe 博客系统 Python SDK"""

    def __init__(self, base_url: str = "http://localhost:3000/api"):
        self.base_url = base_url.rstrip('/')

    def _request(self, method: str, endpoint: str, **kwargs) -> Any:
        url = f"{self.base_url}{endpoint}"
        response = requests.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    # ========== 文章管理 ==========

    def create_post(self, title: str, content: str,
                    summary: Optional[str] = None,
                    tags: Optional[List[str]] = None,
                    status: str = "published") -> Dict:
        """创建博客文章

        Args:
            title: 文章标题
            content: 文章内容 (Markdown)
            summary: 文章摘要 (可选，默认取内容前200字)
            tags: 标签列表
            status: 状态 (published/draft)

        Returns:
            创建的文章信息
        """
        return self._request("POST", "/posts", json={
            "title": title,
            "content": content,
            "summary": summary,
            "tags": tags or [],
            "status": status
        })

    def get_posts(self, page: int = 1, limit: int = 10,
                  tag: Optional[str] = None,
                  status: str = "published") -> Dict:
        """获取文章列表

        Args:
            page: 页码
            limit: 每页数量
            tag: 按标签筛选
            status: 按状态筛选

        Returns:
            文章列表和分页信息
        """
        params = {"page": page, "limit": limit, "status": status}
        if tag:
            params["tag"] = tag
        return self._request("GET", "/posts", params=params)

    def get_post(self, post_id: int) -> Dict:
        """获取文章详情

        Args:
            post_id: 文章 ID

        Returns:
            文章详情 (包含关联文件)
        """
        return self._request("GET", f"/posts/{post_id}")

    def get_tags(self) -> List[str]:
        """获取所有标签

        Returns:
            标签列表
        """
        return self._request("GET", "/tags")

    def get_stats(self) -> Dict:
        """获取博客统计

        Returns:
            统计信息 (文章数、文件数)
        """
        return self._request("GET", "/stats")

    # ========== 文件管理 (通过 HTTP API) ==========

    def list_files(self) -> List[Dict]:
        """列出所有文件

        Returns:
            文件列表
        """
        return self._request("GET", "/files")

    def get_file(self, file_id: int) -> Dict:
        """获取文件详情

        Args:
            file_id: 文件 ID

        Returns:
            文件详情
        """
        return self._request("GET", f"/files/{file_id}")


class MarkMeMCPClient:
    """通过 MCP 协议调用 MarkMe (需要 mcp 包)"""

    def __init__(self, server_path: str = "C:/Users/whai/Documents/Project/MarkMe/server/mcp-server.js"):
        self.server_path = server_path
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
        """调用 MCP 工具

        Args:
            tool_name: 工具名称
            arguments: 工具参数

        Returns:
            工具返回结果
        """
        result = await self._session.call_tool(tool_name, arguments)
        return result

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
def create_client(base_url: str = "http://localhost:3000/api") -> MarkMeClient:
    """创建 MarkMe 客户端实例"""
    return MarkMeClient(base_url)


# 使用示例
if __name__ == "__main__":
    client = MarkMeClient()

    # 获取统计信息
    stats = client.get_stats()
    print(f"博客统计: {stats}")

    # 获取文章列表
    posts = client.get_posts()
    print(f"文章数量: {posts['total']}")

    # 创建文章
    # result = client.create_post(
    #     title="SDK 测试",
    #     content="# 测试\n\n通过 Python SDK 创建",
    #     tags=["python", "sdk"]
    # )
    # print(f"创建成功: {result}")
