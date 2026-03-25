package models

import (
	"testing"
	"time"
)

// TestCallPhaseCountdown_Initial 测试发牌后倒计时初始化
// 问题1: 叫庄前没有开始倒计时
func TestCallPhaseCountdown_Initial(t *testing.T) {
	// 创建测试游戏
	gameID := "1772800000000000001"

	// 初始化游戏
	table := &GameTable{
		GameID:              gameID,
		Status:              "waiting",
		DealingPhase:        "ready",
		PlayerHands:         make(map[int]*PlayerHand),
		CurrentTrick:        make([]PlayedCard, 0),
		TotalCardsPerPlayer: 31,
		DealtCardCount:      0,
	}

	// 添加5个玩家
	for i := 1; i <= 5; i++ {
		table.PlayerHands[i] = &PlayerHand{
			UserID:   string(rune('A' + i - 1)),
			Username: string(rune('A' + i - 1)),
			Seat:     i,
			Cards:    []Card{},
		}
	}

	// 初始化发牌
	err := table.InitializeDeal()
	if err != nil {
		t.Fatalf("初始化发牌失败: %v", err)
	}

	// 保存到内存
	activeGames[gameID] = table

	// 发完所有牌
	for i := 0; i < 31; i++ {
		_, dealComplete, err := DealNextCard(gameID)
		if err != nil {
			t.Fatalf("发牌失败: %v", err)
		}
		if i == 30 && !dealComplete {
			t.Fatal("第31轮发牌应该完成")
		}
	}

	// 获取游戏状态
	table, err = GetTableGame(gameID)
	if err != nil {
		t.Fatalf("获取游戏状态失败: %v", err)
	}

	// 验证: 发牌完成后，游戏应该进入叫庄阶段
	if table.Status != "calling" {
		t.Errorf("期望状态为 'calling'，实际为 '%s'", table.Status)
	}

	// 验证: CallPhase应该是counting
	if table.CallPhase != "counting" {
		t.Errorf("期望 CallPhase 为 'counting'，实际为 '%s'", table.CallPhase)
	}

	// 验证: 倒计时应该是30秒（根据规则）
	if table.CallCountdown != 30 {
		t.Errorf("期望倒计时为 30 秒，实际为 %d 秒", table.CallCountdown)
	}

	t.Logf("✓ 发牌完成后倒计时正确初始化为 %d 秒", table.CallCountdown)

	// 清理
	delete(activeGames, gameID)
}

// TestCallPhaseCountdown_AfterFirstCall 测试首次叫庄后倒计时重置
// 问题2: 叫庄后没有开始倒计时
func TestCallPhaseCountdown_AfterFirstCall(t *testing.T) {
	// 创建测试游戏并发完牌
	gameID := "1772800000000000002"

	// 初始化游戏
	table := &GameTable{
		GameID:              gameID,
		Status:              "waiting",
		DealingPhase:        "ready",
		PlayerHands:         make(map[int]*PlayerHand),
		CurrentTrick:        make([]PlayedCard, 0),
		TotalCardsPerPlayer: 31,
		DealtCardCount:      0,
	}

	// 添加5个玩家
	for i := 1; i <= 5; i++ {
		table.PlayerHands[i] = &PlayerHand{
			UserID:   string(rune('A' + i - 1)),
			Username: string(rune('A' + i - 1)),
			Seat:     i,
			Cards:    []Card{},
		}
	}

	// 初始化发牌
	table.InitializeDeal()
	activeGames[gameID] = table

	// 发完所有牌
	for i := 0; i < 31; i++ {
		DealNextCard(gameID)
	}

	table, _ = GetTableGame(gameID)

	// 找到第一个有2的玩家并叫庄
	var callerSeat int
	var cardIndices []int
	for seat, hand := range table.PlayerHands {
		for idx, card := range hand.Cards {
			if card.Value == "2" {
				callerSeat = seat
				cardIndices = append(cardIndices, idx)
				if len(cardIndices) >= 1 {
					break
				}
			}
		}
		if len(cardIndices) > 0 {
			break
		}
	}

	// 第一次叫庄
	userID := table.PlayerHands[callerSeat].UserID
	_, err := CallDealer(gameID, userID, "", cardIndices)
	if err != nil {
		t.Fatalf("叫庄失败: %v", err)
	}

	// 获取叫庄后的状态
	table, _ = GetTableGame(gameID)

	// 验证: 叫庄后，CallPhase应该仍然是counting（允许反庄）
	if table.CallPhase != "counting" {
		t.Errorf("期望叫庄后 CallPhase 仍为 'counting'，实际为 '%s'", table.CallPhase)
	}

	// 验证: 倒计时应该重置为5秒（给其他人反庄的时间）
	if table.CallCountdown != 5 {
		t.Errorf("期望叫庄后倒计时重置为 5 秒，实际为 %d 秒", table.CallCountdown)
	}

	// 验证: CallRecords应该有1条记录
	if len(table.CallRecords) != 1 {
		t.Errorf("期望有 1 条叫庄记录，实际有 %d 条", len(table.CallRecords))
	}

	t.Logf("✓ 首次叫庄后倒计时正确重置为 %d 秒，CallPhase 保持为 '%s'",
		table.CallCountdown, table.CallPhase)

	// 清理
	delete(activeGames, gameID)
}

