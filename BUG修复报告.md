# 五人三副牌找朋友升级游戏 - Bug待修复报告

**生成日期**: 2026-02-26
**规则版本**: v2.0 精简版
**代码库**: D:/workshop/leve_up

---

## 📋 执行摘要

本报告基于 `.claude/custom_instructions.md` 中定义的完整游戏规则，对项目代码进行了系统性扫描和分析。共发现 **15个问题**，其中包括：
- 🔴 **严重问题（Critical）**: 5个
- 🟡 **重要问题（High）**: 6个
- 🟢 **一般问题（Medium）**: 4个

---

## 🔍 分析方法论

### 检查维度
1. ✅ 基础信息规则（玩家人数、牌具、分值牌、总分）
2. ✅ 发牌规则（发牌方向、每人31张、底牌7张、起始发牌人）
3. ✅ 抢庄、亮主、反主规则
4. ✅ 庄家流程（拿底牌、找朋友）
5. ✅ 出牌规则（牌型定义、拖拉机规则）
6. ✅ 跟牌规则和毙牌规则
7. ✅ 抠底与底牌分计算规则
8. ✅ 胜负与升级规则

### 思维链追踪
每个规则点都经过以下流程：
```
规则文档定义 → 代码实现查找 → 逻辑对比分析 → 问题识别 → 优先级评估
```

---

## 🔴 严重问题（Critical Priority）

### 🐛 BUG-001: 分值牌定义与规则文档不符

**位置**: `models/game.go:383-418`

**规则要求**:
- 分值牌：♠5=5分，♠10=10分，♠K=10分
- 总分：300分

**代码问题**:
```go
func isScoringCard(card Card) bool {
    if card.Type == "joker" {
        return true // ❌ 规则中未提及Joker是分值牌
    }
    // 只有黑桃的5、10、K是分值牌
    if card.Suit == "spades" {
        // ... 正确实现
    }
    return false
}

func getCardPoints(card Card) int {
    if card.Type == "joker" {
        if card.Value == "big" {
            return 20 // ❌ 大王20分不在规则中
        }
        return 10 // ❌ 小王10分不在规则中
    }
    // ...
}
```

**影响**:
- 按规则计算，3副牌总分应为：(5+10+10)×3 = **75分**，但规则文档声明总分为**300分**
- 代码添加了王牌分值（大王20分×3 + 小王10分×3 = 90分），总计165分，仍不足300分
- **规则文档本身存在矛盾**

**修复建议**:
1. **优先级1**: 与游戏设计者确认正确的分值牌定义
2. **优先级2**: 可能的正确规则：
   - 所有花色的5、10、K都是分值牌（总分300分）
   - 或保留黑桃+王牌，并调整单张分值
3. 修正代码以匹配确认后的规则

---

### 🐛 BUG-002: 拖拉机判定逻辑未实现等级系统

**位置**: `models/game.go:1293-1342`, `models/game.go:1470-1508`

**规则要求**:
> 拖拉机是按照**牌的等级（上下级）连续**，而非仅按点数连续。
>
> **示例**（假设黑桃5是主牌色）：
> - ✅ 方片对4 + 方片对6 → **是拖拉机**（等级上连续：副4、副6紧邻，中间的副5是主牌色不在副牌中）
> - ✅ 对大王 + 对小王 + 对黑桃5 + 对副5 + 对黑桃A → **是拖拉机**（主牌等级连续）

**代码问题**:
```go
func validateTractor(cards []Card) error {
    // ...
    // Check if values are consecutive
    for i := 1; i < len(values); i++ {
        prevValue := getCardNumericValue(values[i-1])
        currValue := getCardNumericValue(values[i])
        if currValue != prevValue+1 { // ❌ 仅检查点数连续性
            return fmt.Errorf("tractor values must be consecutive")
        }
    }
    return nil
}
```

**缺失逻辑**:
- 未实现主牌/副牌分离的等级系统
- 未处理级牌（如打5时）在主牌和副牌中的不同等级位置
- 未实现主牌等级序列：`大王 > 小王 > 主级牌 > 副级牌 > 主A > 主K > ...`

