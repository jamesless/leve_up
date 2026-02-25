package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Error   string      `json:"error"`
	Message string      `json:"message"`
	Token   string      `json:"token"`
	User    interface{} `json:"user"`
	Game    interface{} `json:"game"`
	Table   interface{} `json:"table"`
	Result  interface{} `json:"result"`
}

func main() {
	baseURL := "http://localhost:8080"
	client := &http.Client{Timeout: 10 * time.Second}

	fmt.Println("========================================")
	fmt.Println("   Full 5-Player Game Flow Test")
	fmt.Println("========================================")

	// Login as player1 (host)
	fmt.Println("\n[1] Login as host (player1)...")
	resp, _ := post(client, baseURL+"/api/login", map[string]string{
		"username": "player1",
		"password": "test1234",
	})
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	var hostLogin map[string]interface{}
	parseJSON(body, &hostLogin)
	hostToken := hostLogin["token"].(string)
	fmt.Printf("   ✅ Logged in, token: %s...\n", safeSubstring(hostToken, 20))

	// Create game
	fmt.Println("\n[2] Create game room...")
	req, _ := http.NewRequest("POST", baseURL+"/api/game/create", bytes.NewBufferString("name=测试房间"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+hostToken)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	var createResult map[string]interface{}
	parseJSON(body, &createResult)
	gameID := createResult["game"].(map[string]interface{})["id"].(string)
	fmt.Printf("   ✅ Game created: %s\n", gameID)

	// Login other players and join
	fmt.Println("\n[3] Other players join game...")
	players := []string{"player2", "player3", "player4", "player5"}
	for _, username := range players {
		resp, _ = post(client, baseURL+"/api/login", map[string]string{
			"username": username,
			"password": "test1234",
		})
		body, _ = io.ReadAll(resp.Body)
		resp.Body.Close()
		var loginResp map[string]interface{}
		parseJSON(body, &loginResp)
		token := loginResp["token"].(string)

		joinURL := fmt.Sprintf("%s/api/game/%s/join", baseURL, gameID)
		req, _ := http.NewRequest("POST", joinURL, bytes.NewBufferString(""))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("Authorization", "Bearer "+token)
		resp, _ = client.Do(req)
		resp.Body.Close()
		fmt.Printf("   ✅ %s joined\n", username)
	}

	// Get game state to verify 5 players
	fmt.Println("\n[4] Verify 5 players in game...")
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/game/%s", baseURL, gameID), nil)
	req.Header.Set("Authorization", "Bearer "+hostToken)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	var gameState map[string]interface{}
	parseJSON(body, &gameState)
	if game, ok := gameState["game"].(map[string]interface{}); ok {
		if players, ok := game["playerIds"].([]interface{}); ok {
			fmt.Printf("   ✅ Players in game: %d/5\n", len(players))
		}
	}

	// Start the game
	fmt.Println("\n[5] Start game (deal cards)...")
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/start", baseURL, gameID), bytes.NewBufferString(""))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+hostToken)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	var startResult map[string]interface{}
	parseJSON(body, &startResult)
	if success, ok := startResult["success"].(bool); ok && success {
		fmt.Printf("   ✅ Game started!\n")
		if table, ok := startResult["table"].(map[string]interface{}); ok {
			fmt.Printf("   Status: %v\n", table["status"])
			fmt.Printf("   Current Player: %v\n", table["currentPlayer"])
		}
	} else {
		fmt.Printf("   ❌ Start failed: %v\n", startResult)
	}

	// Get game table state
	fmt.Println("\n[6] Get game table state...")
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/game/%s/table", baseURL, gameID), nil)
	req.Header.Set("Authorization", "Bearer "+hostToken)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	var tableResult map[string]interface{}
	parseJSON(body, &tableResult)
	if tableResult["success"].(bool) {
		fmt.Printf("   ✅ Game status: %v\n", tableResult["status"])
		fmt.Printf("   Current player: %v\n", tableResult["currentPlayer"])
		if myHand, ok := tableResult["myHand"].(map[string]interface{}); ok {
			if cards, ok := myHand["cards"].([]interface{}); ok {
				fmt.Printf("   My hand size: %d cards\n", len(cards))
				if len(cards) > 0 {
					if firstCard, ok := cards[0].(map[string]interface{}); ok {
						fmt.Printf("   First card: %s of %s\n", firstCard["value"], firstCard["suit"])
					}
				}
			}
		}
	}

	// Call friend card
	fmt.Println("\n[7] Host calls friend card...")
	callData := fmt.Sprintf("suit=%s&value=%s", url.QueryEscape("hearts"), "A")
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/call-friend", baseURL, gameID), bytes.NewBufferString(callData))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+hostToken)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	var callResult map[string]interface{}
	parseJSON(body, &callResult)
	if callResult["success"].(bool) {
		fmt.Printf("   ✅ Friend card called: Ace of Hearts\n")
	}

	// Test playing cards (simulate a few rounds)
	fmt.Println("\n[8] Test playing cards...")

	// Player 1 plays first card
	playData := fmt.Sprintf("cardIndex=0")
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/play", baseURL, gameID), bytes.NewBufferString(playData))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+hostToken)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	var playResult map[string]interface{}
	parseJSON(body, &playResult)
	if playResult["success"].(bool) {
		fmt.Printf("   ✅ Player 1 played a card\n")
		if result, ok := playResult["result"].(map[string]interface{}); ok {
			fmt.Printf("   Next player: %v\n", result["nextPlayer"])
		}
	}

	// Player 2 plays
	resp, _ = post(client, baseURL+"/api/login", map[string]string{"username": "player2", "password": "test1234"})
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	var p2Login map[string]interface{}
	parseJSON(body, &p2Login)
	p2Token := p2Login["token"].(string)

	playData = fmt.Sprintf("cardIndex=0")
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/play", baseURL, gameID), bytes.NewBufferString(playData))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+p2Token)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	parseJSON(body, &playResult)
	if playResult["success"].(bool) {
		fmt.Printf("   ✅ Player 2 played a card\n")
	}

	// Player 3 plays
	resp, _ = post(client, baseURL+"/api/login", map[string]string{"username": "player3", "password": "test1234"})
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	var p3Login map[string]interface{}
	parseJSON(body, &p3Login)
	p3Token := p3Login["token"].(string)

	playData = fmt.Sprintf("cardIndex=0")
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/play", baseURL, gameID), bytes.NewBufferString(playData))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+p3Token)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	parseJSON(body, &playResult)
	if playResult["success"].(bool) {
		fmt.Printf("   ✅ Player 3 played a card\n")
	}

	// Player 4 plays
	resp, _ = post(client, baseURL+"/api/login", map[string]string{"username": "player4", "password": "test1234"})
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	var p4Login map[string]interface{}
	parseJSON(body, &p4Login)
	p4Token := p4Login["token"].(string)

	playData = fmt.Sprintf("cardIndex=0")
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/play", baseURL, gameID), bytes.NewBufferString(playData))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+p4Token)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	parseJSON(body, &playResult)
	if playResult["success"].(bool) {
		fmt.Printf("   ✅ Player 4 played a card\n")
	}

	// Player 5 plays
	resp, _ = post(client, baseURL+"/api/login", map[string]string{"username": "player5", "password": "test1234"})
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	var p5Login map[string]interface{}
	parseJSON(body, &p5Login)
	p5Token := p5Login["token"].(string)

	playData = fmt.Sprintf("cardIndex=0")
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/game/%s/play", baseURL, gameID), bytes.NewBufferString(playData))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+p5Token)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	parseJSON(body, &playResult)
	if playResult["success"].(bool) {
		fmt.Printf("   ✅ Player 5 played a card\n")
		if result, ok := playResult["result"].(map[string]interface{}); ok {
			if trickComplete, ok := result["trickComplete"].(bool); ok && trickComplete {
				fmt.Printf("   🎯 Trick complete! Winner: player %v\n", result["trickWinner"])
			}
		}
	}

	// Get final table state
	fmt.Println("\n[9] Final game state...")
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/game/%s/table", baseURL, gameID), nil)
	req.Header.Set("Authorization", "Bearer "+hostToken)
	resp, _ = client.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	parseJSON(body, &tableResult)
	if tableResult["success"].(bool) {
		fmt.Printf("   Status: %v\n", tableResult["status"])
		fmt.Printf("   Friend revealed: %v\n", tableResult["friendRevealed"])
		fmt.Printf("   Current player: %v\n", tableResult["currentPlayer"])
	}

	fmt.Println("\n========================================")
	fmt.Println("   Full Game Flow Test Complete")
	fmt.Println("========================================")
}

func post(client *http.Client, url string, data map[string]string) (*http.Response, error) {
	formData := &bytes.Buffer{}
	for key, value := range data {
		if formData.Len() > 0 {
			formData.WriteString("&")
		}
		formData.WriteString(fmt.Sprintf("%s=%s", key, value))
	}
	req, err := http.NewRequest("POST", url, formData)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return client.Do(req)
}

func parseJSON(body []byte, v interface{}) {
	json.Unmarshal(body, v)
}

func safeSubstring(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}