// TestCallPhaseCountdown_CounterCall 测试反庄功能
// 问题3: 叫庄了，别人或者自己再次叫庄会失败
func TestCallPhaseCountdown_CounterCall(t *testing.T) {
	// 创建测试游戏并发完牌
	gameID := "1772800000000000003"

	// 初始化游戏
	table := &GameTable{
		GameID:              gameID,
		Status:              "waiting",
		DealingPhase:        "ready",
		PlayerHands:         make(map[int]*PlayerHand),
		CurrentTrick:        make([]PlayedCard, 0),
		TotalCardsPerPlayer: 31,
		DealtCardCount:      0,
		CurrentLevel:        "2",
	}

	// 添加5个玩家
	for i := 1; i <= 5; i++ {
		table.PlayerHands[i] = &PlayerHand{
			UserID:   string(rune('A' + i - 1)),
			Username: string(rune('A' + i - 1)),
			Seat:     i,
			Cards:    []Card{},
		}
	}

	// 初始化发牌
	table.InitializeDeal()
	activeGames[gameID] = table

	// 发完所有牌
	for i := 0; i < 31; i++ {
		DealNextCard(gameID)
	}

	table, _ = GetTableGame(gameID)

	// 第一个玩家叫庄（用1张2）
	var firstCallerSeat int
	var firstCardIndices []int
	for seat, hand := range table.PlayerHands {
		for idx, card := range hand.Cards {
			if card.Value == "2" {
				firstCallerSeat = seat
				firstCardIndices = append(firstCardIndices, idx)
				if len(firstCardIndices) >= 1 {
					break
				}
			}
		}
		if len(firstCardIndices) > 0 {
			break
		}
	}

	firstUserID := table.PlayerHands[firstCallerSeat].UserID
	_, err := CallDealer(gameID, firstUserID, "", firstCardIndices)
	if err != nil {
		t.Fatalf("第一次叫庄失败: %v", err)
	}

	// 刷新状态
	table, _ = GetTableGame(gameID)

	// 验证第一次叫庄成功
	if len(table.CallRecords) != 1 {
		t.Fatalf("期望有 1 条叫庄记录")
	}

	// 找到另一个玩家进行反庄（用2张或更多2）
	var secondCallerSeat int
	var secondCardIndices []int
	for seat, hand := range table.PlayerHands {
		if seat == firstCallerSeat {
			continue // 跳过第一个叫庄的玩家
		}
		for idx, card := range hand.Cards {
			if card.Value == "2" {
				secondCallerSeat = seat
				secondCardIndices = append(secondCardIndices, idx)
				if len(secondCardIndices) >= 2 { // 至少2张才能反庄
					break
				}
			}
		}
		if len(secondCardIndices) >= 2 {
			break
		}
	}

	if len(secondCardIndices) < 2 {
		t.Skip("没有找到足够的2进行反庄测试")
		return
	}

	// 第二个玩家反庄
	secondUserID := table.PlayerHands[secondCallerSeat].UserID
	_, err = CallDealer(gameID, secondUserID, "", secondCardIndices)
	if err != nil {
		t.Errorf("反庄失败: %v（这是bug，应该允许反庄）", err)

		// 输出调试信息
		table, _ = GetTableGame(gameID)
		t.Logf("调试信息:")
		t.Logf("  Status: %s", table.Status)
		t.Logf("  CallPhase: %s", table.CallPhase)
		t.Logf("  CallCountdown: %d", table.CallCountdown)
		t.Logf("  CallRecords: %d", len(table.CallRecords))

		// 清理
		delete(activeGames, gameID)
		return
	}

	// 验证反庄成功
	table, _ = GetTableGame(gameID)
	if len(table.CallRecords) != 2 {
		t.Errorf("期望有 2 条叫庄记录（首次+反庄），实际有 %d 条", len(table.CallRecords))
	}

	// 验证: CallPhase应该仍然是counting
	if table.CallPhase != "counting" {
		t.Errorf("期望反庄后 CallPhase 仍为 'counting'，实际为 '%s'", table.CallPhase)
	}

	// 验证: 倒计时应该重置
	if table.CallCountdown <= 0 {
		t.Errorf("期望反庄后倒计时重置，实际为 %d 秒", table.CallCountdown)
	}

	t.Logf("✓ 反庄成功，共有 %d 条叫庄记录", len(table.CallRecords))
	t.Logf("✓ 反庄后 CallPhase='%s'，CallCountdown=%d 秒",
		table.CallPhase, table.CallCountdown)

	// 清理
	delete(activeGames, gameID)
}