**影响**:
- 无法正确识别跨越级牌的副牌拖拉机（如副4+副6跳过主5）
- 无法识别主牌拖拉机的完整等级连续性

**修复建议**:
1. 实现 `getCardRank(card, trumpSuit, trumpRank)` 函数，返回牌在等级系统中的真实排名
2. 重写 `validateTractor` 使用等级排名而非点数
3. 分别处理主牌拖拉机和副牌拖拉机的验证逻辑

---

### 🐛 BUG-003: 缺少连三拖拉机支持

**位置**: `models/game.go:1293-1342`

**规则要求**:
- 拖拉机（连对）：两对以上连续点数的对子，如♠10对+♠J对+♠Q对
- 拖拉机（连三）：两组以上连续点数的三张，如♣8三+♣9三

**代码问题**:
```go
func validateTractor(cards []Card) error {
    // ...
    // Each value must appear exactly 2 times (pairs)
    for _, count := range valueCounts {
        if count != 2 { // ❌ 只支持对子，不支持三张
            return fmt.Errorf("tractor consists of consecutive pairs")
        }
    }
    // ...
}
```

**影响**: 无法出连三拖拉机，游戏功能不完整

**修复建议**:
1. 修改 `validateTractor` 支持 count == 2 或 count == 3
2. 确保连三拖拉机的所有三张都必须一致（不能混合对子和三张）
3. 更新跟牌规则以正确处理连三拖拉机

---

### 🐛 BUG-004: 缺少1打4模式检测

**位置**: `models/game.go:204-226` (CallFriendCard函数)

**规则要求**:
> 特殊情况：叫的牌在庄家手牌或底牌中 → 无盟友，1打4

**代码问题**:
```go
func CallFriendCard(gameID, userID, suit, value string) error {
    // ...
    table.HostCalledCard = &CalledCard{
        Suit:  suit,
        Value: value,
    }
    // ❌ 没有检查该牌是否在庄家手中或底牌中
    // ❌ 没有设置1打4模式标志
    return nil
}
```

**影响**:
- 即使庄家叫的牌在自己手中，游戏仍会等待"朋友"出现
- 无法触发1打4独打模式
- 升级规则无法正确应用（独打和正常局升级规则不同）

**修复建议**:
1. 在 `CallFriendCard` 中检查庄家手牌和底牌
2. 添加 `GameTable.IsSoloMode bool` 字段标记1打4模式
3. 如果发现自呼，立即设置 `IsSoloMode = true`
4. 修改结算逻辑根据 `IsSoloMode` 选择升级表

---

### 🐛 BUG-005: 升级反后庄家转移逻辑缺失

**位置**: `models/game.go:1615-1637` (CallDealer函数)

**规则要求**:
> 升级反：用比当前级牌高1级或以上的级牌反 → **自己成为新庄家**

**代码问题**:
```go
} else {
    // 升级反
    currentRankValue := getCardNumericValue(lastCall.Rank)
    newRankValue := getCardNumericValue(rank)
    if newRankValue <= currentRankValue {
        return nil, fmt.Errorf("升级反必须用更高级的牌")
    }
    // ❌ 验证通过后，没有以下逻辑：
    // 1. 更新 TrumpRank 为新的级牌
    // 2. 更新 DealerSeat 为升级反的玩家
    // 3. 重置 CallPhase 和相关状态
}
```

**影响**:
- 升级反后，原庄家仍保持庄家身份
- 主牌级别不会更新
- 违反核心游戏规则

**修复建议**:
```go
} else {
    // 升级反：自己成为新庄家
    currentRankValue := getCardNumericValue(lastCall.Rank)
    newRankValue := getCardNumericValue(rank)
    if newRankValue <= currentRankValue {
        return nil, fmt.Errorf("升级反必须用更高级的牌")
    }
    // 更新庄家和级牌
    table.TrumpRank = rank
    table.DealerSeat = playerSeat
    table.TrumpSuit = suit
    table.HostID = table.PlayerHands[playerSeat].UserID
}
```

---

## 🟡 重要问题（High Priority）

### 🐛 BUG-006: 缺少后续局起始发牌人规则

**位置**: `models/game.go:130-131`

