package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// RuleValidator performs detailed rule validation
type RuleValidator struct {
	Rules        []GameRule
	Violations   []RuleViolation
	ScoringRules *ScoringRules
}

type GameRule struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"` // dealing, playing, scoring, general
}

type ScoringRules struct {
	ScoringCards map[string]int // 5=5, 10=10, K=10
	Levels       []string       // 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A
}

// Card represents a playing card
type Card struct {
	Suit  string `json:"suit"`
	Value string `json:"value"`
	Type  string `json:"type"`
}

// PlayedCard represents a card played in a trick
type PlayedCard struct {
	Seat int  `json:"seat"`
	Card Card `json:"card"`
}

// NewRuleValidator creates a new rule validator
func NewRuleValidator() *RuleValidator {
	rv := &RuleValidator{
		Rules:      make([]GameRule, 0),
		Violations: make([]RuleViolation, 0),
		ScoringRules: &ScoringRules{
			ScoringCards: map[string]int{
				"5":  5,
				"10": 10,
				"K":  10,
			},
			Levels: []string{"2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"},
		},
	}

	rv.initializeRules()
	return rv
}

// initializeRules sets up all game rules
func (rv *RuleValidator) initializeRules() {
	// 发牌规则
	rv.Rules = append(rv.Rules, GameRule{
		Name:        "发牌数量",
		Description: "5个玩家，每人31张牌，底牌7张，总计162张（3副牌）",
		Category:    "dealing",
	})

	rv.Rules = append(rv.Rules, GameRule{
		Name:        "主牌设置",
		Description: "发牌后必须设置主牌花色",
		Category:    "dealing",
	})

	// 出牌规则
	rv.Rules = append(rv.Rules, GameRule{
		Name:        "出牌顺序",
		Description: "玩家按顺时针顺序出牌 (1→2→3→4→5→1)",
		Category:    "playing",
	})

	rv.Rules = append(rv.Rules, GameRule{
		Name:        "跟牌规则",
		Description: "必须跟首家花色，如果没有该花色可以垫牌或毙牌",
		Category:    "playing",
	})

	rv.Rules = append(rv.Rules, GameRule{
		Name:        "牌型支持",
		Description: "支持: 单张、对子、三张、拖拉机、甩牌",
		Category:    "playing",
	})

	rv.Rules = append(rv.Rules, GameRule{
		Name:        "甩牌规则",
		Description: "甩牌需保证同花色组合最大，否则按最小单张算",
		Category:    "playing",
	})

	rv.Rules = append(rv.Rules, GameRule{
		Name:        "主牌比副牌",
		Description: "主牌可以毙副牌",
		Category:    "playing",
	})

	rv.Rules = append(rv.Rules, GameRule{
		Name:        "王牌最大",
		Description: "大王 > 小王 > 主牌 > 副牌",
		Category:    "playing",
	})

	// 计分规则
	rv.Rules = append(rv.Rules, GameRule{
		Name:        "分牌",
		Description: "5=5分, 10=10分, K=10分，总计300分",
		Category:    "scoring",
	})

	rv.Rules = append(rv.Rules, GameRule{
		Name:        "抠底倍数",
		Description: "单张抠底×2，对子×4，三张×8",
		Category:    "scoring",
	})

	// 升级规则
	rv.Rules = append(rv.Rules, GameRule{
		Name:        "正常局升级 (2打3)",
		Description: "0分=庄家方升3级, 1-59分=升2级, 60-119分=升1级, 120-179分=抓分方上台升1级, 180-239分=升2级, 240-299分=升3级, 300分=升4级",
		Category:    "scoring",
	})

	rv.Rules = append(rv.Rules, GameRule{
		Name:        "独打局升级 (1打4)",
		Description: "0-59分=庄家升4级, 60-119分=升2级, 120-179分=抓分方上台升1级, ≥180分=升2级",
		Category:    "scoring",
	})
}

