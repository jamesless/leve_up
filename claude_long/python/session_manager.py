"""
Session Manager - 会话管理器 (Python 实现)

整合进度管理、功能管理，提供完整的会话生命周期管理。
"""

import os
import subprocess
from datetime import datetime
from typing import Dict, List

from progress_manager import ProgressManager
from feature_manager import FeatureManager


class SessionManager:
    """管理长期运行代理会话的类"""

    def __init__(self, project_dir: str = "."):
        self.project_dir = os.path.abspath(project_dir)
        self.progress_manager = ProgressManager(os.path.join(project_dir, "claude-progress.txt"))
        self.feature_manager = FeatureManager(os.path.join(project_dir, "feature_list.json"))

    def initialize_project(self) -> None:
        """初始化新项目"""
        print("🚀 Initializing long-running agent project...")

        # 初始化 Git
        if not os.path.exists(os.path.join(self.project_dir, ".git")):
            self._run_command("git init")

        # 初始化文件
        self.progress_manager.initialize()
        self.feature_manager.initialize()

        print("✅ Project initialized successfully!")

    def start_session(self) -> Dict:
        """开始新的编码会话"""
        print("🔄 Starting new coding session...")
        print(f"📁 Working directory: {self.project_dir}\n")

        # 读取进度
        print("📖 Reading progress...")
        progress = self.progress_manager.get_recent_sessions(3)
        for session in progress:
            print(session[:200] + "..." if len(session) > 200 else session)

        # 读取功能
        print("\n📋 Loading features...")
        summary = self.feature_manager.get_summary()
        print(f"Total: {summary['total']}, Completed: {summary['completed']}, Pending: {summary['pending']}")

        # 下一个功能
        print("\n🎯 Next feature:")
        next_feature = self.feature_manager.get_next_pending_feature()
        if next_feature:
            print(f"[{next_feature['id']}] {next_feature['description']}")
        else:
            print("All features completed!")

        return {'progress': progress, 'summary': summary, 'next_feature': next_feature}

    def end_session(self, summary: str) -> None:
        """结束当前会话"""
        print("🏁 Ending session...")
        self.progress_manager.add_session(completed_work=[summary], status="Session completed")
        print("✅ Session ended successfully!")

    def _run_command(self, command: str) -> str:
        """运行命令"""
        try:
            result = subprocess.run(command, shell=True, cwd=self.project_dir,
                                  capture_output=True, text=True)
            return result.stdout
        except Exception as e:
            print(f"Error: {e}")
            return ""


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python session_manager.py <command>")
        print("Commands: init, start, end")
        sys.exit(1)

    sm = SessionManager()
    command = sys.argv[1]

    if command == "init":
        sm.initialize_project()
    elif command == "start":
        sm.start_session()
    elif command == "end":
        summary = ' '.join(sys.argv[2:]) if len(sys.argv) > 2 else "Session completed"
        sm.end_session(summary)
