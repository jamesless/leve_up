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
	Data    interface{} `json:"data"`
	User    interface{} `json:"user"`
	Game    interface{} `json:"game"`
	Token   string      `json:"token"`
}

func main() {
	baseURL := "http://localhost:8080"
	client := &http.Client{Timeout: 10 * time.Second}

	fmt.Println("========================================")
	fmt.Println("   API Testing - All Endpoints")
	fmt.Println("========================================")

	// Test 1: Register 5 users
	fmt.Println("\n[1] Testing User Registration (5 users)...")
	users := []string{"player1", "player2", "player3", "player4", "player5"}
	tokens := make(map[string]string)

	for _, username := range users {
		resp, err := post(client, baseURL+"/api/register", map[string]string{
			"username": username,
			"password": "test1234",
		})
		if err != nil {
			fmt.Printf("   ❌ %s: %v\n", username, err)
		} else if resp.StatusCode == 200 || resp.StatusCode == 409 {
			if resp.StatusCode == 200 {
				fmt.Printf("   ✅ %s: Registered (200)\n", username)
			} else {
				fmt.Printf("   ⚠️  %s: Already exists (409)\n", username)
			}
			// Login to get token
			loginResp, err := post(client, baseURL+"/api/login", map[string]string{
				"username": username,
				"password": "test1234",
			})
			if err == nil && loginResp.StatusCode == 200 {
				body, _ := io.ReadAll(loginResp.Body)
				var result APIResponse
				json.Unmarshal(body, &result)
				tokens[username] = result.Token
				fmt.Printf("      Token: %s...\n", safeSubstring(result.Token, 20))
			}
			loginResp.Body.Close()
		} else {
			fmt.Printf("   ❌ %s: Status %d\n", username, resp.StatusCode)
		}
		resp.Body.Close()
	}

	// Test 2: Login API
	fmt.Println("\n[2] Testing Login API...")
	resp, err := post(client, baseURL+"/api/login", map[string]string{
		"username": "player1",
		"password": "test1234",
	})
	if err != nil {
		fmt.Printf("   ❌ Login failed: %v\n", err)
	} else if resp.StatusCode == 200 {
		fmt.Printf("   ✅ Login successful (200)\n")
		body, _ := io.ReadAll(resp.Body)
		var result APIResponse
		json.Unmarshal(body, &result)
		if result.Token != "" {
			fmt.Printf("      Token received: %s...\n", safeSubstring(result.Token, 20))
		}
	} else {
		fmt.Printf("   ❌ Login failed: Status %d\n", resp.StatusCode)
	}
	resp.Body.Close()

	// Test 3: Get Current User (with auth)
	fmt.Println("\n[3] Testing Get Current User API...")
	if token, ok := tokens["player1"]; ok {
		req, _ := http.NewRequest("GET", baseURL+"/api/user", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("   ❌ Get user failed: %v\n", err)
		} else if resp.StatusCode == 200 {
			fmt.Printf("   ✅ Get current user successful (200)\n")
		} else {
			fmt.Printf("   ❌ Get user failed: Status %d\n", resp.StatusCode)
		}
		resp.Body.Close()
	}

	// Test 4: Create Game
	fmt.Println("\n[4] Testing Create Game API...")
	if token, ok := tokens["player1"]; ok {
		gameBody := "name=" + url.QueryEscape("测试房间")
		req, _ := http.NewRequest("POST", baseURL+"/api/game/create", bytes.NewBufferString(gameBody))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("   ❌ Create game failed: %v\n", err)
		} else if resp.StatusCode == 200 {
			fmt.Printf("   ✅ Create game successful (200)\n")
			body, _ := io.ReadAll(resp.Body)
			var result map[string]interface{}
			json.Unmarshal(body, &result)
			if gameID, ok := result["game"].(map[string]interface{})["id"].(string); ok {
				fmt.Printf("      Game ID: %s\n", gameID)

				// Test 5: Join Game with other players
				fmt.Println("\n[5] Testing Join Game API (5 players)...")
				for i, username := range users {
					if i == 0 {
						fmt.Printf("   ✅ %s: Host (already in game)\n", username)
						continue
					}
					if token, ok := tokens[username]; ok {
						joinURL := fmt.Sprintf("%s/api/game/%s/join", baseURL, gameID)
						req, _ := http.NewRequest("POST", joinURL, bytes.NewBufferString(""))
						req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
						req.Header.Set("Authorization", "Bearer "+token)
						resp, err := client.Do(req)
						if err != nil {
							fmt.Printf("   ❌ %s: %v\n", username, err)
						} else if resp.StatusCode == 200 {
							fmt.Printf("   ✅ %s: Joined game (200)\n", username)
						} else {
							body, _ := io.ReadAll(resp.Body)
							fmt.Printf("   ❌ %s: Status %d - %s\n", username, resp.StatusCode, string(body))
						}
						resp.Body.Close()
					}
				}

				// Test 6: Get Game State
				fmt.Println("\n[6] Testing Get Game State API...")
				req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/game/%s", baseURL, gameID), nil)
				req.Header.Set("Authorization", "Bearer "+tokens["player1"])
				resp, err := client.Do(req)
				if err != nil {
					fmt.Printf("   ❌ Get game failed: %v\n", err)
				} else if resp.StatusCode == 200 {
					fmt.Printf("   ✅ Get game state successful (200)\n")
					body, _ := io.ReadAll(resp.Body)
					var result map[string]interface{}
					json.Unmarshal(body, &result)
					if game, ok := result["game"].(map[string]interface{}); ok {
						if players, ok := game["playerIds"].([]interface{}); ok {
							fmt.Printf("      Players in game: %d/5\n", len(players))
						}
					}
				} else {
					fmt.Printf("   ❌ Get game failed: Status %d\n", resp.StatusCode)
				}
				resp.Body.Close()
			}
		} else {
			body, _ := io.ReadAll(resp.Body)
			fmt.Printf("   ❌ Create game failed: Status %d - %s\n", resp.StatusCode, string(body))
		}
		resp.Body.Close()
	}

	// Test 7: Logout
	fmt.Println("\n[7] Testing Logout API...")
	if token, ok := tokens["player1"]; ok {
		req, _ := http.NewRequest("POST", baseURL+"/api/logout", bytes.NewBufferString(""))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("   ❌ Logout failed: %v\n", err)
		} else if resp.StatusCode == 200 {
			fmt.Printf("   ✅ Logout successful (200)\n")
		} else {
			fmt.Printf("   ❌ Logout failed: Status %d\n", resp.StatusCode)
		}
		resp.Body.Close()
	}

	fmt.Println("\n========================================")
	fmt.Println("   API Testing Complete")
	fmt.Println("========================================")
}

func post(client *http.Client, url string, data map[string]string) (*http.Response, error) {
	// Use form encoding instead of JSON
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

func safeSubstring(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}