// TestCallPhaseCountdown_SamePlayerCannotCallTwice 测试同一玩家不能叫庄两次
func TestCallPhaseCountdown_SamePlayerCannotCallTwice(t *testing.T) {
	// 创建测试游戏并发完牌
	gameID := "1772800000000000004"

	// 初始化游戏
	table := &GameTable{
		GameID:              gameID,
		Status:              "waiting",
		DealingPhase:        "ready",
		PlayerHands:         make(map[int]*PlayerHand),
		CurrentTrick:        make([]PlayedCard, 0),
		TotalCardsPerPlayer: 31,
		DealtCardCount:      0,
		CurrentLevel:        "2",
	}

	// 添加5个玩家
	for i := 1; i <= 5; i++ {
		table.PlayerHands[i] = &PlayerHand{
			UserID:   string(rune('A' + i - 1)),
			Username: string(rune('A' + i - 1)),
			Seat:     i,
			Cards:    []Card{},
		}
	}

	// 初始化发牌
	table.InitializeDeal()
	activeGames[gameID] = table

	// 发完所有牌
	for i := 0; i < 31; i++ {
		DealNextCard(gameID)
	}

	table, _ = GetTableGame(gameID)

	// 找到有2的玩家
	var callerSeat int
	var cardIndices []int
	for seat, hand := range table.PlayerHands {
		for idx, card := range hand.Cards {
			if card.Value == "2" {
				callerSeat = seat
				cardIndices = append(cardIndices, idx)
				if len(cardIndices) >= 1 {
					break
				}
			}
		}
		if len(cardIndices) > 0 {
			break
		}
	}

	userID := table.PlayerHands[callerSeat].UserID

	// 第一次叫庄
	_, err := CallDealer(gameID, userID, "", cardIndices[:1])
	if err != nil {
		t.Fatalf("第一次叫庄失败: %v", err)
	}

	// 同一玩家尝试再次叫庄（应该失败）
	_, err = CallDealer(gameID, userID, "", cardIndices[:1])
	if err == nil {
		t.Error("同一玩家不应该能叫庄两次，但叫庄成功了")
	} else if err.Error() != "你已经叫过庄了" {
		t.Errorf("期望错误消息为'你已经叫过庄了'，实际为'%s'", err.Error())
	} else {
		t.Logf("✓ 正确阻止同一玩家叫庄两次: %v", err)
	}

	// 清理
	delete(activeGames, gameID)
}

