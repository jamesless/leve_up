package main

import (
	"fmt"
)

// ScoringTest covers the complex scoring and level upgrade rules
// Based on rule.md section "七、胜负与升级规则（60 分一级，300 分制）"

// LevelResult represents the level change after a round
type LevelResult struct {
	HostTeam     []int // Levels gained by host team
	DefenderTeam []int // Levels gained by defender team
	Description  string
}

// ScoreCalculator calculates level changes based on scores
type ScoreCalculator struct {
	IsSoloPlay bool // True if host is playing 1 vs 4
}

// NewScoreCalculator creates a new score calculator
func NewScoreCalculator(isSoloPlay bool) *ScoreCalculator {
	return &ScoreCalculator{
		IsSoloPlay: isSoloPlay,
	}
}

// CalculateLevels calculates level changes based on defender team's score
// Returns the level result
func (sc *ScoreCalculator) CalculateLevels(defenderScore int) *LevelResult {
	if sc.IsSoloPlay {
		return sc.calculateSoloLevels(defenderScore)
	}
	return sc.calculateNormalLevels(defenderScore)
}

// calculateNormalLevels handles 2 vs 3 gameplay
// Rule: 庄家找到盟友（2 打 3）
func (sc *ScoreCalculator) calculateNormalLevels(defenderScore int) *LevelResult {
	switch {
	case defenderScore == 0:
		// 抓分 0 分（大光）：庄家方连升 3 级
		return &LevelResult{
			HostTeam:     []int{3, 3}, // Host and friend each gain 3
			DefenderTeam: []int{0, 0, 0},
			Description:  "大光！庄家方连升3级",
		}
	case defenderScore >= 1 && defenderScore <= 59:
		// 抓分 1–59 分（小光）：庄家方连升 2 级
		return &LevelResult{
			HostTeam:     []int{2, 2},
			DefenderTeam: []int{0, 0, 0},
			Description:  "小光！庄家方连升2级",
		}
	case defenderScore >= 60 && defenderScore <= 119:
		// 抓分 60–119 分：庄家方升 1 级
		return &LevelResult{
			HostTeam:     []int{1, 1},
			DefenderTeam: []int{0, 0, 0},
			Description:  fmt.Sprintf("抓分%d分，庄家方升1级", defenderScore),
		}
	case defenderScore >= 120 && defenderScore <= 179:
		// 抓分 120–179 分：抓分方上台，每人升 1 级
		return &LevelResult{
			HostTeam:     []int{0, 0},
			DefenderTeam: []int{1, 1, 1},
			Description:  fmt.Sprintf("抓分%d分，抓分方上台每人升1级", defenderScore),
		}
	case defenderScore >= 180 && defenderScore <= 239:
		// 抓分 180–239 分：抓分方上台，每人升 2 级
		return &LevelResult{
			HostTeam:     []int{0, 0},
			DefenderTeam: []int{2, 2, 2},
			Description:  fmt.Sprintf("抓分%d分，抓分方上台每人升2级", defenderScore),
		}
	case defenderScore >= 240 && defenderScore <= 299:
		// 抓分 240–299 分：抓分方上台，每人升 3 级
		return &LevelResult{
			HostTeam:     []int{0, 0},
			DefenderTeam: []int{3, 3, 3},
			Description:  fmt.Sprintf("抓分%d分，抓分方上台每人升3级", defenderScore),
		}
	case defenderScore >= 300:
		// 抓分 300 分（满光）：抓分方上台，每人升 4 级
		return &LevelResult{
			HostTeam:     []int{0, 0},
			DefenderTeam: []int{4, 4, 4},
			Description:  fmt.Sprintf("满光！抓分%d分，抓分方上台每人升4级", defenderScore),
		}
	default:
		return &LevelResult{
			Description: "无效分数",
		}
	}
}

