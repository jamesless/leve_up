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
	fmt.Println("   检查所有玩家手牌数量")
	fmt.Println("========================================")

	// Login
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

	// Create single player game
	req, _ := http.NewRequest("POST", baseURL+"/api/game/singleplayer", bytes.NewBufferString(`{"name":"手牌检查"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()

	var createResp map[string]interface{}
	json.Unmarshal(body, &createResp)
	gameID := createResp["game"].(map[string]interface{})["id"].(string)

	// Start game
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/start-single", baseURL, gameID), bytes.NewBufferString(""))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()

	fmt.Println("\n检查游戏启动后所有玩家的手牌数量...")

	// Get table state
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/game/%s/table", baseURL, gameID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()

	var tableResp map[string]interface{}
	json.Unmarshal(body, &tableResp)

	if tableResp["success"].(bool) {
		fmt.Println("\n✅ 游戏状态获取成功")

		// Check players
		if players, ok := tableResp["players"].([]interface{}); ok {
			fmt.Printf("\n玩家数量: %d\n", len(players))
			fmt.Println("\n所有玩家的手牌数量:")
			fmt.Println("----------------------------------------")
			for _, p := range players {
				player := p.(map[string]interface{})
				seat := int(player["seat"].(float64))
				cardCount := int(player["cardCount"].(float64))
				username := ""
				if u, ok := player["username"].(string); ok {
					username = u
				} else {
					if isAI, ok := player["isAI"].(bool); ok && isAI {
						username = fmt.Sprintf("AI-%d", seat)
					} else {
						username = "Player"
					}
				}
				fmt.Printf("  座位 %d: %s - %d张牌\n", seat, username, cardCount)
			}
			fmt.Println("----------------------------------------")
		} else {
			fmt.Println("❌ 没有找到 players 数据")
		}

		// Check my hand
		if myHand, ok := tableResp["myHand"].(map[string]interface{}); ok {
			if cards, ok := myHand["cards"].([]interface{}); ok {
				fmt.Printf("\n我的手牌: %d张\n", len(cards))
			}
		} else {
			fmt.Println("\n❌ 没有找到 myHand 数据")
		}
	}

	fmt.Println("\n========================================")
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
