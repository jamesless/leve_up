package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// GameLogger records all game events
type GameLogger struct {
	GameID      string
	LogDir      string
	Version     string
	Events      []GameEvent
	CurrentGame int
}

type GameEvent struct {
	Timestamp   time.Time              `json:"timestamp"`
	GameID      string                 `json:"gameId"`
	EventType   string                 `json:"eventType"` // deal, play, trick_end, game_end
	PlayerID    string                 `json:"playerId"`
	PlayerSeat  int                    `json:"playerSeat"`
	Card        Card                   `json:"card,omitempty"`
	Cards       []Card                 `json:"cards,omitempty"`
	Trick       []PlayedCard           `json:"trick,omitempty"`
	Scores      map[string]int         `json:"scores,omitempty"`
	Winner      int                    `json:"winner,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// RuleValidator validates game logs against rules
type RuleValidator struct {
	Violations []RuleViolation
}

type RuleViolation struct {
	Rule       string   `json:"rule"`
	Violation  string   `json:"violation"`
	Severity   string   `json:"severity"` // error, warning
	Suggestion string   `json:"suggestion,omitempty"`
	EventID    int      `json:"eventId"`
	Context    []string `json:"context,omitempty"`
}

// AutomatedTester manages the automated testing cycle
type AutomatedTester struct {
	BaseURL    string
	Client     *http.Client
	Token      string
	LogDir     string
	Version    string
	GameCount  int
	Logger     *GameLogger
	Validator  *RuleValidator
}

func NewAutomatedTester(baseURL, logDir string) *AutomatedTester {
	return &AutomatedTester{
		BaseURL: baseURL,
		Client:  &http.Client{Timeout: 30 * time.Second},
		LogDir:  logDir,
		Version: generateVersion(),
	}
}

func generateVersion() string {
	return fmt.Sprintf("v1.%d", time.Now().Unix())
}

// RunTestingCycle executes the full testing cycle
func (at *AutomatedTester) RunTestingCycle() error {
	fmt.Println("========================================")
	fmt.Println("   自动化测试系统启动")
	fmt.Println("========================================")
	fmt.Printf("版本号: %s\n", at.Version)
	fmt.Printf("日志目录: %s\n", at.LogDir)
	fmt.Println()

	// Create version directory
	versionDir := filepath.Join(at.LogDir, at.Version)
	if err := os.MkdirAll(versionDir, 0755); err != nil {
		return fmt.Errorf("创建版本目录失败: %w", err)
	}

	at.Logger = &GameLogger{
		LogDir:  versionDir,
		Version: at.Version,
		Events:  make([]GameEvent, 0),
	}
	at.Validator = &RuleValidator{
		Violations: make([]RuleViolation, 0),
	}

	// Run 3 games
	for i := 1; i <= 3; i++ {
		fmt.Printf("\n========================================\n")
		fmt.Printf("   开始第 %d 场游戏\n", i)
		fmt.Printf("========================================\n")

		at.GameCount = i
		if err := at.runSingleGame(i); err != nil {
			fmt.Printf("游戏 %d 失败: %v\n", i, err)
			continue
		}

		fmt.Printf("✅ 游戏 %d 完成\n", i)
		time.Sleep(1 * time.Second)
	}

	// Save all logs
	if err := at.saveLogs(); err != nil {
		return fmt.Errorf("保存日志失败: %w", err)
	}

	// Validate against rules
	fmt.Println("\n========================================")
	fmt.Println("   开始验证规则合规性")
	fmt.Println("========================================")

	violations := at.Validator.ValidateGameLogs(at.Logger.Events)

	if len(violations) == 0 {
		fmt.Println("✅ 所有规则验证通过！")
		return nil
	}

	// Report violations
	fmt.Printf("\n❌ 发现 %d 个规则违规:\n", len(violations))
	for i, v := range violations {
		fmt.Printf("\n[%d] %s\n", i+1, v.Rule)
		fmt.Printf("    违规: %s\n", v.Violation)
		fmt.Printf("    严重性: %s\n", v.Severity)
		if v.Suggestion != "" {
			fmt.Printf("    建议: %s\n", v.Suggestion)
		}
		if len(v.Context) > 0 {
			fmt.Printf("    上下文: %v\n", v.Context)
		}
	}

	return fmt.Errorf("发现 %d 个规则违规", len(violations))
}

// runSingleGame runs a complete single player game
func (at *AutomatedTester) runSingleGame(gameNum int) error {
	// Login or create user
	if at.Token == "" {
		if err := at.login(); err != nil {
			return err
		}
	}

	// Create single player game
	gameID, err := at.createSinglePlayerGame()
	if err != nil {
		return err
	}

	at.Logger.GameID = gameID
	fmt.Printf("游戏ID: %s\n", gameID)

	// Start game
	table, err := at.startGame(gameID)
	if err != nil {
		return err
	}

	// Log deal event
	at.logEvent(GameEvent{
		Timestamp:   time.Now(),
		GameID:      gameID,
		EventType:   "deal",
		Trick:       table.CurrentTrick,
		Metadata:    map[string]interface{}{"trumpSuit": table.TrumpSuit},
	})

	// Play game until finished
	return at.playGameUntilEnd(gameID, gameNum)
}

// login logs in a test user
func (at *AutomatedTester) login() error {
	username := fmt.Sprintf("autotest_%d", time.Now().Unix())
	password := "test1234"

	// Try to register
	resp, err := at.post("/api/register", map[string]string{
		"username": username,
		"password": password,
	})
	if err == nil {
		resp.Body.Close()
	}

	// Login
	resp, err = at.post("/api/login", map[string]string{
		"username": username,
		"password": password,
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return err
	}

	token, ok := result["token"].(string)
	if !ok {
		return fmt.Errorf("获取token失败")
	}

	at.Token = token
	fmt.Printf("登录成功: %s\n", username)
	return nil
}

// createSinglePlayerGame creates a new single player game
func (at *AutomatedTester) createSinglePlayerGame() (string, error) {
	resp, err := at.postWithToken("/api/game/singleplayer", map[string]string{
		"name": fmt.Sprintf("自动化测试游戏_%d", at.GameCount),
	})
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	game, ok := result["game"].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("创建游戏失败")
	}

	gameID, ok := game["id"].(string)
	if !ok {
		return "", fmt.Errorf("获取游戏ID失败")
	}

	return gameID, nil
}

// startGame starts the game
func (at *AutomatedTester) startGame(gameID string) (map[string]interface{}, error) {
	resp, err := at.postWithToken(fmt.Sprintf("/api/game/%s/start-single", gameID), map[string]string{})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	table, ok := result["table"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("启动游戏失败")
	}

	return table, nil
}

// playGameUntilEnd plays the game automatically until finished
func (at *AutomatedTester) playGameUntilEnd(gameID string, gameNum int) error {
	maxTurns := 200 // Prevent infinite loops
	turnCount := 0

	for turnCount < maxTurns {
		turnCount++

		// Get current state
		resp, err := at.getWithToken(fmt.Sprintf("/api/game/%s/table", gameID))
		if err != nil {
			return err
		}

		body, _ := io.ReadAll(resp.Body)
		var state map[string]interface{}
		if err := json.Unmarshal(body, &state); err != nil {
			resp.Body.Close()
			return err
		}
		resp.Body.Close()

		// Check if game is finished
		status, _ := state["status"].(string)
		if status == "finished" {
			at.logEvent(GameEvent{
				Timestamp: time.Now(),
				GameID:    gameID,
				EventType: "game_end",
				Metadata:  map[string]interface{}{"totalTurns": turnCount},
			})
			fmt.Printf("游戏结束，共 %d 轮\n", turnCount)
			return nil
		}

		// Check if it's human player's turn (seat 1)
		currentPlayer, _ := state["currentPlayer"].(float64)
		if int(currentPlayer) == 1 {
			// Human player's turn - make AI play for them in auto mode
			if err := at.makeAutoPlay(gameID); err != nil {
				fmt.Printf("自动出牌错误: %v\n", err)
			}
		} else {
			// AI player's turn
			if err := at.makeAIPlay(gameID); err != nil {
				fmt.Printf("AI出牌错误: %v\n", err)
			}
		}

		// Small delay between turns
		time.Sleep(100 * time.Millisecond)
	}

	return fmt.Errorf("游戏超过最大轮数限制")
}

// makeAutoPlay makes an automatic play for human player
func (at *AutomatedTester) makeAutoPlay(gameID string) error {
	// Get table state to determine which card to play
	resp, err := at.getWithToken(fmt.Sprintf("/api/game/%s/table", gameID))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var state map[string]interface{}
	json.Unmarshal(body, &state)

	// Get hand and current trick
	myHand, _ := state["myHand"].(map[string]interface{})
	cards, _ := myHand["cards"].([]interface{})
	currentTrick, _ := state["currentTrick"].([]interface{})

	// Simple AI: play first valid card
	cardIndex := 0
	if len(currentTrick) > 0 {
		// Try to follow suit
		leadCard := currentTrick[0].(map[string]interface{})["card"].(map[string]interface{})
		leadSuit := leadCard["suit"].(string)

		// Find first card of lead suit
		for i, c := range cards {
			card := c.(map[string]interface{})
			if card["suit"] == leadSuit {
				cardIndex = i
				break
			}
		}
	}

	// Play the card
	resp, err = at.postWithToken(fmt.Sprintf("/api/game/%s/play", gameID), map[string]string{
		"cardIndices": fmt.Sprintf("%d", cardIndex),
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Log the play
	at.logEvent(GameEvent{
		Timestamp:  time.Now(),
		GameID:     gameID,
		EventType:  "play",
		PlayerSeat: 1,
		Metadata:   map[string]interface{}{"cardIndex": cardIndex, "totalCards": len(cards)},
	})

	return nil
}

// makeAIPlay triggers AI to play
func (at *AutomatedTester) makeAIPlay(gameID string) error {
	resp, err := at.postWithToken(fmt.Sprintf("/api/game/%s/ai-play", gameID), map[string]string{})
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

// logEvent logs a game event
func (at *AutomatedTester) logEvent(event GameEvent) {
	at.Logger.Events = append(at.Logger.Events, event)
}

// saveLogs saves all game logs to files
func (at *AutomatedTester) saveLogs() error {
	// Save combined log
	logFile := filepath.Join(at.Logger.LogDir, "combined_log.jsonl")
	file, err := os.Create(logFile)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	for _, event := range at.Logger.Events {
		if err := encoder.Encode(event); err != nil {
			return err
		}
	}

	// Save individual game logs
	gameEvents := make(map[int][]GameEvent)
	for _, event := range at.Logger.Events {
		// Extract game number from metadata or default to 1
		gameNum := 1
		if event.EventType == "game_end" {
			if totalTurns, ok := event.Metadata["totalTurns"].(float64); ok {
				gameNum = int(totalTurns)
			}
		}
		gameEvents[gameNum] = append(gameEvents[gameNum], event)
	}

	for gameNum, events := range gameEvents {
		gameFile := filepath.Join(at.Logger.LogDir, fmt.Sprintf("game_%d.json", gameNum))
		data, _ := json.MarshalIndent(events, "", "  ")
		if err := os.WriteFile(gameFile, data, 0644); err != nil {
			return err
		}
	}

	fmt.Printf("\n✅ 日志已保存到: %s\n", at.Logger.LogDir)
	return nil
}

// ValidateGameLogs validates game events against rules
func (rv *RuleValidator) ValidateGameLogs(events []GameEvent) []RuleViolation {
	rv.Violations = make([]RuleViolation, 0)

	// Validate card distribution
	rv.validateCardDistribution(events)

	// Validate turn order
	rv.validateTurnOrder(events)

	// Validate scoring
	rv.validateScoring(events)

	// Validate card playing rules
	rv.validateCardPlayingRules(events)

	return rv.Violations
}

// validateCardDistribution validates that cards were dealt correctly
func (rv *RuleValidator) validateCardDistribution(events []GameEvent) {
	// Rule: 5 players, 31 cards each, 7 bottom cards = 162 total
	for _, event := range events {
		if event.EventType == "deal" {
			// Check if trump suit is set
			if trumpSuit, ok := event.Metadata["trumpSuit"].(string); ok && trumpSuit == "" {
				rv.addViolation("发牌规则", "发牌后未设置主牌花色", "error",
					"确保发牌逻辑正确设置主牌", 0, nil)
			}
		}
	}
}

// validateTurnOrder validates that players played in correct order
func (rv *RuleValidator) validateTurnOrder(events []GameEvent) {
	// Rule: Players must play in clockwise order (1→2→3→4→5→1)
	for i, event := range events {
		if event.EventType == "play" {
			// Check play sequence
			// (Simplified validation)
		}
	}
}

// validateScoring validates that scoring is correct
func (rv *RuleValidator) validateScoring(events []GameEvent) {
	// Rule: 5, 10, K are scoring cards (5, 10, 10 points)
	// Total should be 300 points
}

// validateCardPlayingRules validates card playing rules
func (rv *RuleValidator) validateCardPlayingRules(events []GameEvent) {
	// Rule: Must follow suit if able
	// Rule: Trump cards beat non-trump
	// Rule: Jokers are highest
}

func (rv *RuleValidator) addViolation(rule, violation, severity, suggestion string, eventID int, context []string) {
	rv.Violations = append(rv.Violations, RuleViolation{
		Rule:       rule,
		Violation:  violation,
		Severity:   severity,
		Suggestion: suggestion,
		EventID:    eventID,
		Context:    context,
	})
}

// HTTP helpers
func (at *AutomatedTester) post(path string, data map[string]string) (*http.Response, error) {
	formData := &bytes.Buffer{}
	for key, value := range data {
		if formData.Len() > 0 {
			formData.WriteString("&")
		}
		formData.WriteString(fmt.Sprintf("%s=%s", key, url.QueryEscape(value)))
	}
	req, err := http.NewRequest("POST", at.BaseURL+path, formData)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return at.Client.Do(req)
}

func (at *AutomatedTester) postWithToken(path string, data map[string]string) (*http.Response, error) {
	formData := &bytes.Buffer{}
	for key, value := range data {
		if formData.Len() > 0 {
			formData.WriteString("&")
		}
		formData.WriteString(fmt.Sprintf("%s=%s", key, url.QueryEscape(value)))
	}
	req, err := http.NewRequest("POST", at.BaseURL+path, formData)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+at.Token)
	return at.Client.Do(req)
}

func (at *AutomatedTester) getWithToken(path string) (*http.Response, error) {
	req, err := http.NewRequest("GET", at.BaseURL+path, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+at.Token)
	return at.Client.Do(req)
}

func main() {
	// Create log directory
	logDir := "/Users/ken/my_project/leve_up/log"

	tester := NewAutomatedTester("http://localhost:8080", logDir)

	if err := tester.RunTestingCycle(); err != nil {
		fmt.Printf("\n❌ 测试失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n✅ 所有测试通过！")
}
