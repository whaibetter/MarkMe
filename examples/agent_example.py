"""
MarkMe AI Agent 集成示例
展示如何在 AI Agent 中使用 MarkMe 博客系统
"""

import requests
import json
from typing import Optional, List, Dict
from pathlib import Path


class MarkMeAgent:
    """MarkMe 博客管理 Agent"""

    def __init__(self, base_url: str = "http://localhost:3001"):
        """
        初始化 Agent

        Args:
            base_url: MCP HTTP Bridge 地址 (默认 3001)
        """
        self.base_url = base_url.rstrip('/')
        self.tools_url = f"{self.base_url}/tools"

    def _call_tool(self, tool_name: str, args: Dict = None) -> Dict:
        """调用 MCP 工具"""
        response = requests.post(
            f"{self.tools_url}/{tool_name}",
            json=args or {},
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()

    # ========== 文章管理 ==========

    def create_post(self, title: str, content: str, tags: List[str] = None,
                    summary: str = None, status: str = "published") -> Dict:
        """创建博客文章"""
        args = {
            "title": title,
            "content": content,
            "tags": tags or [],
            "status": status
        }
        if summary:
            args["summary"] = summary
        return self._call_tool("create_post", args)

    def update_post(self, post_id: int, **kwargs) -> Dict:
        """更新文章"""
        return self._call_tool("update_post", {"id": post_id, **kwargs})

    def delete_post(self, post_id: int) -> Dict:
        """删除文章"""
        return self._call_tool("delete_post", {"id": post_id})

    def list_posts(self, page: int = 1, limit: int = 10,
                   status: str = "all") -> Dict:
        """列出文章"""
        return self._call_tool("list_posts", {
            "page": page,
            "limit": limit,
            "status": status
        })

    def get_post(self, post_id: int) -> Dict:
        """获取文章详情"""
        return self._call_tool("get_post", {"id": post_id})

    # ========== 文件管理 ==========

    def upload_file(self, file_path: str, post_id: int = None) -> Dict:
        """上传单个文件"""
        args = {"file_path": file_path}
        if post_id:
            args["post_id"] = post_id
        return self._call_tool("upload_file", args)

    def upload_folder(self, folder_path: str, post_id: int = None) -> Dict:
        """上传整个文件夹"""
        args = {"folder_path": folder_path}
        if post_id:
            args["post_id"] = post_id
        return self._call_tool("upload_folder", args)

    def list_files(self) -> Dict:
        """列出所有文件"""
        return self._call_tool("list_files")

    def get_file(self, file_id: int) -> Dict:
        """获取文件详情"""
        return self._call_tool("get_file", {"id": file_id})

    def update_file(self, file_id: int, original_name: str = None,
                    post_id: int = None) -> Dict:
        """更新文件元数据"""
        args = {"id": file_id}
        if original_name:
            args["original_name"] = original_name
        if post_id is not None:
            args["post_id"] = post_id
        return self._call_tool("update_file", args)

    def replace_file(self, file_id: int, new_file_path: str) -> Dict:
        """替换文件内容"""
        return self._call_tool("replace_file", {
            "id": file_id,
            "file_path": new_file_path
        })

    def delete_file(self, file_id: int) -> Dict:
        """删除文件"""
        return self._call_tool("delete_file", {"id": file_id})

    # ========== 统计 ==========

    def get_stats(self) -> Dict:
        """获取博客统计"""
        return self._call_tool("get_stats")

    # ========== 高级功能 ==========

    def publish_with_files(self, title: str, content: str,
                           file_paths: List[str], tags: List[str] = None) -> Dict:
        """发布文章并关联文件

        1. 创建文章
        2. 上传所有文件并关联到文章
        """
        # 创建文章
        post_result = self.create_post(title, content, tags)
        if not post_result.get("success"):
            return post_result

        post_id = post_result["data"]["id"]

        # 上传文件
        uploaded_files = []
        for file_path in file_paths:
            file_result = self.upload_file(file_path, post_id)
            if file_result.get("success"):
                uploaded_files.append(file_result["data"])

        return {
            "success": True,
            "post": post_result["data"],
            "files": uploaded_files
        }

    def publish_folder(self, title: str, content: str,
                       folder_path: str, tags: List[str] = None) -> Dict:
        """发布文章并上传整个文件夹

        1. 创建文章
        2. 上传文件夹中的所有文件
        """
        # 创建文章
        post_result = self.create_post(title, content, tags)
        if not post_result.get("success"):
            return post_result

        post_id = post_result["data"]["id"]

        # 上传文件夹
        folder_result = self.upload_folder(folder_path, post_id)

        return {
            "success": True,
            "post": post_result["data"],
            "files": folder_result.get("data", [])
        }


# ========== 使用示例 ==========

def main():
    # 创建 Agent
    agent = MarkMeAgent()

    # 1. 获取博客统计
    print("=== 博客统计 ===")
    stats = agent.get_stats()
    print(json.dumps(stats, indent=2, ensure_ascii=False))

    # 2. 列出文章
    print("\n=== 文章列表 ===")
    posts = agent.list_posts()
    for post in posts.get("data", []):
        print(f"- [{post['id']}] {post['title']}")

    # 3. 创建文章 (示例，已注释)
    # result = agent.create_post(
    #     title="AI Agent 测试文章",
    #     content="# 测试\n\n这是通过 AI Agent 创建的文章",
    #     tags=["ai", "test"]
    # )
    # print(f"\n创建文章: {result}")

    # 4. 上传文件 (示例，已注释)
    # result = agent.upload_file("C:/path/to/file.txt")
    # print(f"\n上传文件: {result}")

    # 5. 发布带文件的文章 (示例，已注释)
    # result = agent.publish_with_files(
    #     title="完整教程",
    #     content="# 教程内容\n\n...",
    #     file_paths=["C:/docs/tutorial.pdf", "C:/docs/code.zip"],
    #     tags=["tutorial", "python"]
    # )
    # print(f"\n发布结果: {result}")


if __name__ == "__main__":
    main()