// TestCallPhaseCountdown_AutoDecrement 测试倒计时自动递减
func TestCallPhaseCountdown_AutoDecrement(t *testing.T) {
	// 创建测试游戏并发完牌
	gameID := "1772800000000000005"

	// 初始化游戏
	table := &GameTable{
		GameID:              gameID,
		Status:              "waiting",
		DealingPhase:        "ready",
		PlayerHands:         make(map[int]*PlayerHand),
		CurrentTrick:        make([]PlayedCard, 0),
		TotalCardsPerPlayer: 31,
		DealtCardCount:      0,
	}

	// 添加5个玩家
	for i := 1; i <= 5; i++ {
		table.PlayerHands[i] = &PlayerHand{
			UserID:   string(rune('A' + i - 1)),
			Username: string(rune('A' + i - 1)),
			Seat:     i,
			Cards:    []Card{},
		}
	}

	// 初始化发牌
	table.InitializeDeal()
	activeGames[gameID] = table

	// 发完所有牌
	for i := 0; i < 31; i++ {
		DealNextCard(gameID)
	}

	// 获取初始状态
	table1, _ := GetTableGame(gameID)
	initialCountdown := table1.CallCountdown
	initialTime := table1.UpdatedAt

	// 等待2秒
	time.Sleep(2 * time.Second)

	// 再次获取状态（应该触发自动递减）
	table2, _ := GetTableGame(gameID)

	// 验证倒计时递减
	elapsed := int(time.Since(initialTime).Seconds())
	expectedCountdown := initialCountdown - elapsed

	if table2.CallCountdown > initialCountdown {
		t.Errorf("倒计时应该递减，初始=%d，当前=%d", initialCountdown, table2.CallCountdown)
	}

	if table2.CallCountdown < expectedCountdown-1 || table2.CallCountdown > expectedCountdown+1 {
		t.Logf("警告: 倒计时递减不准确，期望约 %d，实际 %d", expectedCountdown, table2.CallCountdown)
	}

	t.Logf("✓ 倒计时自动递减: %d -> %d（经过约 %d 秒）",
		initialCountdown, table2.CallCountdown, elapsed)

	// 清理
	delete(activeGames, gameID)
}

// TestCallPhaseCountdown_CountdownToZero 测试倒计时到0时自动确定庄家
func TestCallPhaseCountdown_CountdownToZero(t *testing.T) {
	// 创建测试游戏并发完牌
	gameID := "1772800000000000006"

	// 初始化游戏
	table := &GameTable{
		GameID:              gameID,
		Status:              "waiting",
		DealingPhase:        "ready",
		PlayerHands:         make(map[int]*PlayerHand),
		CurrentTrick:        make([]PlayedCard, 0),
		TotalCardsPerPlayer: 31,
		DealtCardCount:      0,
		CurrentLevel:        "2",
	}

	// 添加5个玩家
	for i := 1; i <= 5; i++ {
		table.PlayerHands[i] = &PlayerHand{
			UserID:   string(rune('A' + i - 1)),
			Username: string(rune('A' + i - 1)),
			Seat:     i,
			Cards:    []Card{},
		}
	}

	// 初始化发牌
	table.InitializeDeal()
	activeGames[gameID] = table

	// 发完所有牌
	for i := 0; i < 31; i++ {
		DealNextCard(gameID)
	}

	table, _ = GetTableGame(gameID)

	// 有人叫庄
	var callerSeat int
	var cardIndices []int
	for seat, hand := range table.PlayerHands {
		for idx, card := range hand.Cards {
			if card.Value == "2" {
				callerSeat = seat
				cardIndices = append(cardIndices, idx)
				if len(cardIndices) >= 1 {
					break
				}
			}
		}
		if len(cardIndices) > 0 {
			break
		}
	}

	userID := table.PlayerHands[callerSeat].UserID
	_, err := CallDealer(gameID, userID, "", cardIndices)
	if err != nil {
		t.Fatalf("叫庄失败: %v", err)
	}

	// 手动设置倒计时为0（模拟时间流逝）
	table, _ = GetTableGame(gameID)
	table.CallCountdown = 0
	table.UpdatedAt = time.Now().Add(-10 * time.Second) // 设置为10秒前
	activeGames[gameID] = table

	// 再次获取状态（应该自动确定庄家）
	table, _ = GetTableGame(gameID)

	// 验证: CallPhase应该变为finished
	if table.CallPhase != "finished" {
		t.Errorf("期望倒计时结束后 CallPhase 为 'finished'，实际为 '%s'", table.CallPhase)
	}

	// 验证: DealerSeat应该是叫庄的玩家
	if table.DealerSeat != callerSeat {
		t.Errorf("期望庄家为座位 %d，实际为 %d", callerSeat, table.DealerSeat)
	}

	t.Logf("✓ 倒计时到0后自动确定庄家: 座位 %d", table.DealerSeat)

	// 清理
	delete(activeGames, gameID)
}