**规则要求**:
| 上一局结果 | 起始发牌者 |
|------------|------------|
| 庄家赢（1V4）| 庄家 |
| 庄家赢（2V3）| 庄家的朋友 |
| 庄家输 | 逆时针最靠近庄家的玩家 |

**代码问题**:
```go
// Determine starting dealer (random for first game)
startingDealer := rand.Intn(5) + 1 // ❌ 只有首局逻辑，无后续局逻辑
```

**修复建议**:
1. 在 `RecordGameResult` 中保存 `NextStartingDealer` 信息
2. 在 `StartGame` 中检查是否有上一局记录，如有则使用规则确定的起始发牌人

---

### 🐛 BUG-007: 缺少"有人抢庄后追加5秒"机制

**位置**: `models/game.go:152-153`

**规则要求**:
> 1. 倒计时10秒，任何玩家可抢庄
> 2. **有人抢庄后，追加5秒给其他玩家反庄**
> 3. 循环直至无人反庄

**代码问题**:
```go
CallPhase:          "counting", // 倒计时抢庄阶段
CallCountdown:      10,         // ❌ 固定10秒，无追加5秒逻辑
```

**修复建议**:
1. 在 `CallDealer` 成功叫庄后，设置 `table.CallCountdown = 5`
2. 前端实现倒计时刷新逻辑
3. 后端添加定时器检测超时自动进入下一阶段

---

### 🐛 BUG-008: 发牌方向未实现逆时针

**位置**: `models/game.go:855-862`

**规则要求**:
- 发牌方向：**逆时针**

**代码问题**:
```go
for i := 0; i < playerCount; i++ {
    hands[i] = allCards[i*cardsPerPlayer : (i+1)*cardsPerPlayer]
}
// ❌ 按顺序分配，未模拟逆时针发牌
```

**影响**: 虽然最终每人得牌数量正确，但牌序可能影响游戏公平性（如果玩家研究发牌规律）

**修复建议**:
- 如果需要完全模拟真实发牌：实现逆时针逐张发牌
- 如果认为这是实现细节：在注释中说明"简化实现，牌序随机已保证公平性"

---

### 🐛 BUG-009: 主牌等级序列未完整实现

**位置**: `models/game.go:348-379` (getCardValue函数)

**规则要求**:
```
大王 > 小王 > 主级牌 > 副级牌 > 主A > 主K > ... > 主2
```

**代码问题**:
```go
func getCardValue(card Card, leadSuit, trumpSuit string) int {
    values := map[string]int{
        "2": 2, "3": 3, ..., "A": 14,
    }
    baseValue := values[card.Value]

    // ❌ 未处理级牌的特殊地位
    // ❌ 未区分主级牌和副级牌

    if trumpSuit != "" && card.Suit == trumpSuit {
        return baseValue + 100 // ❌ 简化处理，不符合规则等级
    }

    if card.Type == "joker" && card.Value == "big" {
        return 200 // ✅ 大王最大
    }
    if card.Type == "joker" && card.Value == "small" {
        return 150 // ✅ 小王次之
    }
    // ...
}
```

**修复建议**:
1. 重写 `getCardValue` 为 `getCardRank(card, trumpSuit, trumpRank, leadSuit)`
2. 返回更精确的等级值：
   - 大王: 1000
   - 小王: 900
   - 主级牌: 800 + (牌花色序号)
   - 副级牌: 700 + (牌花色序号)
   - 主牌A: 600
   - 主牌K: 590
   - ...

---

### 🐛 BUG-010: 翻底牌定庄时未检查玩家等级

**位置**: `models/game.go:1689-1701`

**规则要求**:
> 翻出的牌点数等于场上某玩家等级 → 该玩家当庄

**代码问题**:
```go
// 检查玩家的等级
user, err := GetUserByID(hand.UserID)
if err == nil && user.Level == rank {
    candidates = append(candidates, seat)
}
```

**潜在问题**:
- 依赖数据库查询 `GetUserByID`，如果查询失败可能导致符合条件的玩家被跳过
- 错误处理不够严格（`err == nil` 静默失败）

**修复建议**:
```go
user, err := GetUserByID(hand.UserID)
if err != nil {
    return nil, fmt.Errorf("failed to get user %s: %w", hand.UserID, err)
}
if user.Level == rank {
    candidates = append(candidates, seat)
}
```

