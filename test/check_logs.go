package main

import (
	"encoding/json"
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

	// 查询游戏日志
	gameID := "1772091006882431300"
	logs, err := models.GetGameActionLogs(gameID)
	if err != nil {
		log.Fatal("查询日志失败:", err)
	}

	fmt.Printf("=== 游戏 %s 的操作日志 ===\n\n", gameID)
	fmt.Printf("共 %d 条日志记录\n\n", len(logs))

	for i, logEntry := range logs {
		actionDataJSON, _ := json.MarshalIndent(logEntry.ActionData, "", "  ")
		resultDataJSON, _ := json.MarshalIndent(logEntry.ResultData, "", "  ")

		fmt.Printf("[%d] %s | 操作类型: %s | 玩家座位: %d\n",
			i+1, logEntry.Timestamp.Format("15:04:05"), logEntry.ActionType, logEntry.PlayerSeat)
		fmt.Printf("  操作数据: %s\n", string(actionDataJSON))
		fmt.Printf("  结果数据: %s\n\n", string(resultDataJSON))
	}
}