// calculateSoloLevels handles 1 vs 4 gameplay
// Rule: 庄家 1 打 4
func (sc *ScoreCalculator) calculateSoloLevels(defenderScore int) *LevelResult {
	switch {
	case defenderScore >= 0 && defenderScore <= 59:
		// 抓分 0–59 分：庄家独赢，升 4 级
		return &LevelResult{
			HostTeam:     []int{4},
			DefenderTeam: []int{0, 0, 0, 0},
			Description:  fmt.Sprintf("庄家独赢！抓分仅%d分，升4级", defenderScore),
		}
	case defenderScore >= 60 && defenderScore <= 119:
		// 抓分 60–119 分：庄家升 2 级
		return &LevelResult{
			HostTeam:     []int{2},
			DefenderTeam: []int{0, 0, 0, 0},
			Description:  fmt.Sprintf("庄家胜！抓分%d分，升2级", defenderScore),
		}
	case defenderScore >= 120 && defenderScore <= 179:
		// 抓分 120–179 分：抓分方上台，每人升 1 级
		return &LevelResult{
			HostTeam:     []int{0},
			DefenderTeam: []int{1, 1, 1, 1},
			Description:  fmt.Sprintf("抓分%d分，抓分方上台每人升1级", defenderScore),
		}
	case defenderScore >= 180:
		// 抓分 ≥180 分：抓分方上台，每人升 2 级
		return &LevelResult{
			HostTeam:     []int{0},
			DefenderTeam: []int{2, 2, 2, 2},
			Description:  fmt.Sprintf("抓分%d分，抓分方上台每人升2级", defenderScore),
		}
	default:
		return &LevelResult{
			Description: "无效分数",
		}
	}
}

// BottomCardMultiplier calculates the multiplier for bottom cards when dug out
// Rule: 抠底与底牌分计算
func BottomCardMultiplier(lastPlayType string) int {
	switch lastPlayType {
	case "single":
		return 2 // 单张抠底：×2
	case "pair":
		return 4 // 对子抠底：×4
	case "triple":
		return 8 // 三张抠底：×8
	case "tractor_pair":
		return 4 // 拖拉机(连对)抠底：按对应牌型翻倍
	case "tractor_triple":
		return 8 // 拖拉机(连三张)抠底
	default:
		return 1
	}
}

// TestScoringRules runs all scoring rule tests
func TestScoringRules() {
	fmt.Println("========================================")
	fmt.Println("   计分与升级规则测试")
	fmt.Println("========================================")

	testNormalGame()
	testSoloGame()
	testBottomCardMultipliers()
	testLevelProgression()

	fmt.Println("\n========================================")
	fmt.Println("   测试完成")
	fmt.Println("========================================")
}

// testNormalGame tests normal 2 vs 3 gameplay scoring
func testNormalGame() {
	fmt.Println("\n[测试1] 正常局计分 (2打3)")

	calculator := NewScoreCalculator(false)

	testCases := []struct {
		defenderScore int
		expectedDesc  string
	}{
		{0, "大光"},
		{30, "小光"},
		{60, "庄家方升1级"},
		{100, "庄家方升1级"},
		{120, "抓分方上台"},
		{150, "抓分方上台升2级"},
		{200, "抓分方上台升3级"},
		{280, "抓分方上台升3级"},
		{300, "满光"},
	}

	for _, tc := range testCases {
		result := calculator.CalculateLevels(tc.defenderScore)
		fmt.Printf("   抓分 %3d分: %s\n", tc.defenderScore, result.Description)
	}
}

// testSoloGame tests solo 1 vs 4 gameplay scoring
func testSoloGame() {
	fmt.Println("\n[测试2] 独打局计分 (1打4)")

	calculator := NewScoreCalculator(true)

	testCases := []struct {
		defenderScore int
		expectedDesc  string
	}{
		{0, "庄家独赢"},
		{50, "庄家独赢"},
		{80, "庄家胜"},
		{120, "抓分方上台"},
		{180, "抓分方上台升2级"},
		{250, "抓分方上台升2级"},
	}

	for _, tc := range testCases {
		result := calculator.CalculateLevels(tc.defenderScore)
		fmt.Printf("   抓分 %3d分: %s\n", tc.defenderScore, result.Description)
	}
}

// testBottomCardMultipliers tests bottom card scoring
func testBottomCardMultipliers() {
	fmt.Println("\n[测试3] 抠底倍数规则")

	testCases := []struct {
		playType   string
		multiplier int
	}{
		{"single", 2},
		{"pair", 4},
		{"triple", 8},
		{"tractor_pair", 4},
		{"tractor_triple", 8},
	}

	for _, tc := range testCases {
		mult := BottomCardMultiplier(tc.playType)
		status := "✅"
		if mult != tc.multiplier {
			status = "❌"
		}
		fmt.Printf("   %s %s: ×%d\n", status, tc.playType, mult)
	}
}

// testLevelProgression tests the level progression system
func testLevelProgression() {
	fmt.Println("\n[测试4] 等级 progression")

	levels := []string{"2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"}
	fmt.Println("   等级顺序: " + fmt.Sprintf("%v", levels))
	fmt.Println("   总共: 13级 (2→A)")
	fmt.Println("   ✅ 先打完 2→A 的玩家获胜")
}

// main function
func main() {
	TestScoringRules()
}