---

### 🐛 BUG-011: 主牌毙牌的牌型匹配验证逻辑复杂

**位置**: `models/game.go:1431-1468` (validateFollowPlay函数)

**规则要求**:
> 无色时：主牌杀（牌型必须完美匹配）

**代码问题**:
验证逻辑分支复杂，容易出现边界情况遗漏：
```go
if allTrump {
    // 主牌杀：牌型必须完美匹配
    if isLeadPair && isPlayerPair {
        return nil // 主牌对子杀成功
    }
    if isLeadTriple && isPlayerTriple {
        return nil // 主牌三张杀成功
    }
    if isLeadTractor && isPlayerTractor {
        return nil // 主牌拖拉机杀成功
    }
    // ❓ 如果领出的是甩牌（多张同花色但不成对子/拖拉机）
    if !isLeadPair && !isLeadTriple && !isLeadTractor {
        if !isPlayerPair && !isPlayerTriple && !isPlayerTractor {
            return nil // 主牌单张组合杀成功
        }
    }
    return fmt.Errorf("主牌杀必须牌型匹配")
}
```

**风险**:
- 甩牌场景的牌型匹配规则不清晰
- 可能遗漏特殊组合（如2单+1对）

**修复建议**:
1. 添加单元测试覆盖所有牌型组合
2. 重构为更清晰的状态机逻辑
3. 添加详细的注释说明每种情况

---

## 🟢 一般问题（Medium Priority）

### 🐛 BUG-012: 抠底检测逻辑未找到

**位置**: 未在代码中找到完整的抠底检测和触发逻辑

**规则要求**:
> 最后一圈牌，抓分方的牌最大，底牌分数计入抓分方总分。

**代码问题**:
- `CalculateBottomMultiplier` 函数存在（models/game.go:1847-1895）
- 但未找到"判断是否最后一圈"和"触发抠底计算"的调用点

**修复建议**:
1. 在 `PlayCardsGame` 中检测是否所有玩家手牌为空（最后一圈）
2. 调用抠底检测和计算逻辑
3. 更新分数并触发结算

---

### 🐛 BUG-013: 甩牌验证逻辑可能过于严格

**位置**: `models/game.go:1194-1249` (ValidateThrowCards函数)

**规则问题**: 规则文档中未明确定义"甩牌"规则细节

**代码实现**:
```go
// 检查所有其他玩家手中的该花色牌
for seat, hand := range table.PlayerHands {
    if seat == playerSeat {
        continue
    }

    // 检查该玩家是否有更大的该花色牌
    for _, card := range hand.Cards {
        if card.Suit == firstSuit {
            cardValue := getCardNumericValue(card.Value)
            if cardValue > minValue {
                // 有玩家有更大的牌，甩牌失败
                return &ThrowCardsResult{
                    IsValid:       false,
                    ActualPlay:    []Card{minCard},
                    // ...
                }
            }
        }
    }
}
```

**潜在问题**:
- 甩牌验证访问了其他玩家的手牌（在实际游戏中不可能知道）
- 这可能是AI辅助功能，但应该标注清楚
- 多人在线模式可能需要禁用或调整此逻辑

**修复建议**:
- 如果是单人模式特性，添加 `if isSinglePlayerGame(table)` 判断
- 多人模式应该允许甩牌，由其他玩家选择是否"接牌"

---

### 🐛 BUG-014: 出牌顺序的"顺时针"描述与代码不匹配

**位置**: `models/game.go:322`

**规则要求**: 出牌顺序：顺时针

**代码实现**:
```go
result.NextPlayer = playerSeat%5 + 1
// 1 → 2 → 3 → 4 → 5 → 1
```

**说明**:
- 这确实是顺时针（座位号递增）
- 但与规则文档中"发牌方向：**逆时针**"形成对比
- 可能导致理解混淆

**修复建议**:
- 在代码注释中明确说明："顺时针 = 座位号递增方向"
- 或统一术语："发牌方向：座位号递减"，"出牌方向：座位号递增"

---

### 🐛 BUG-015: 缺少游戏流程完整性检查

