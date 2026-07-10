# 问题报告 #001: 单人模式页面React错误

## 发现时间
2026-02-27 11:37

## 问题描述
点击"单人模式"按钮后，页面跳转到 `/game/singleplayer/:id` 路由时出现React错误。

## 错误信息
```
Minified React error #310
```

这个错误通常表示：
- useEffect hook 使用不当
- 依赖数组配置错误
- 在组件卸载后尝试更新state

## 重现步骤
1. 访问 http://localhost:8080
2. 点击"进入大厅"
3. 点击"单人模式"
4. 错误出现

## 影响范围
- 单人模式无法启动
- 阻碍了发牌规则测试和其他游戏流程测试

## 建议修复方向
1. 检查 `frontend/src/routes/SinglePlayerGame.tsx` 文件
2. 查看useEffect的依赖项设置
3. 确保组件卸载时正确清理副作用
4. 使用开发模式（npm run dev）查看未minified的错误信息

## 临时解决方案
- 尝试使用"创建房间"功能进行多人模式测试
- 或者修复前端代码后重新build
