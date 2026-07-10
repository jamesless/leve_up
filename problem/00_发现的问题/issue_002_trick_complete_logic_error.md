# Bug报告：一轮结束判断逻辑错误

## 问题发现时间
2026-02-27 通过浏览器测试完整游戏时发现

## 问题描述
在进行游戏测试时，发现各个玩家的手牌数量不一致：
- AI-2: 24张
- AI-3: 22张
- AI-4: 24张
- AI-5: 25张

这是一个严重的游戏逻辑错误。在升级游戏中，每轮所有玩家都应该出相同数量的牌，因此所有玩家的剩余手牌数量必须相同。

## 根本原因分析

### 问题代码位置
`backend/models/game.go:1486`

### 错误的逻辑
```go
// Check if trick is complete (5 cards played - considering pairs/triples count as one play)
if len(table.CurrentTrick) >= 5 {
    // 一轮结束处理
    ...
} else {
    // 下一个玩家
    result.NextPlayer = ((playerSeat - 2 + 5) % 5) + 1
    table.CurrentPlayer = result.NextPlayer
}
```

这个逻辑使用 `len(table.CurrentTrick) >= 5` 来判断一轮是否结束，这**假设每个玩家只出一张牌**。

### 为什么错误？

在升级游戏中：
1. **出单牌**：每个玩家出1张牌，一轮结束时桌面上有 5 张牌 ✓（当前逻辑正确）
2. **出对子**：首家出2张牌（一对），其他玩家也必须跟一对，一轮结束时桌面上有 5 × 2 = 10 张牌 ✗（当前逻辑错误）
3. **出三张**：一轮结束时桌面上有 5 × 3 = 15 张牌 ✗（当前逻辑错误）
4. **甩牌5张**：一轮结束时桌面上有 5 × 5 = 25 张牌 ✗（当前逻辑错误）

当前代码在出对子、三张或甩牌时，只有部分玩家出完牌（不足5人），就会错误地判断一轮结束或继续。

## 修复方案

### 正确的判断逻辑
一轮结束的标志应该是：**所有5个玩家都出过牌了**

### 实现方法
统计 `table.CurrentTrick` 中有多少个不同的座位号（Seat字段）：

```go
// Check if trick is complete (all 5 players have played)
func isTrickComplete(currentTrick []PlayedCard) bool {
    if len(currentTrick) == 0 {
        return false
    }

    // 统计不同的座位号
    seatsPlayed := make(map[int]bool)
    for _, pc := range currentTrick {
        seatsPlayed[pc.Seat] = true
    }

    // 当5个玩家都出过牌时，一轮结束
    return len(seatsPlayed) == 5
}

// 在PlayCardsGame函数中替换判断逻辑
if isTrickComplete(table.CurrentTrick) {
    // 一轮结束处理
    ...
}
```

## 影响范围
- 影响所有包含对子、三张、拖拉机、甩牌的游戏轮次
- 导致游戏状态不一致
- 可能导致游戏无法正常结束

## 优先级
**P0 - 阻塞性Bug**，必须立即修复

## 测试用例
修复后需要测试：
1. 出单牌场景（1张）
2. 出对子场景（2张）
3. 出三张场景（3张）
4. 出拖拉机场景（4张或更多）
5. 甩牌场景（多张不同牌）

## 相关截图
- `game_after_100_rounds.png` - 显示手牌数量不一致的问题
