"""
Feature Manager - 功能列表管理器 (Python 实现)

管理 feature_list.json 文件，追踪项目功能的实现状态。
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Optional


class FeatureManager:
    """管理功能列表的类"""

    def __init__(self, feature_file: str = "feature_list.json"):
        self.feature_file = feature_file

    def initialize(self, features: List[Dict] = None) -> None:
        """初始化功能列表文件"""
        if os.path.exists(self.feature_file):
            print(f"Warning: {self.feature_file} already exists")
            return

        if features is None:
            features = [{
                "id": "F001",
                "category": "setup",
                "priority": 1,
                "description": "Project initialization",
                "steps": ["Initialize structure", "Setup environment"],
                "passes": False,
                "notes": "",
                "created_at": datetime.now().isoformat()
            }]

        self.save(features)
        print(f"Initialized feature list: {self.feature_file}")

    def load(self) -> List[Dict]:
        """加载功能列表"""
        if not os.path.exists(self.feature_file):
            return []
        with open(self.feature_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def save(self, features: List[Dict]) -> None:
        """保存功能列表"""
        with open(self.feature_file, 'w', encoding='utf-8') as f:
            json.dump(features, f, indent=2, ensure_ascii=False)

    def get_next_pending_feature(self) -> Optional[Dict]:
        """获取下一个待完成的功能"""
        features = self.load()
        pending = [f for f in features if not f.get('passes', False)]
        if not pending:
            return None
        pending.sort(key=lambda x: x.get('priority', 999))
        return pending[0]

    def mark_as_complete(self, feature_id: str, notes: str = "") -> bool:
        """标记功能为完成"""
        features = self.load()
        for feature in features:
            if feature['id'] == feature_id:
                feature['passes'] = True
                feature['completed_at'] = datetime.now().isoformat()
                if notes:
                    feature['notes'] = notes
                self.save(features)
                print(f"Marked feature {feature_id} as complete")
                return True
        print(f"Feature {feature_id} not found")
        return False

    def get_summary(self) -> Dict:
        """获取功能列表摘要"""
        features = self.load()
        completed = [f for f in features if f.get('passes', False)]
        return {
            'total': len(features),
            'completed': len(completed),
            'pending': len(features) - len(completed),
            'completion_rate': len(completed) / len(features) if features else 0
        }


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python feature_manager.py <command>")
        print("Commands: init, list, next, complete, summary")
        sys.exit(1)

    fm = FeatureManager()
    command = sys.argv[1]

    if command == "init":
        fm.initialize()
    elif command == "list":
        for f in fm.load():
            status = "✓" if f.get('passes') else "○"
            print(f"{status} [{f['id']}] {f['description']}")
    elif command == "next":
        feature = fm.get_next_pending_feature()
        if feature:
            print(f"Next: [{feature['id']}] {feature['description']}")
        else:
            print("All features completed!")
    elif command == "complete":
        if len(sys.argv) < 3:
            print("Usage: complete <feature_id>")
        else:
            fm.mark_as_complete(sys.argv[2])
    elif command == "summary":
        summary = fm.get_summary()
        print(f"Total: {summary['total']}, Completed: {summary['completed']}, Pending: {summary['pending']}")
