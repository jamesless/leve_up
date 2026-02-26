package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Error   string      `json:"error"`
	Message string      `json:"message"`
	Token   string      `json:"token"`
	Game    interface{} `json:"game"`
	Table   interface{} `json:"table"`
	Result  interface{} `json:"result"`
}

func main() {
	baseURL := "http://localhost:8080"
	client := &http.Client{Timeout: 30 * time.Second}

	fmt.Println("========================================")
	fmt.Println("   单人模式完整测试 - 出牌测试")
	fmt.Println("========================================")

	// Login
	fmt.Println("\n[1] 登录 player1...")
	resp, err := post(client, baseURL+"/api/login", map[string]string{
		"username": "player1",
		"password": "test1234",
	})
	if err != nil {
		fmt.Printf("   ❌ 登录失败: %v\n", err)
		return
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	var loginResp map[string]interface{}
	json.Unmarshal(body, &loginResp)

	token, ok := loginResp["token"].(string)
	if !ok {
		fmt.Printf("   ❌ 登录失败: %v\n", loginResp)
		return
	}
	fmt.Printf("   ✅ 登录成功\n")

	// Create single player game
	fmt.Println("\n[2] 创建单人游戏...")
	req, _ := http.NewRequest("POST", baseURL+"/api/game/singleplayer", bytes.NewBufferString(`{"name":"单人练习"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err = client.Do(req)
	if err != nil {
		fmt.Printf("   ❌ 创建游戏失败: %v\n", err)
		return
	}
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()

	var createResp map[string]interface{}
	json.Unmarshal(body, &createResp)

	if !createResp["success"].(bool) {
		fmt.Printf("   ❌ 创建游戏失败: %v\n", createResp)
		return
	}

	gameID := createResp["game"].(map[string]interface{})["id"].(string)
	fmt.Printf("   ✅ 单人游戏创建成功: %s\n", gameID)

	// Start single player game
	fmt.Println("\n[3] 启动单人游戏...")
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/start-single", baseURL, gameID), bytes.NewBufferString(""))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err = client.Do(req)
	if err != nil {
		fmt.Printf("   ❌ 启动游戏失败: %v\n", err)
		return
	}
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()

	var startResp map[string]interface{}
	json.Unmarshal(body, &startResp)

	if !startResp["success"].(bool) {
		fmt.Printf("   ❌ 启动游戏失败: %v\n", startResp)
		return
	}

	table := startResp["table"].(map[string]interface{})
	fmt.Printf("   ✅ 游戏启动成功\n")
	fmt.Printf("   当前玩家: %v\n", table["currentPlayer"])
	fmt.Printf("   游戏状态: %v\n", table["status"])

	// Get table state
	fmt.Println("\n[4] 获取游戏状态...")
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/game/%s/table", baseURL, gameID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()

	var tableResp map[string]interface{}
	json.Unmarshal(body, &tableResp)

	if tableResp["success"].(bool) {
		fmt.Printf("   ✅ 游戏状态获取成功\n")
		fmt.Printf("   当前玩家: %v\n", tableResp["currentPlayer"])

		var myCards []interface{}
		if myHand, ok := tableResp["myHand"].(map[string]interface{}); ok {
			if cards, ok := myHand["cards"].([]interface{}); ok {
				myCards = cards
				fmt.Printf("   手牌数量: %d张\n", len(cards))
				if len(cards) > 0 {
					firstCard := cards[0].(map[string]interface{})
					fmt.Printf("   第一张牌: %s %s\n", firstCard["suit"], firstCard["value"])
				}
			}
		}

		// Check if it's player 1's turn (human player)
		if currentPlayer, ok := tableResp["currentPlayer"].(float64); ok && int(currentPlayer) == 1 {
			fmt.Println("\n[5] 现在是人类玩家的回合，测试出牌...")
			if len(myCards) > 0 {
				// Play first card
				fmt.Println("   尝试出第一张牌...")
				req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/play", baseURL, gameID), bytes.NewBufferString("cardIndex=0"))
				req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
				req.Header.Set("Authorization", "Bearer "+token)
				resp, err = client.Do(req)
				if err != nil {
					fmt.Printf("   ❌ 出牌失败: %v\n", err)
				} else {
					body, _ = io.ReadAll(resp.Body)
					resp.Body.Close()
					var playResp map[string]interface{}
					json.Unmarshal(body, &playResp)
					if playResp["success"].(bool) {
						fmt.Printf("   ✅ 出牌成功\n")
						if result, ok := playResp["result"].(map[string]interface{}); ok {
							fmt.Printf("   消息: %v\n", result["message"])
							fmt.Printf("   下一个玩家: %v\n", result["nextPlayer"])
						}
					} else {
						fmt.Printf("   ❌ 出牌失败: %v\n", playResp)
					}
				}
			}
		} else {
			fmt.Println("\n[5] 不是人类玩家的回合，测试AI出牌...")
			// AI should play
			attempts := 0
			maxAttempts := 5

			for attempts < maxAttempts {
				attempts++

				// Trigger AI play
				req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/ai-play", baseURL, gameID), bytes.NewBufferString(""))
				req.Header.Set("Authorization", "Bearer "+token)
				resp, err := client.Do(req)
				if err != nil {
					fmt.Printf("   ❌ AI出牌请求失败: %v\n", err)
					break
				}
				body, _ = io.ReadAll(resp.Body)
				resp.Body.Close()

				var aiResp map[string]interface{}
				json.Unmarshal(body, &aiResp)

				if !aiResp["success"].(bool) {
					fmt.Printf("   ❌ AI出牌失败: %v\n", aiResp)
					break
				}

				if aiTable, ok := aiResp["table"].(map[string]interface{}); ok {
					if cp, ok := aiTable["currentPlayer"].(float64); ok {
						fmt.Printf("   AI出牌成功，当前玩家: %d\n", int(cp))
						if int(cp) == 1 {
							fmt.Println("   ✅ AI完成出牌，轮到人类玩家")
							break
						}
					}
				}

				time.Sleep(500 * time.Millisecond)
			}
		}
	}

	fmt.Println("\n========================================")
	fmt.Println("   单人模式测试完成")
	fmt.Println("========================================")
	fmt.Printf("\n访问单人游戏: %s/game/singleplayer/%s\n", baseURL, gameID)
}

func post(client *http.Client, urlStr string, data map[string]string) (*http.Response, error) {
	formData := &bytes.Buffer{}
	for key, value := range data {
		if formData.Len() > 0 {
			formData.WriteString("&")
		}
		formData.WriteString(fmt.Sprintf("%s=%s", key, value))
	}
	req, err := http.NewRequest("POST", urlStr, formData)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return client.Do(req)
}
