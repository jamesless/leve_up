# 🎯 Claude Long 双语言实现 - 快速开始

## 📦 系统特点

**支持 Go 和 Python 双实现，配置文件一键切换！**

- ✅ **Go 实现**：高性能、单二进制、无依赖（默认）
- ✅ **Python 实现**：易修改、易学习、生态丰富
- ✅ **统一接口**：命令完全相同，配置切换
- ✅ **灵活选择**：根据需求随时更换

## ⚙️ 语言选择

编辑 `config.yaml`：

```yaml
language: go      # 默认 Go（高性能）
# language: python  # 改为 Python（易修改）
```

## 🚀 快速开始

### Windows

```cmd
cd your_project
claude-long.bat session init       # 初始化
claude-long.bat session start      # 开始会话
claude-long.bat feature list       # 查看功能
```

### Linux/Mac

```bash
cd your_project
chmod +x claude-long.sh            # 首次赋权
./claude-long.sh session init      # 初始化
./claude-long.sh session start     # 开始会话
```

## 📖 完整文档

- `SUMMARY.md` - 系统完整概述 ⭐
- `README.md` - 详细文档和 API
- `docs/quick_start.md` - 入门教程
- `docs/prompts.md` - 提示词模板

## 🔧 命令对照

| 功能 | Windows | Linux/Mac |
|------|---------|-----------|
| 初始化 | `claude-long.bat session init` | `./claude-long.sh session init` |
| 开始会话 | `claude-long.bat session start` | `./claude-long.sh session start` |
| 结束会话 | `claude-long.bat session end "消息"` | `./claude-long.sh session end "消息"` |
| 功能列表 | `claude-long.bat feature list` | `./claude-long.sh feature list` |
| 完成功能 | `claude-long.bat feature complete F001` | `./claude-long.sh feature complete F001` |

## 💡 何时选择 Go vs Python

**选择 Go：**
- 生产环境
- 需要高性能
- 单文件部署
- 无 Python 环境

**选择 Python：**
- 学习研究
- 快速修改
- 已有 Python 环境
- 需要定制

## 🎯 立即开始

1. 选择语言（编辑 `config.yaml`）
2. 初始化项目
3. 开始工作

详见 `SUMMARY.md` 获取完整说明！
