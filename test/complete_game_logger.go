package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type GameTestLogger struct {
	GameID      string
	StartTime   time.Time
	Logs        []string
	ActionCount int
}

func NewGameTestLogger(gameID string) *GameTestLogger {
	return &GameTestLogger{
		GameID:    gameID,
		StartTime: time.Now(),
		Logs:      make([]string, 0),
	}
}

func (l *GameTestLogger) Log(format string, args ...interface{}) {
	l.ActionCount++
	timestamp := time.Since(l.StartTime).Round(time.Millisecond)
	logEntry := fmt.Sprintf("[%v] #%d: %s", timestamp, l.ActionCount, fmt.Sprintf(format, args...))
	fmt.Println(logEntry)
	l.Logs = append(l.Logs, logEntry)
}

func (l *GameTestLogger) SaveToFile(filename string) error {
	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	file.WriteString(fmt.Sprintf("=== 五人三副牌找朋友升级游戏 - 完整游戏日志 ===\n"))
	file.WriteString(fmt.Sprintf("游戏ID: %s\n", l.GameID))
	file.WriteString(fmt.Sprintf("开始时间: %s\n", l.StartTime.Format("2006-01-02 15:04:05")))
	file.WriteString(fmt.Sprintf("总操作数: %d\n", l.ActionCount))
	file.WriteString(fmt.Sprintf("游戏时长: %v\n", time.Since(l.StartTime).Round(time.Second)))
	file.WriteString("\n--- 操作详细日志 ---\n\n")

	for _, log := range l.Logs {
		file.WriteString(log + "\n")
	}

	return nil
}

