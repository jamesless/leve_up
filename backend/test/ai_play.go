package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func main() {
	baseURL := "http://localhost:8080"
	client := &http.Client{Timeout: 30 * time.Second}

	fmt.Println("========================================")
	fmt.Println("   AI出牌测试")
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
	req, _ := http.NewRequest("POST", baseURL+"/api/game/singleplayer", bytes.NewBufferString(`{"name":"AI测试"}`))
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

	// Human plays first card
	fmt.Println("\n[4] 人类玩家出第一张牌...")
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/play", baseURL, gameID), bytes.NewBufferString("cardIndex=0"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err = client.Do(req)
	if err != nil {
		fmt.Printf("   ❌ 出牌失败: %v\n", err)
		return
	}
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()

	var playResp map[string]interface{}
	json.Unmarshal(body, &playResp)

	if !playResp["success"].(bool) {
		fmt.Printf("   ❌ 出牌失败: %v\n", playResp)
		return
	}
	fmt.Printf("   ✅ 人类玩家出牌成功\n")

	// Get current state
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/game/%s/table", baseURL, gameID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()

	var tableResp map[string]interface{}
	json.Unmarshal(body, &tableResp)

	currentPlayer := int(tableResp["currentPlayer"].(float64))
	fmt.Printf("   当前玩家: %d\n", currentPlayer)

	// Test AI play
	fmt.Println("\n[5] 测试AI出牌...")
	if currentPlayer != 1 {
		aiAttempts := 0
		maxAIAttempts := 10

		for currentPlayer != 1 && aiAttempts < maxAIAttempts {
			aiAttempts++

			fmt.Printf("   AI玩家 %d 出牌中...\n", currentPlayer)

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
					currentPlayer = int(cp)
					fmt.Printf("   ✅ AI出牌成功，下一个玩家: %d\n", currentPlayer)

					// Check current trick
					if currentTrick, ok := aiTable["currentTrick"].([]interface{}); ok {
						fmt.Printf("   当前轮次牌数: %d/5\n", len(currentTrick))
						for _, pc := range currentTrick {
							if pcMap, ok := pc.(map[string]interface{}); ok {
								if card, ok := pcMap["card"].(map[string]interface{}); ok {
									fmt.Printf("      座位 %d: %s %s\n", int(pcMap["seat"].(float64)), card["suit"], card["value"])
								}
							}
						}
					}
				}
			}

			if currentPlayer == 1 {
				fmt.Println("\n   ✅ 所有AI出牌完成，轮到人类玩家")
				break
			}

			time.Sleep(300 * time.Millisecond)
		}

		if aiAttempts >= maxAIAttempts {
			fmt.Printf("   ⚠️  达到最大AI出牌次数限制\n")
		}
	} else {
		fmt.Println("   ⚠️  仍然是人类玩家的回合")
	}

	// Get final state
	fmt.Println("\n[6] 获取最终游戏状态...")
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/game/%s/table", baseURL, gameID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()

	json.Unmarshal(body, &tableResp)

	if myHand, ok := tableResp["myHand"].(map[string]interface{}); ok {
		if cards, ok := myHand["cards"].([]interface{}); ok {
			fmt.Printf("   人类玩家剩余手牌: %d张\n", len(cards))
		}
	}

	fmt.Println("\n========================================")
	fmt.Println("   AI出牌测试完成")
	fmt.Println("========================================")
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
