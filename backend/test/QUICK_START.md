# 自动化测试系统 - 快速上手

## 🚀 三步开始使用

### 步骤1: 启动游戏服务器

打开第一个终端窗口：

```bash
cd /Users/ken/my_project/leve_up
go run main.go
```

你会看到：
```
Server starting on :8080
```

**保持这个终端运行！**

### 步骤2: 运行自动化测试

打开第二个终端窗口：

```bash
cd /Users/ken/my_project/leve_up/test
./quick_test.sh
```

测试会自动进行：
- ✅ 创建测试用户
- ✅ 运行3场游戏
- ✅ 验证所有规则
- ✅ 生成测试报告

### 步骤3: 查看结果

测试完成后，你会看到：

**如果成功：**
```
✅ 游戏运行完成
✅ 规则验证通过
🎉 所有测试通过！
```

**如果有错误：**
```
❌ 规则验证失败

错误:
[1] 发牌规则 - 主牌设置
    发牌后未设置主牌花色
    💡 建议: 确保在发牌逻辑中正确设置主牌花色
```

## 📖 常用命令

### 快速测试（推荐）
```bash
cd test
./quick_test.sh
```

### 完整自动化循环（修复+重测）
```bash
cd test
./automation_runner.sh
```

### 只运行游戏测试
```bash
cd test
go run automated_validator.go
```

### 只验证日志
```bash
cd test
go run rule_validator.go log/v1.xxxxx
```

### 查看日志
```bash
# 查看合并日志
cat log/v1.*/combined_log.jsonl | jq .

# 查看某场游戏
cat log/v1.*/game_1.json | jq .
```

## 🛠️ 故障排除

### 问题: 端口被占用
```bash
# 查找占用端口的进程
lsof -ti:8080

# 关闭进程
lsof -ti:8080 | xargs kill -9

# 重新启动服务器
cd /Users/ken/my_project/leve_up
go run main.go
```

### 问题: 数据库错误
```bash
# 删除旧数据库
rm -f game.db

# 重新启动服务器（会创建新数据库）
go run main.go
```

### 问题: 权限错误
```bash
# 给脚本添加执行权限
chmod +x test/quick_test.sh
chmod +x test/automation_runner.sh
```

## 📊 理解输出

### 测试运行输出
```
========================================
   自动化测试系统启动
========================================
版本号: v1.20240101_120000
登录成功: autotest_1234567890
游戏ID: abc123def456
✅ 游戏 1 完成 (31轮)
✅ 游戏 2 完成 (32轮)
✅ 游戏 3 完成 (30轮)
```

### 验证报告输出
```
========================================
   规则验证报告
========================================

📊 统计:
   错误: 0
   警告: 0
   信息: 2

✅ 所有规则验证通过！
```

## 🎯 测试覆盖的游戏规则

1. **发牌规则** - 162张牌正确分配
2. **出牌顺序** - 顺时针1→2→3→4→5→1
3. **跟牌规则** - 必须跟花色
4. **主牌毙牌** - 主牌可以毙副牌
5. **计分规则** - 5/10/K正确计分
6. **总分验证** - 总共300分
7. **升级规则** - 根据分数正确升级

## 📝 日志文件说明

日志保存在 `log/` 目录，按版本组织：

```
log/
└── v1.20240101_120000/
    ├── combined_log.jsonl   # 所有游戏事件
    ├── game_1.json         # 游戏1详细记录
    ├── game_2.json         # 游戏2详细记录
    └── game_3.json         # 游戏3详细记录
```

每条日志包含：
- 时间戳
- 游戏ID
- 事件类型（deal/play/trick_end/game_end）
- 玩家信息
- 出牌信息
- 分数信息

## 🔧 自定义设置

### 修改测试游戏数量

编辑 `test/automated_validator.go`：

```go
// 将3改为你想要的数字
for i := 1; i <= 3; i++ {
```

### 修改最大迭代次数

编辑 `test/automation_runner.sh`：

```bash
# 将10改为你想要的数字
MAX_ITERATIONS=10
```

## 💡 提示

1. **第一次运行**会比较慢，因为要创建数据库和用户
2. **保持服务器运行**，可以多次运行测试
3. **定期清理**旧版本日志和数据库
4. **查看详细日志**可以帮助调试问题

## 📚 更多文档

- `test/README_AUTOMATION.md` - 完整文档
- `test/ARCHITECTURE.md` - 系统架构
- `AUTOMATION_SUMMARY.md` - 功能总结

## ✨ 成功标志

当你看到这个，说明一切正常：

```
🎉 所有测试通过！
日志位置: /Users/ken/my_project/leve_up/log/v1.xxxxx

如果需要提交代码，运行:
  cd /Users/ken/my_project/leve_up
  git add main.go models/ handlers/ templates/ static/ test/*.go
  git commit -m '测试通过 - v1.xxxxx'
```

---

**祝测试顺利！** 🎮