func main() {
	baseURL := "http://localhost:8080"
	client := &http.Client{}

	fmt.Println("=== 开始五人三副牌找朋友升级游戏完整测试 ===")
	fmt.Println()

	// Step 1: 注册/登录测试用户
	fmt.Println("Step 1: 创建测试用户...")
	testUser := "test_player_" + fmt.Sprintf("%d", time.Now().Unix())
	testPassword := "password123"

	// Register
	registerData := map[string]string{
		"username": testUser,
		"password": testPassword,
	}
	registerJSON, _ := json.Marshal(registerData)
	resp, err := client.Post(baseURL+"/api/register", "application/json", bytes.NewBuffer(registerJSON))
	if err != nil {
		fmt.Printf("注册失败: %v\n", err)
		return
	}
	resp.Body.Close()
	fmt.Printf("✓ 用户注册成功: %s\n", testUser)

	// Login
	loginData := map[string]string{
		"username": testUser,
		"password": testPassword,
	}
	loginJSON, _ := json.Marshal(loginData)
	resp, err = client.Post(baseURL+"/api/login", "application/json", bytes.NewBuffer(loginJSON))
	if err != nil {
		fmt.Printf("登录失败: %v\n", err)
		return
	}
	defer resp.Body.Close()

	// Get session cookie
	cookies := resp.Cookies()
	var sessionCookie *http.Cookie
	for _, cookie := range cookies {
		if cookie.Name == "session_token" {
			sessionCookie = cookie
			break
		}
	}
	if sessionCookie == nil {
		fmt.Println("获取session cookie失败")
		return
	}
	fmt.Printf("✓ 用户登录成功\n\n")

	// Step 2: 创建单人游戏
	fmt.Println("Step 2: 创建单人游戏...")
	createGameData := map[string]string{
		"name": "测试游戏-" + time.Now().Format("15:04:05"),
	}
	createGameJSON, _ := json.Marshal(createGameData)
	req, _ := http.NewRequest("POST", baseURL+"/api/game/singleplayer", bytes.NewBuffer(createGameJSON))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(sessionCookie)

	resp, err = client.Do(req)
	if err != nil {
		fmt.Printf("创建游戏失败: %v\n", err)
		return
	}
	defer resp.Body.Close()

	var gameResponse map[string]interface{}
	body, _ := io.ReadAll(resp.Body)
	json.Unmarshal(body, &gameResponse)
	gameID := gameResponse["game"].(map[string]interface{})["id"].(string)
	fmt.Printf("✓ 游戏创建成功, ID: %s\n\n", gameID)

	// Initialize logger
	logger := NewGameTestLogger(gameID)
	logger.Log("游戏创建完成")

	// Step 3: 启动游戏
	fmt.Println("Step 3: 启动游戏...")
	req, _ = http.NewRequest("POST", baseURL+"/api/game/"+gameID+"/start-single", nil)
	req.AddCookie(sessionCookie)
	resp, err = client.Do(req)
	if err != nil {
		fmt.Printf("启动游戏失败: %v\n", err)
		return
	}
	resp.Body.Close()
	logger.Log("游戏启动 - 进入抢庄阶段")
	fmt.Printf("✓ 游戏启动成功\n\n")

	// Step 4: 获取游戏状态
	fmt.Println("Step 4: 获取游戏状态...")
	req, _ = http.NewRequest("GET", baseURL+"/api/game/"+gameID+"/table", nil)
	req.AddCookie(sessionCookie)
	resp, err = client.Do(req)
	if err != nil {
		fmt.Printf("获取游戏状态失败: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ = io.ReadAll(resp.Body)
	var tableResponse map[string]interface{}
	json.Unmarshal(body, &tableResponse)
	table := tableResponse["table"].(map[string]interface{})

	trumpSuit := table["trumpSuit"].(string)
	dealerSeat := int(table["dealerSeat"].(float64))
	logger.Log("当前游戏状态: 主牌花色=%s, 庄家座位=%d", trumpSuit, dealerSeat)
	fmt.Printf("✓ 游戏状态: 主牌=%s, 庄家座位=%d\n\n", trumpSuit, dealerSeat)

	// Step 5: 扣牌
	fmt.Println("Step 5: 庄家扣牌...")
	playerHands := table["playerHands"].(map[string]interface{})
	dealerHandKey := fmt.Sprintf("%d", dealerSeat)
	dealerHand := playerHands[dealerHandKey].(map[string]interface{})
	handCards := dealerHand["cards"].([]interface{})
	fmt.Printf("庄家手牌数量: %d张\n", len(handCards))

	// 选择前7张牌扣掉(简单策略)
	discardIndices := []int{0, 1, 2, 3, 4, 5, 6}
	discardData := map[string]interface{}{
		"cardIndices": discardIndices,
	}
	discardJSON, _ := json.Marshal(discardData)
	req, _ = http.NewRequest("POST", baseURL+"/api/game/"+gameID+"/discard-bottom", bytes.NewBuffer(discardJSON))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(sessionCookie)

	resp, err = client.Do(req)
	if err != nil {
		fmt.Printf("扣牌失败: %v\n", err)
		return
	}
	resp.Body.Close()
	logger.Log("庄家扣牌完成 - 选择了7张牌扣回底牌")
	fmt.Printf("✓ 扣牌成功\n\n")

	// Step 6: 叫朋友
	fmt.Println("Step 6: 庄家叫朋友...")
	callFriendData := map[string]string{
		"suit":  "spades",
		"value": "A",
	}
	callFriendJSON, _ := json.Marshal(callFriendData)
	req, _ = http.NewRequest("POST", baseURL+"/api/game/"+gameID+"/call-friend", bytes.NewBuffer(callFriendJSON))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(sessionCookie)

	resp, err = client.Do(req)
	if err != nil {
		fmt.Printf("叫朋友失败: %v\n", err)
		return
	}
	resp.Body.Close()
	logger.Log("庄家叫朋友 - 叫♠A")
	fmt.Printf("✓ 叫朋友成功 (♠A)\n\n")

	// Step 7: 模拟几轮出牌
	fmt.Println("Step 7: 开始出牌...")
	for round := 1; round <= 3; round++ {
		fmt.Printf("\n--- 第%d轮出牌 ---\n", round)
		logger.Log("=== 第%d轮出牌开始 ===", round)

		// 获取当前游戏状态
		req, _ = http.NewRequest("GET", baseURL+"/api/game/"+gameID+"/table", nil)
		req.AddCookie(sessionCookie)
		resp, _ = client.Do(req)
		body, _ = io.ReadAll(resp.Body)
		resp.Body.Close()

		var currentTable map[string]interface{}
		json.Unmarshal(body, &currentTable)
		tableData := currentTable["table"].(map[string]interface{})
		currentPlayer := int(tableData["currentPlayer"].(float64))

		logger.Log("当前出牌玩家: 座位%d", currentPlayer)

		if currentPlayer == 1 {
			// 人类玩家出牌
			fmt.Println("轮到玩家出牌")
			playData := map[string]interface{}{
				"cardIndices": []int{0}, // 出第一张牌
			}
			playJSON, _ := json.Marshal(playData)
			req, _ = http.NewRequest("POST", baseURL+"/api/game/"+gameID+"/play", bytes.NewBuffer(playJSON))
			req.Header.Set("Content-Type", "application/json")
			req.AddCookie(sessionCookie)
			resp, _ = client.Do(req)
			resp.Body.Close()
			logger.Log("玩家(座位1)出牌")
			fmt.Println("✓ 玩家出牌成功")
		}

		// AI玩家自动出牌
		for i := 0; i < 4; i++ {
			req, _ = http.NewRequest("POST", baseURL+"/api/game/"+gameID+"/ai-play", nil)
			req.AddCookie(sessionCookie)
			resp, _ = client.Do(req)
			body, _ = io.ReadAll(resp.Body)
			resp.Body.Close()

			var aiResponse map[string]interface{}
			json.Unmarshal(body, &aiResponse)
			if tableData, ok := aiResponse["table"].(map[string]interface{}); ok {
				if lastPlay, ok := tableData["lastPlay"].(map[string]interface{}); ok {
					if message, ok := lastPlay["message"].(string); ok {
						logger.Log("AI出牌: %s", message)
					}
				}
			}
			time.Sleep(100 * time.Millisecond)
		}

		fmt.Printf("✓ 第%d轮出牌完成\n", round)
		logger.Log("=== 第%d轮出牌结束 ===", round)
	}

	// Step 8: 保存日志
	fmt.Println("\n=== 测试完成 ===")
	logFilename := fmt.Sprintf("game_log_%s.txt", gameID)
	err = logger.SaveToFile(logFilename)
	if err != nil {
		fmt.Printf("保存日志失败: %v\n", err)
	} else {
		fmt.Printf("✓ 游戏日志已保存到: %s\n", logFilename)
	}

	// 打印统计信息
	fmt.Println("\n=== 游戏统计 ===")
	fmt.Printf("游戏ID: %s\n", gameID)
	fmt.Printf("总操作数: %d\n", logger.ActionCount)
	fmt.Printf("游戏时长: %v\n", time.Since(logger.StartTime).Round(time.Second))
	fmt.Printf("日志文件: %s\n", logFilename)
}