// ValidateGameLogs validates game events against rules
func (rv *RuleValidator) ValidateGameLogs(events []GameEvent) []RuleViolation {
	rv.Violations = make([]RuleViolation, 0)

	// Group events by game
	gameEvents := rv.groupEventsByGame(events)

	for gameID, gameEvents := range gameEvents {
		rv.validateSingleGame(gameID, gameEvents)
	}

	return rv.Violations
}

// GameEvent represents a logged game event
type GameEvent struct {
	Timestamp  string                 `json:"timestamp"`
	GameID     string                 `json:"gameId"`
	EventType  string                 `json:"eventType"`
	PlayerID   string                 `json:"playerId"`
	PlayerSeat int                    `json:"playerSeat"`
	Card       Card                   `json:"card,omitempty"`
	Cards      []Card                 `json:"cards,omitempty"`
	Trick      []PlayedCard           `json:"trick,omitempty"`
	Scores     map[string]int         `json:"scores,omitempty"`
	Winner     int                    `json:"winner,omitempty"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

// groupEventsByGame groups events by game ID
func (rv *RuleValidator) groupEventsByGame(events []GameEvent) map[string][]GameEvent {
	result := make(map[string][]GameEvent)
	for _, event := range events {
		result[event.GameID] = append(result[event.GameID], event)
	}
	return result
}

// validateSingleGame validates a single game's events
func (rv *RuleValidator) validateSingleGame(gameID string, events []GameEvent) {
	// Validate deal
	rv.validateDeal(gameID, events)

	// Validate turn order
	rv.validateTurnOrder(gameID, events)

	// Validate card playing
	rv.validateCardPlaying(gameID, events)

	// Validate scoring
	rv.validateScoring(gameID, events)

	// Validate game completion
	rv.validateGameCompletion(gameID, events)
}

// validateDeal validates the dealing phase
func (rv *RuleValidator) validateDeal(gameID string, events []GameEvent) {
	for _, event := range events {
		if event.EventType == "deal" {
			// Check trump suit is set
			if trumpSuit, ok := event.Metadata["trumpSuit"].(string); ok {
				if trumpSuit == "" {
					rv.addViolation("发牌规则", "主牌设置", "发牌后未设置主牌花色", "error",
						"确保在发牌逻辑中正确设置主牌花色", []string{
							fmt.Sprintf("GameID: %s", gameID),
							"期望: trumpSuit 不为空",
							fmt.Sprintf("实际: trumpSuit = '%s'", trumpSuit),
						})
				}
			} else {
				rv.addViolation("发牌规则", "主牌设置", "发牌后未设置主牌花色", "error",
					"确保在发牌逻辑中正确设置主牌花色", []string{
						fmt.Sprintf("GameID: %s", gameID),
						"Metadata中缺少trumpSuit字段",
					})
			}

			// Check card counts (if available in metadata)
			if totalCards, ok := event.Metadata["totalCards"].(float64); ok {
				if totalCards != 162 {
					rv.addViolation("发牌规则", "发牌数量", "总牌数不正确", "error",
						"确保发牌逻辑正确分配162张牌", []string{
							fmt.Sprintf("GameID: %s", gameID),
							"期望: 162张",
							fmt.Sprintf("实际: %.0f张", totalCards),
						})
				}
			}
		}
	}
}

// validateTurnOrder validates that players play in correct order
func (rv *RuleValidator) validateTurnOrder(gameID string, events []GameEvent) {
	playEvents := make([]GameEvent, 0)
	for _, event := range events {
		if event.EventType == "play" {
			playEvents = append(playEvents, event)
		}
	}

	// Check if plays follow clockwise order (1,2,3,4,5,1,2,...)
	for i := 1; i < len(playEvents); i++ {
		prevSeat := playEvents[i-1].PlayerSeat
		currSeat := playEvents[i].PlayerSeat

		// Calculate expected next seat
		expectedSeat := prevSeat%5 + 1

		if currSeat != expectedSeat {
			// This might be a new trick, so check if there's a trick_end event
			// For now, we'll be lenient and just warn
			rv.addViolation("出牌规则", "出牌顺序", "出牌顺序可能不正确", "warning",
				"检查出牌逻辑，确保按顺时针顺序", []string{
					fmt.Sprintf("GameID: %s", gameID),
					fmt.Sprintf("期望位置: %d", expectedSeat),
					fmt.Sprintf("实际位置: %d", currSeat),
				})
		}
	}
}

// validateCardPlaying validates card playing rules
func (rv *RuleValidator) validateCardPlaying(gameID string, events []GameEvent) {
	// Check if players follow suit when they can
	// This requires analyzing trick data

	tricks := make([][]PlayedCard, 0)
	for _, event := range events {
		if event.EventType == "trick_end" && len(event.Trick) > 0 {
			tricks = append(tricks, event.Trick)
		}
	}

	for _, trick := range tricks {
		if len(trick) < 2 {
			continue
		}

		leadSuit := trick[0].Card.Suit

		// Check if following players follow suit
		for i := 1; i < len(trick); i++ {
			playerCard := trick[i]

			// If player played a different suit, check if they had the lead suit
			// This information would need to be in the logs
			if playerCard.Card.Suit != leadSuit {
				// We can't fully validate without knowing the player's hand
				// But we can note this for review
				rv.addViolation("出牌规则", "跟牌规则", "玩家可能未跟首家花色", "info",
					"检查玩家手牌，确认是否确实无该花色", []string{
						fmt.Sprintf("GameID: %s", gameID),
						fmt.Sprintf("首家花色: %s", leadSuit),
						fmt.Sprintf("位置 %d 出牌: %s%s", playerCard.Seat, playerCard.Card.Suit, playerCard.Card.Value),
					})
			}
		}
	}
}

// validateScoring validates scoring rules
func (rv *RuleValidator) validateScoring(gameID string, events []GameEvent) {
	// Check if scoring cards (5, 10, K) are correctly counted
	// This requires detailed trick analysis

	totalScore := 0
	for _, event := range events {
		if event.EventType == "trick_end" {
			// Calculate scoring cards in this trick
			for _, played := range event.Trick {
				if points, ok := rv.ScoringRules.ScoringCards[played.Card.Value]; ok {
					totalScore += points
				}
			}
		}
	}

	// Check if total score is 300
	if totalScore > 0 && totalScore != 300 {
		rv.addViolation("计分规则", "总分", "总分不等于300", "error",
			"检查分牌计算逻辑", []string{
				fmt.Sprintf("GameID: %s", gameID),
				"期望: 300分",
				fmt.Sprintf("实际: %d分", totalScore),
			})
	}
}

// validateGameCompletion validates that the game completed properly
func (rv *RuleValidator) validateGameCompletion(gameID string, events []GameEvent) {
	hasDeal := false
	hasGameEnd := false

	for _, event := range events {
		if event.EventType == "deal" {
			hasDeal = true
		}
		if event.EventType == "game_end" {
			hasGameEnd = true
		}
	}

	if !hasDeal {
		rv.addViolation("游戏流程", "发牌", "游戏未发牌", "error",
			"确保游戏正确启动并发牌", []string{
				fmt.Sprintf("GameID: %s", gameID),
				"缺少deal事件",
			})
	}

	if !hasGameEnd {
		rv.addViolation("游戏流程", "游戏结束", "游戏未正常结束", "error",
			"确保游戏能够完整进行到结束", []string{
				fmt.Sprintf("GameID: %s", gameID),
				"缺少game_end事件",
			})
	}
}

// RuleViolation represents a rule violation
type RuleViolation struct {
	Rule       string   `json:"rule"`
	Category   string   `json:"category"`
	Violation  string   `json:"violation"`
	Severity   string   `json:"severity"` // error, warning, info
	Suggestion string   `json:"suggestion,omitempty"`
	Context    []string `json:"context,omitempty"`
}

func (rv *RuleValidator) addViolation(category, rule, violation, severity, suggestion string, context []string) {
	rv.Violations = append(rv.Violations, RuleViolation{
		Category:   category,
		Rule:       rule,
		Violation:  violation,
		Severity:   severity,
		Suggestion: suggestion,
		Context:    context,
	})
}

// PrintReport prints a validation report
func (rv *RuleValidator) PrintReport() {
	fmt.Println("\n=========================================")
	fmt.Println("   规则验证报告")
	fmt.Println("=========================================")

	if len(rv.Violations) == 0 {
		fmt.Println("✅ 所有规则验证通过！")
		return
	}

	// Group violations by severity
	errors := make([]RuleViolation, 0)
	warnings := make([]RuleViolation, 0)
	infos := make([]RuleViolation, 0)

	for _, v := range rv.Violations {
		switch v.Severity {
		case "error":
			errors = append(errors, v)
		case "warning":
			warnings = append(warnings, v)
		case "info":
			infos = append(infos, v)
		}
	}

	fmt.Printf("\n📊 统计:\n")
	fmt.Printf("   错误: %d\n", len(errors))
	fmt.Printf("   警告: %d\n", len(warnings))
	fmt.Printf("   信息: %d\n", len(infos))

	if len(errors) > 0 {
		fmt.Println("\n❌ 错误:")
		for i, v := range errors {
			fmt.Printf("\n[%d] %s - %s\n", i+1, v.Category, v.Rule)
			fmt.Printf("    %s\n", v.Violation)
			if v.Suggestion != "" {
				fmt.Printf("    💡 建议: %s\n", v.Suggestion)
			}
			if len(v.Context) > 0 {
				fmt.Printf("    上下文:\n")
				for _, ctx := range v.Context {
					fmt.Printf("      - %s\n", ctx)
				}
			}
		}
	}

	if len(warnings) > 0 {
		fmt.Println("\n⚠️  警告:")
		for i, v := range warnings {
			fmt.Printf("\n[%d] %s - %s\n", i+1, v.Category, v.Rule)
			fmt.Printf("    %s\n", v.Violation)
			if v.Suggestion != "" {
				fmt.Printf("    💡 建议: %s\n", v.Suggestion)
			}
		}
	}

	if len(infos) > 0 {
		fmt.Println("\nℹ️  信息:")
		for i, v := range infos {
			fmt.Printf("[%d] %s - %s: %s\n", i+1, v.Category, v.Rule, v.Violation)
		}
	}
}

// LoadAndValidateLogs loads logs from a directory and validates them
func (rv *RuleValidator) LoadAndValidateLogs(logDir string) error {
	logFile := filepath.Join(logDir, "combined_log.jsonl")

	// Read log file
	data, err := os.ReadFile(logFile)
	if err != nil {
		return fmt.Errorf("读取日志文件失败: %w", err)
	}

	// Parse JSONL
	lines := strings.Split(string(data), "\n")
	events := make([]GameEvent, 0)

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		var event GameEvent
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			fmt.Printf("警告: 跳过无效行: %v\n", err)
			continue
		}

		events = append(events, event)
	}

	// Validate
	rv.Violations = rv.ValidateGameLogs(events)
	return nil
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("用法: go run rule_validator.go <日志目录>")
		fmt.Println("示例: go run rule_validator.go /Users/ken/my_project/leve_up/log/v1.20240101_120000")
		os.Exit(1)
	}

	logDir := os.Args[1]

	validator := NewRuleValidator()

	if err := validator.LoadAndValidateLogs(logDir); err != nil {
		fmt.Printf("❌ 验证失败: %v\n", err)
		os.Exit(1)
	}

	validator.PrintReport()

	// Exit with error code if there are any errors
	hasErrors := false
	for _, v := range validator.Violations {
		if v.Severity == "error" {
			hasErrors = true
			break
		}
	}

	if hasErrors {
		os.Exit(1)
	}
}
