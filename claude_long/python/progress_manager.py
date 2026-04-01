"""
Progress Manager - 进度管理器 (Python 实现)

管理 claude-progress.txt 文件，记录和读取项目会话进度。
"""

import os
from datetime import datetime
from typing import List, Dict, Optional


class ProgressManager:
    """管理项目进度文件的类"""

    def __init__(self, progress_file: str = "claude-progress.txt"):
        self.progress_file = progress_file

    def initialize(self) -> None:
        """初始化进度文件"""
        if os.path.exists(self.progress_file):
            print(f"Warning: {self.progress_file} already exists")
            return

        initial_content = """# Claude Long-Running Agent Progress Log

This file tracks the progress of long-running agent sessions.

=== Session 1: Initial Setup ===
Completed:
- Initialized progress tracking system

Status: Ready to begin development

---
"""
        with open(self.progress_file, 'w', encoding='utf-8') as f:
            f.write(initial_content)

        print(f"Initialized progress file: {self.progress_file}")

    def read(self) -> str:
        """读取整个进度文件"""
        if not os.path.exists(self.progress_file):
            return ""
        with open(self.progress_file, 'r', encoding='utf-8') as f:
            return f.read()

    def get_recent_sessions(self, count: int = 5) -> List[str]:
        """获取最近的几个会话记录"""
        content = self.read()
        sessions = content.split('=== Session')
        if len(sessions) > 0 and 'Progress Log' in sessions[0]:
            sessions = sessions[1:]
        recent = sessions[-count:] if len(sessions) > count else sessions
        return ['=== Session' + s for s in recent]

    def add_session(
        self,
        session_number: Optional[int] = None,
        completed_work: List[str] = None,
        status: str = "",
        next_steps: List[str] = None,
        notes: str = ""
    ) -> None:
        """添加新的会话记录"""
        if completed_work is None:
            completed_work = []
        if next_steps is None:
            next_steps = []

        if session_number is None:
            content = self.read()
            session_number = content.count('=== Session') + 1

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        session_entry = f"\n=== Session {session_number}: {timestamp} ===\n"

        if completed_work:
            session_entry += "\nCompleted:\n"
            for work in completed_work:
                session_entry += f"- {work}\n"

        if status:
            session_entry += f"\nStatus: {status}\n"

        if next_steps:
            session_entry += "\nNext Steps:\n"
            for step in next_steps:
                session_entry += f"- {step}\n"

        if notes:
            session_entry += f"\nNotes:\n{notes}\n"

        session_entry += "\n---\n"

        with open(self.progress_file, 'a', encoding='utf-8') as f:
            f.write(session_entry)

        print(f"Added Session {session_number} to {self.progress_file}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python progress_manager.py <command>")
        print("Commands: init, read, recent, add")
        sys.exit(1)

    pm = ProgressManager()
    command = sys.argv[1]

    if command == "init":
        pm.initialize()
    elif command == "read":
        print(pm.read())
    elif command == "recent":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        for session in pm.get_recent_sessions(count):
            print(session)
    elif command == "add":
        message = ' '.join(sys.argv[2:]) if len(sys.argv) > 2 else "Session completed"
        pm.add_session(completed_work=[message], status="Session completed")