**位置**: 整体架构

**问题**:
- 未找到完整的游戏流程状态机
- 缺少阶段转换的严格验证
- 可能允许跳过某些必要步骤（如庄家未扣牌就开始出牌）

**修复建议**:
1. 实现状态机：`waiting → dealing → calling → discarding → playing → finished`
2. 每个API调用前验证当前状态是否允许该操作
3. 添加状态转换日志

---

## 📊 优先级汇总

### 立即修复（Critical）
1. **BUG-001**: 分值牌定义矛盾 - 阻塞游戏正确结算
2. **BUG-002**: 拖拉机等级系统缺失 - 核心玩法错误
3. **BUG-003**: 缺少连三拖拉机 - 功能不完整
4. **BUG-004**: 1打4模式检测缺失 - 影响游戏模式
5. **BUG-005**: 升级反逻辑错误 - 核心规则违反

### 下一迭代修复（High）
6. BUG-006 ~ BUG-011

### 低优先级（Medium）
12. BUG-012 ~ BUG-015

---

## 🧪 测试建议

### 单元测试覆盖
1. **分值牌计算测试**
   - 测试各种牌组合的总分计算
   - 验证300分目标的可达性

2. **拖拉机验证测试**
   ```go
   // 测试用例
   func TestTractorWithTrumpRank(t *testing.T) {
       // 假设打5，黑桃是主
       // 副牌: 方片4对 + 方片6对（跳过主5）应该是拖拉机
   }
   ```

3. **1打4模式测试**
   - 庄家叫自己手中的牌
   - 庄家叫底牌中的牌
   - 验证升级规则使用独打表

### 集成测试
1. 完整游戏流程测试
2. 边界条件测试（如所有玩家都不抢庄）
3. 多轮游戏测试（验证起始发牌人规则）

---

## 🔧 推荐修复路线图

### Phase 1: 核心规则修复（1-2周）
- [ ] 解决分值牌定义矛盾（需要设计决策）
- [ ] 实现完整的牌等级系统
- [ ] 修复拖拉机验证逻辑
- [ ] 添加连三拖拉机支持

### Phase 2: 游戏模式完善（1周）
- [ ] 实现1打4检测和独打模式
- [ ] 修复升级反庄家转移
- [ ] 实现后续局起始发牌人规则

### Phase 3: 细节优化（1周）
- [ ] 完善抢庄追加5秒机制
- [ ] 实现抠底检测和计算
- [ ] 优化甩牌验证逻辑
- [ ] 添加状态机和流程检查

### Phase 4: 测试和验证（1周）
- [ ] 编写全面的单元测试
- [ ] 进行完整游戏流程测试
- [ ] 使用浏览器MCP进行UI测试
- [ ] 性能和并发测试

---

## 📝 附录：规则文档潜在问题

### 规则文档本身的矛盾
1. **分值牌与总分不匹配**
   - 声明：♠5=5分，♠10=10分，♠K=10分
   - 计算：3副牌只有75分
   - 声明：总分300分
   - **矛盾**：75分 ≠ 300分

2. **建议澄清的规则点**
   - 甩牌的详细规则（多人模式如何验证）
   - 王牌是否算分值牌（如果算，分值是多少）
   - 拖拉机等级判定的详细示例（需要更多case）

---

## ✅ 符合规则的部分（表扬）

以下功能实现正确，无需修改：
1. ✅ 玩家人数限制（5人）
2. ✅ 三副牌生成（162张）
3. ✅ 每人31张+底牌7张的分配
4. ✅ 开局打2的设置
5. ✅ 基本的对子、三张验证
6. ✅ 升级表（2打3和1打4）的数值正确
7. ✅ 底牌倍数计算（单张×1、对子×2、三张×4）
8. ✅ 反主最多3张的限制
9. ✅ 翻底牌定庄和首发人当庄的逻辑
10. ✅ 找朋友机制的基本实现

---

## 📞 联系与后续

**报告生成者**: Claude Code Agent
**下一步行动**:
1. 与产品/设计团队确认规则文档中的矛盾点
2. 根据优先级开始修复Critical问题
3. 建立持续测试流程

**更新记录**:
- 2026-02-26: 初始报告生成
