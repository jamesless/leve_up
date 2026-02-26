package main

import (
	"fmt"
	"log"
	"leve_up/models"
)

func main() {
	// 初始化数据库
	err := models.InitDB()
	if err != nil {
		log.Fatal("数据库连接失败:", err)
	}

	fmt.Println("=== 测试完整游戏日志系统 ===\n")

	// 1. 使用现有用户创建游戏
	userID := "player123"
	fmt.Printf("[1] 使用用户 %s 创建游戏...\n", userID)
	game, err := models.CreateSinglePlayerGame("测试游戏", userID)
	if err != nil {
		log.Fatal("创建游戏失败:", err)
	}
	fmt.Printf("✅ 游戏创建成功: %s\n\n", game.ID)

	// 查询日志 - 应该有 game_create 日志
	logs, err := models.GetGameActionLogs(game.ID)
	if err != nil {
		log.Fatal("查询日志失败:", err)
	}
	fmt.Printf("当前日志条数: %d\n", len(logs))
	if len(logs) > 0 {
		fmt.Printf("✅ game_create 日志已记录\n")
	} else {
		fmt.Printf("❌ 缺少 game_create 日志\n")
	}
	fmt.Println()

	// 2. 开始游戏
	fmt.Println("[2] 开始游戏...")
	table, err := models.StartSinglePlayerGame(game.ID, userID)
	if err != nil {
		log.Fatal("开始游戏失败:", err)
	}
	fmt.Printf("✅ 游戏已开始\n\n")

	// 查询日志 - 应该有 game_start 日志
	logs, err = models.GetGameActionLogs(game.ID)
	if err != nil {
		log.Fatal("查询日志失败:", err)
	}
	fmt.Printf("当前日志条数: %d\n", len(logs))
	for i, logEntry := range logs {
		fmt.Printf("  [%d] %s - 座位: %d\n", i+1, logEntry.ActionType, logEntry.PlayerSeat)
	}

	if len(logs) >= 2 {
		fmt.Printf("✅ game_start 日志已记录\n")
	} else {
		fmt.Printf("❌ 缺少 game_start 日志\n")
	}
	fmt.Println()

	// 3. 扣牌（假设庄家是座位1）
	fmt.Println("[3] 测试扣牌...")
	_, err = models.DiscardBottomCards(game.ID, userID, []int{0, 1, 2, 3, 4, 5, 6})
	if err != nil {
		log.Printf("扣牌失败: %v\n", err)
	} else {
		fmt.Printf("✅ 扣牌成功\n")
	}
	fmt.Println()

	// 4. 叫朋友
	fmt.Println("[4] 测试叫朋友...")
	err = models.CallFriendCard(game.ID, table.HostID, "spades", "A", 1)
	if err != nil {
		log.Printf("叫朋友失败: %v\n", err)
	} else {
		fmt.Printf("✅ 叫朋友成功\n")
	}
	fmt.Println()

	// 5. 出牌
	fmt.Println("[5] 测试出牌...")
	_, err = models.PlayCardsGame(game.ID, userID, []int{0})
	if err != nil {
		log.Printf("出牌失败: %v\n", err)
	} else {
		fmt.Printf("✅ 出牌成功\n")
	}
	fmt.Println()

	// 最终查询所有日志
	fmt.Println("\n=== 最终日志记录 ===")
	logs, err = models.GetGameActionLogs(game.ID)
	if err != nil {
		log.Fatal("查询日志失败:", err)
	}

	fmt.Printf("\n共 %d 条日志记录:\n\n", len(logs))
	for i, logEntry := range logs {
		fmt.Printf("[%d] %s | %s | 座位: %d | 玩家: %s\n",
			i+1,
			logEntry.Timestamp.Format("15:04:05"),
			logEntry.ActionType,
			logEntry.PlayerSeat,
			logEntry.PlayerID)
	}

	if len(logs) > 0 {
		fmt.Println("\n✅ 日志系统工作正常！")
	} else {
		fmt.Println("\n❌ 日志系统未记录任何数据！")
	}
}
