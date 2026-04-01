# ChronoForge - 长期运行代理记忆系统

## 项目集成完成 ✅

ChronoForge 已成功集成到本项目中！这是一个基于 Anthropic 论文的长期运行代理记忆系统，帮助 AI 在多个会话之间保持记忆和上下文。

## 安装位置

- **Skill 文件**: `C:\Users\SXF-Admin\.claude\skills\long-running-memory\`
- **核心系统**: `D:\workshop\leve_up\claude_long\`
- **配置文件**: `D:\workshop\leve_up\config.yaml`
- **启动脚本**: `D:\workshop\leve_up\claude-long.bat`

## 快速开始

### 1. 初始化项目（首次使用）

在 Claude Code 中告诉 Claude：

```
请初始化 long-running-memory 系统
```

这会创建以下文件：
- `claude-progress.txt` - 会话进度日志
- `feature_list.json` - 功能需求列表
- `init.sh` - 项目启动脚本（如果需要）

### 2. 使用 Skill

在 Claude Code 中，你可以使用以下命令：

#### 开始会话
```
请使用 long-running-memory skill
/start-session
```

#### 结束会话
```
/end-session "完成了XX功能"
```

#### 查看下一个功能
```
/next-feature
```

#### 标记功能完成
```
/mark-feature-complete F001 "功能已完成并测试"
```

#### 查看进度
```
/view-progress
```

#### 功能统计
```
/feature-summary
```

## 核心工作流程

```
/start-session → 实现一个功能 → 端到端测试 → Git 提交 →
/mark-feature-complete → /end-session
```

## 核心原则

1. **一次一个功能** - 避免同时处理多个任务
2. **端到端测试** - 不要只依赖单元测试
3. **保持干净状态** - 代码整洁、测试通过
4. **Git 集成** - 每个功能完成后提交
5. **结构化更新** - 清晰记录完成的工作

## 配置

编辑 `config.yaml` 来配置系统：

```yaml
# 选择实现语言 (go 或 python)
language: go  # 默认使用 Go (高性能)

# 项目设置
project:
  progress_file: "claude-progress.txt"
  feature_file: "feature_list.json"
  auto_git_commit: false

# 显示设置
display:
  use_colors: true
  use_emoji: true
  recent_sessions_count: 3
```

## 实现选择

### Go 实现（默认，推荐）
- 高性能
- 单一可执行文件
- 自动编译

### Python 实现
- 易于修改
- 方便学习
- 设置 `language: python` 在 config.yaml

## 文档

- **快速参考**: `.claude/skills/long-running-memory/quick-reference.md`
- **完整文档**: `.claude/skills/long-running-memory/SKILL.md`
- **开始指南**: `claude_long/START_HERE.md`
- **完整指南**: `claude_long/FINAL_DELIVERY.md`

## 使用示例

### 场景：多会话项目开发

```
会话 1:
用户: 我正在开发一个 Web 应用，需要用户认证功能
Claude: /start-session
        # 查看功能列表，选择第一个功能
        # 实现用户注册功能
        # 测试并提交
        /mark-feature-complete F001
        /end-session "完成了用户注册功能"

会话 2（第二天）:
用户: 继续开发
Claude: /start-session
        # 系统显示昨天的进度
        # 查看下一个功能：用户登录
        # 实现登录功能
        /mark-feature-complete F002
        /end-session "完成了用户登录功能"
```

## 核心优势

- ✅ 跨会话持久化记忆
- ✅ 自动进度追踪
- ✅ Git 集成
- ✅ 增量开发方法
- ✅ 干净状态保证
- ✅ 多代理协作支持

## 故障排除

### 会话开始时发现代码损坏

```bash
# 查看最近的提交
git log --oneline -10

# 回滚到最后一个工作状态
git reset --hard <commit-hash>

# 记录回滚
/add-progress "回滚到 <hash> 由于代码损坏"
```

### 功能太大无法在一个会话完成

不要强制完成！相反：

```bash
/add-progress "部分完成 F00X:
- 步骤 1-3 完成
- 步骤 4-5 待完成
- 代码已提交但功能尚未完全工作"

# 不要标记为完成
# 在下一个会话继续
```

## 参考资料

- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [ChronoForge GitHub](https://github.com/jamesless/ChronoForge)

---

**让 AI 代理像优秀的人类工程师一样工作！**
