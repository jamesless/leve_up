# 问题报告 #003: 扣牌对话框未显示

## 发现时间
2026-02-27 11:48

## 问题描述
游戏进入"扣牌中"状态后,扣牌对话框(DiscardDialog)未正确显示,导致庄家无法扣除底牌。

## 当前状态
- 游戏状态显示: "扣牌中" ✅
- 级别: 2 ✅
- 主牌: spades ✅
- 庄家手牌: 38张(31+7底牌) ✅
- **扣牌对话框**: 未显示 ❌

## 预期行为
根据GameTable.tsx代码(第202-209行):
```tsx
{showCallDialog && (
  <div className="mb-4">
    <CallDealerDialog
      onSubmit={handleCallDealer}
      isPending={callDealerMutation.isPending}
    />
  </div>
)}

{showDiscardDialog && (
  <div className="mb-4">
    <DiscardDialog
      bottomCards={game.bottomCards}
      onSubmit={handleDiscard}
      isPending={discardMutation.isPending}
    />
  </div>
)}
```

当`game.status === EGameStatus.DISCARDING`时,应该显示DiscardDialog。

## 实际行为
- 状态栏显示"扣牌中"(说明状态正确)
- 但界面上没有显示扣牌对话框
- 玩家无法选择7张牌进行扣除

## 可能原因分析

### 1. useEffect未触发
GameTable.tsx第46-65行的useEffect可能存在问题:
```tsx
useEffect(() => {
  if (!game) return;
  if (game.status === EGameStatus.CALLING) {
    setShowCallDialog(true);
  } else if (game.status === EGameStatus.DISCARDING) {
    setShowDiscardDialog(true);
  } else {
    setShowCallDialog(false);
    setShowDiscardDialog(false);
  }
}, [game?.status]);
```

可能的问题:
- `game?.status`值不匹配`EGameStatus.DISCARDING`
- 组件渲染时机问题
- useEffect依赖数组不完整

### 2. DiscardDialog组件问题
检查`frontend/src/components/game/DiscardDialog.tsx`:
- 组件可能是stub实现,未正确渲染
- bottomCards数据可能为空或undefined
- 组件内部有条件渲染逻辑导致不显示

### 3. 状态值不匹配
检查后端返回的status值:
- 可能后端返回的是字符串"discarding"
- 前端期望的是EGameStatus.DISCARDING枚举值
- 需要确认类型匹配

## 调试步骤

1. **检查状态值**
```tsx
useEffect(() => {
  if (!game) return;
  console.log('Game status:', game.status);
  console.log('Expected DISCARDING:', EGameStatus.DISCARDING);
  console.log('Match:', game.status === EGameStatus.DISCARDING);
}, [game?.status]);
```

2. **检查showDiscardDialog状态**
```tsx
console.log('showDiscardDialog:', showDiscardDialog);
```

3. **检查bottomCards数据**
```tsx
console.log('bottomCards:', game.bottomCards);
```

4. **强制显示测试**
临时修改代码强制显示:
```tsx
const [showDiscardDialog, setShowDiscardDialog] = useState(true); // 强制true
```

## 影响范围
- **阻塞**: 无法测试扣底牌功能
- **阻塞**: 无法测试找朋友功能(依赖扣牌完成)
- **阻塞**: 无法进入出牌阶段

## 优先级
**高** - 阻塞核心游戏流程测试

## 相关文件
- `D:/workshop/leve_up/frontend/src/routes/GameTable.tsx`
- `D:/workshop/leve_up/frontend/src/components/game/DiscardDialog.tsx`
- `D:/workshop/leve_up/frontend/src/types/index.ts` (EGameStatus定义)
- `D:/workshop/leve_up/problem/03_庄家流程/screenshots/01_discard_phase.png`

## 建议修复方案

### 方案A: 完善DiscardDialog组件
如果组件是stub,需要完整实现:
1. 显示7张底牌
2. 允许玩家从38张手牌中选择7张扣除
3. 显示确认和取消按钮
4. 调用onSubmit回调

### 方案B: 修复状态匹配问题
确保前后端状态值一致:
1. 检查后端返回的status字段
2. 确保EGameStatus枚举定义正确
3. 添加调试日志确认值匹配

## 下一步
修复此问题后,可以继续测试:
- 扣底牌逻辑是否正确
- 是否正好扣除7张
- 扣除后手牌数量是否正确(31张)
- 找朋友功能测试
