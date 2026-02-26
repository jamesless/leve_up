package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	neturl "net/url"
	"time"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Error   string      `json:"error"`
	Message string      `json:"message"`
	Token   string      `json:"token"`
	Game    interface{} `json:"game"`
}

func main() {
	baseURL := "http://localhost:8080"
	client := &http.Client{Timeout: 30 * time.Second}

	fmt.Println("========================================")
	fmt.Println("   单人模式测试")
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

	if resp.StatusCode == 404 {
		fmt.Println("   ❌ API端点不存在 - 服务器可能未更新")
		fmt.Println("   提示: 请重新编译运行服务器: go run main.go")
		return
	}

	var createResp map[string]interface{}
	json.Unmarshal(body, &createResp)

	if !createResp["success"].(bool) {
		fmt.Printf("   ❌ 创建游戏失败: %v\n", createResp)
		return
	}

	gameID := createResp["game"].(map[string]interface{})["id"].(string)
	fmt.Printf("   ✅ 单人游戏创建成功: %s\n", gameID)

	// Get game state
	fmt.Println("\n[3] 获取游戏状态...")
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/game/%s/table", baseURL, gameID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()

	var tableResp map[string]interface{}
	json.Unmarshal(body, &tableResp)

	fmt.Printf("   游戏状态: %v\n", tableResp["status"])
	fmt.Printf("   当前玩家: %v\n", tableResp["currentPlayer"])
	if tableResp["success"].(bool) {
		if myHand, ok := tableResp["myHand"].(map[string]interface{}); ok {
			if cards, ok := myHand["cards"].([]interface{}); ok {
				fmt.Printf("   手牌数量: %d张\n", len(cards))
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
		formData.WriteString(fmt.Sprintf("%s=%s", key, neturl.QueryEscape(value)))
	}
	req, err := http.NewRequest("POST", urlStr, formData)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return client.Do(req)
}

func safeSubstring(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}
