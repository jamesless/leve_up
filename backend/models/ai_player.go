package models

import (
	"fmt"
	"sort"
)

// AIPlayer represents an AI player with decision-making capabilities
type AIPlayer struct {
	UserID     string
	SeatNumber int
	Hand       []Card
	IsFriend   bool
}

// CardStrength represents the strength of a card for AI decision making
type CardStrength struct {
	Card     Card
	Strength int
	IsLead   bool
}

// isTrumpCard checks if a card is a trump card
// Trump cards include: trump suit cards, rank cards (e.g. all 2s), and jokers
func isTrumpCard(card Card, trumpSuit string, trumpRank string) bool {
	// Jokers are always trump
	if card.Type == "joker" {
		return true
	}
	// Rank cards are trump (e.g. if playing 2, all 2s are trump)
	if card.Value == trumpRank {
		return true
	}
	// Trump suit cards are trump
	if card.Suit == trumpSuit {
		return true
	}
	return false
}

// isSameSuitForFollow checks if a card can follow the lead card
// In upgrade game, if lead is trump, all trump cards can follow
// If lead is non-trump, only same suit cards can follow
func isSameSuitForFollow(card Card, leadCard Card, trumpSuit string, trumpRank string) bool {
	leadIsTrump := isTrumpCard(leadCard, trumpSuit, trumpRank)
	cardIsTrump := isTrumpCard(card, trumpSuit, trumpRank)

	if leadIsTrump {
		// If lead is trump, card must be trump to follow
		return cardIsTrump
	} else {
		// If lead is not trump, card must have same suit (and not be trump)
		return card.Suit == leadCard.Suit && !cardIsTrump
	}
}

// DecidePlay decides which cards to play based on current game state
// Returns slice of card indices (can be multiple for pairs, triples, etc.)
func (ai *AIPlayer) DecidePlay(table *GameTable) []int {
	if len(ai.Hand) == 0 {
		return []int{}
	}

	// Single card left - play it
	if len(ai.Hand) == 1 {
		return []int{0}
	}

	var result []int

	// If leading (first to play in this trick)
	if len(table.CurrentTrick) == 0 {
		result = ai.decideLeadCards(table)
	} else {
		// If following, must follow suit if possible
		result = ai.decideFollowCards(table)
	}

	// Safety check: ensure result is valid
	if len(result) == 0 {
		// Emergency fallback - play lowest card
		return []int{ai.findLowestCard()}
	}

	// Validate indices
	for i, idx := range result {
		if idx < 0 || idx >= len(ai.Hand) {
			// Invalid index detected - use fallback
			fmt.Printf("WARNING: AI generated invalid card index %d (hand size: %d)\n", idx, len(ai.Hand))
			return []int{ai.findLowestCard()}
		}
		// Check for duplicates
		for j := i + 1; j < len(result); j++ {
			if result[j] == idx {
				fmt.Printf("WARNING: AI generated duplicate card index %d\n", idx)
				// Remove duplicate
				result = append(result[:j], result[j+1:]...)
				j--
			}
		}
	}

	// CRITICAL: Validate that selected cards form a valid card pattern
	// For pairs/triples, all cards must have same value and same suit
	if len(result) >= 2 {
		firstCard := ai.Hand[result[0]]
		allSame := true
		for _, idx := range result[1:] {
			card := ai.Hand[idx]
			if card.Value != firstCard.Value || card.Suit != firstCard.Suit {
				allSame = false
				break
			}
		}
		if !allSame && len(table.CurrentTrick) == 0 {
			// When leading, if cards don't form a valid pair/triple, just play one card
			fmt.Printf("WARNING: AI selected cards that don't form valid pair/triple, falling back to single card\n")
			return []int{result[0]}
		}
	}

	// If following, ensure we have the right number of cards
	if len(table.CurrentTrick) > 0 {
		leadSeat := table.CurrentTrick[0].Seat
		leadCount := 0
		for _, pc := range table.CurrentTrick {
			if pc.Seat == leadSeat {
				leadCount++
			} else {
				break
			}
		}

		if len(result) != leadCount {
			fmt.Printf("WARNING: AI returned %d cards but should return %d cards\n", len(result), leadCount)
			// If we have too many cards, remove extras
			if len(result) > leadCount {
				result = result[:leadCount]
			}
			// If we have too few cards, it means we don't have enough of the correct suit
			// Just return what we have - the game validation will handle this
		}
	}

	return result
}

// decideLeadCards chooses cards when leading a trick
// 策略：优先出自己手上最大的牌
// 优先级：拖拉机 > 三张 > 对子 > A单张
func (ai *AIPlayer) decideLeadCards(table *GameTable) []int {
	// 1. 优先尝试甩牌（如果能成功甩出大牌）
	if throwIndices := ai.tryThrowCards(table); len(throwIndices) > 0 {
		return throwIndices
	}

	// 2. 找拖拉机（连对）- 最高优先级
	if tractorIndices := ai.findStrongestTractor(table); len(tractorIndices) > 0 {
		return tractorIndices
	}

	// 3. 找三张
	if tripleIndices := ai.findStrongestTriple(table); len(tripleIndices) > 0 {
		return tripleIndices
	}

	// 4. 找对子（按强度排序）
	if pairIndices := ai.findStrongestPair(table); len(pairIndices) > 0 {
		return pairIndices
	}

	// 5. 出A级别的单张
	if aceIndices := ai.findStrongestSingle(table); len(aceIndices) > 0 {
		return aceIndices
	}

	// 6. 保底：出最小的牌
	lowestIdx := ai.findLowestCard()
	return []int{lowestIdx}
}

// findStrongestTractor finds the strongest tractor (连对) to lead with
// 拖拉机定义：两对或以上相同花色、连续点数的对子
func (ai *AIPlayer) findStrongestTractor(table *GameTable) []int {
	// 按花色分组
	suitCards := make(map[string][]Card)
	for _, card := range ai.Hand {
		suitCards[card.Suit] = append(suitCards[card.Suit], card)
	}

	// 遍历每个花色找拖拉机
	var bestTractor []int
	bestStrength := -1

	for suit := range suitCards {
		// 跳过主牌花色（用主牌打拖拉机太浪费）
		if suit == table.TrumpSuit {
			continue
		}

		// 按点数分组找对子
		valuePairs := make(map[string][]int) // 点数 -> 手牌索引
		for i, card := range ai.Hand {
			if card.Suit == suit {
				valuePairs[card.Value] = append(valuePairs[card.Value], i)
			}
		}

		// 提取有对子的点数
		var pairValues []string
		for value, indices := range valuePairs {
			if len(indices) >= 2 {
				pairValues = append(pairValues, value)
			}
		}

		if len(pairValues) < 2 {
			continue // 至少需要两对对子才能组成拖拉机
		}

		// 按点数排序（从大到小）
		sort.Slice(pairValues, func(i, j int) bool {
			return getCardValueInt(pairValues[i]) > getCardValueInt(pairValues[j])
		})

		// 找最长、最强的拖拉机
		for start := 0; start < len(pairValues)-1; start++ {
			// 找连续的对子
			var tractorValues []string
			tractorValues = append(tractorValues, pairValues[start])
			prevValue := pairValues[start]

			for next := start + 1; next < len(pairValues); next++ {
				if isConsecutiveValue(prevValue, pairValues[next]) {
					tractorValues = append(tractorValues, pairValues[next])
					prevValue = pairValues[next]
				} else {
					break
				}
			}

			// 至少需要2对才能组成拖拉机
			if len(tractorValues) >= 2 {
				// 计算拖拉机强度（使用最大对子的点数）
				strength := getCardValueInt(tractorValues[0])
				if strength > bestStrength {
					// 收集所有对子的牌索引
					var indices []int
					for _, value := range tractorValues {
						indices = append(indices, valuePairs[value][:2]...)
					}
					bestTractor = indices
					bestStrength = strength
				}
			}
		}
	}

	return bestTractor
}

// isConsecutiveValue checks if two card values are consecutive
func isConsecutiveValue(v1, v2 string) bool {
	val1 := getCardValueInt(v1)
	val2 := getCardValueInt(v2)
	diff := val1 - val2
	if diff < 0 {
		diff = -diff
	}
	return diff == 1
}

// findStrongestTriple finds the strongest triple (三张) to lead with
func (ai *AIPlayer) findStrongestTriple(table *GameTable) []int {
	// Count cards by suit and value
	type CardKey struct {
		suit  string
		value string
	}
	cardGroups := make(map[CardKey][]int)

	for i, card := range ai.Hand {
		key := CardKey{suit: card.Suit, value: card.Value}
		cardGroups[key] = append(cardGroups[key], i)
	}

	var bestTriple []int
	bestStrength := -1

	// Find triples (priority over pairs)
	for _, indices := range cardGroups {
		if len(indices) >= 3 {
			// 跳过主牌花色的三张（用主牌打出去太浪费）
			suit := ai.Hand[indices[0]].Suit
			if suit == table.TrumpSuit {
				continue
			}
			strength := getCardValueInt(ai.Hand[indices[0]].Value)
			if strength > bestStrength {
				bestTriple = indices[:3]
				bestStrength = strength
			}
		}
	}

	return bestTriple
}

// findStrongestPair finds the strongest pair to lead with
func (ai *AIPlayer) findStrongestPair(table *GameTable) []int {
	// Count cards by suit and value
	type CardKey struct {
		suit  string
		value string
	}
	cardGroups := make(map[CardKey][]int)

	for i, card := range ai.Hand {
		key := CardKey{suit: card.Suit, value: card.Value}
		cardGroups[key] = append(cardGroups[key], i)
	}

	var bestPair []int
	bestStrength := -1

	// Find pairs
	for _, indices := range cardGroups {
		if len(indices) >= 2 {
			// 跳过主牌花色的对子
			suit := ai.Hand[indices[0]].Suit
			if suit == table.TrumpSuit {
				continue
			}
			strength := getCardValueInt(ai.Hand[indices[0]].Value)
			if strength > bestStrength {
				bestPair = indices[:2]
				bestStrength = strength
			}
		}
	}

	return bestPair
}

// findStrongestSingle finds the strongest single card (A or high card) to lead with
func (ai *AIPlayer) findStrongestSingle(table *GameTable) []int {
	// Find Aces and high cards
	var candidates []int
	for i, card := range ai.Hand {
		// 跳过主牌
		if card.Suit == table.TrumpSuit {
			continue
		}
		// 只考虑A、K、Q、J、10这些大牌
		strength := getCardValueInt(card.Value)
		if strength >= 10 {
			candidates = append(candidates, i)
		}
	}

	if len(candidates) > 0 {
		// 按强度降序排列
		sort.Slice(candidates, func(i, j int) bool {
			return getCardValueInt(ai.Hand[candidates[i]].Value) > getCardValueInt(ai.Hand[candidates[j]].Value)
		})
		return []int{candidates[0]}
	}

	return nil
}

// getCardValueInt returns numeric value for card comparison
func getCardValueInt(value string) int {
	values := map[string]int{
		"2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
		"10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
	}
	if val, ok := values[value]; ok {
		return val
	}
	return 0
}

// tryThrowCards attempts to find a valid throw (甩牌)
// 优先甩大牌：如果有多个花色可以甩，选择最强的大牌
func (ai *AIPlayer) tryThrowCards(table *GameTable) []int {
	// Group cards by suit
	suitCards := make(map[string][]int)
	for i, card := range ai.Hand {
		suitCards[card.Suit] = append(suitCards[card.Suit], i)
	}

	var bestThrow []int
	bestStrength := -1

	// For each suit, check if we can throw
	for suit, indices := range suitCards {
		if len(indices) < 2 {
			continue // Need at least 2 cards to throw
		}

		// Skip trump suit for throwing (trump is too valuable)
		if suit == table.TrumpSuit {
			continue
		}

		// Get the cards
		var cards []Card
		for _, idx := range indices {
			cards = append(cards, ai.Hand[idx])
		}

		// Validate throw
		result := ValidateThrowCards(cards, table, ai.SeatNumber)
		if result.IsValid {
			// 计算该花色的最大牌强度
			maxStrength := 0
			for _, idx := range indices {
				strength := getCardValueInt(ai.Hand[idx].Value)
				if strength > maxStrength {
					maxStrength = strength
				}
			}

			// 选择强度最大的甩牌
			if maxStrength > bestStrength {
				bestStrength = maxStrength
				bestThrow = indices
			}
		}
	}

	return bestThrow
}

// decideFollowCards chooses cards when following a lead
// Must respect the lead card type (pair, triple, etc.)
func (ai *AIPlayer) decideFollowCards(table *GameTable) []int {
	leadCard := table.CurrentTrick[0].Card
	leadSuit := leadCard.Suit
	trumpSuit := table.TrumpSuit
	trumpRank := table.TrumpRank

	// Count how many cards the leader played
	leadSeat := table.CurrentTrick[0].Seat
	var leadCards []Card
	for _, pc := range table.CurrentTrick {
		if pc.Seat == leadSeat {
			leadCards = append(leadCards, pc.Card)
		} else {
			break
		}
	}
	leadCount := len(leadCards)

	// Determine lead play type
	isLeadPair := leadCount == 2 && leadCards[0].Value == leadCards[1].Value && leadCards[0].Suit == leadCards[1].Suit
	isLeadTriple := leadCount == 3 && leadCards[0].Value == leadCards[1].Value && leadCards[1].Value == leadCards[2].Value && leadCards[0].Suit == leadCards[1].Suit && leadCards[1].Suit == leadCards[2].Suit

	// Check if lead card is trump
	leadIsTrump := isTrumpCard(leadCard, trumpSuit, trumpRank)

	// Find cards that can follow the lead
	var followCards []int
	for i, card := range ai.Hand {
		if isSameSuitForFollow(card, leadCard, trumpSuit, trumpRank) {
			followCards = append(followCards, i)
		}
	}

	// If we can follow suit
	if len(followCards) > 0 {
		// Determine the effective suit for finding pairs/triples
		effectiveSuit := leadSuit
		if leadIsTrump {
			// For trump, we need to consider all trump cards
			effectiveSuit = trumpSuit
		}
		return ai.decideFollowWithSuit(table, followCards, leadCount, isLeadPair, isLeadTriple, effectiveSuit)
	}

	// Can't follow suit - decide to trump or discard
	return ai.decideCantFollow(table, leadSuit, trumpSuit, leadCount, isLeadPair, isLeadTriple)
}

// decideFollowWithSuit decides which cards to play when we have the lead suit
func (ai *AIPlayer) decideFollowWithSuit(table *GameTable, followCards []int, leadCount int, isLeadPair bool, isLeadTriple bool, leadSuit string) []int {
	// Try to match the lead card type
	if isLeadPair {
		// Try to find a pair in the lead suit
		if pairIndices := ai.findPairInSuit(leadSuit); len(pairIndices) >= 2 {
			return pairIndices[:2]
		}
		// Cannot match pair type - must play 2 lowest cards of lead suit
		if len(followCards) >= 2 {
			sort.Slice(followCards, func(i, j int) bool {
				return getCardBaseValue(ai.Hand[followCards[i]]) < getCardBaseValue(ai.Hand[followCards[j]])
			})
			return followCards[:2]
		}
		// Not enough cards of lead suit for a pair - play what we have and fill with other cards
		// This should not happen if validation is correct, but handle it as safety
		if len(followCards) == 1 {
			return followCards
		}
	}

	if isLeadTriple {
		// Try to find a triple in the lead suit
		if tripleIndices := ai.findTripleInSuit(leadSuit); len(tripleIndices) >= 3 {
			return tripleIndices[:3]
		}
		// Cannot match triple type - must play 3 lowest cards of lead suit
		if len(followCards) >= 3 {
			sort.Slice(followCards, func(i, j int) bool {
				return getCardBaseValue(ai.Hand[followCards[i]]) < getCardBaseValue(ai.Hand[followCards[j]])
			})
			return followCards[:3]
		}
		// Not enough cards of lead suit for a triple - play what we have
		if len(followCards) > 0 {
			return followCards
		}
	}

	// Can't match the exact type, play leadCount cards from the suit
	// If we have enough cards in the suit, use them
	if len(followCards) >= leadCount {
		// Sort follow cards by strength (ascending - play lowest)
		sort.Slice(followCards, func(i, j int) bool {
			return getCardBaseValue(ai.Hand[followCards[i]]) < getCardBaseValue(ai.Hand[followCards[j]])
		})
		return followCards[:leadCount]
	}

	// Not enough cards in the suit - this means we can't properly follow
	// This should not happen if the validation is correct
	// Return all cards we have of this suit as fallback
	fmt.Printf("WARNING: AI has only %d cards of suit %s but needs %d cards\n", len(followCards), leadSuit, leadCount)
	return followCards
}

// findPairInSuit finds a pair in the specified suit
func (ai *AIPlayer) findPairInSuit(suit string) []int {
	// Count cards by value in the suit
	valueIndices := make(map[string][]int)
	for i, card := range ai.Hand {
		if card.Suit == suit {
			valueIndices[card.Value] = append(valueIndices[card.Value], i)
		}
	}

	// Find pairs
	for _, indices := range valueIndices {
		if len(indices) >= 2 {
			return indices[:2]
		}
	}
	return nil
}

// findTripleInSuit finds a triple in the specified suit
func (ai *AIPlayer) findTripleInSuit(suit string) []int {
	// Count cards by value in the suit
	valueIndices := make(map[string][]int)
	for i, card := range ai.Hand {
		if card.Suit == suit {
			valueIndices[card.Value] = append(valueIndices[card.Value], i)
		}
	}

	// Find triples
	for _, indices := range valueIndices {
		if len(indices) >= 3 {
			return indices[:3]
		}
	}
	return nil
}

// findLowestNonSuitCards finds the lowest N cards not in the specified suit
func (ai *AIPlayer) findLowestNonSuitCards(excludeSuit string, count int) []int {
	var candidates []int
	for i, card := range ai.Hand {
		if card.Suit != excludeSuit {
			candidates = append(candidates, i)
		}
	}

	// Sort by value (ascending)
	sort.Slice(candidates, func(i, j int) bool {
		return getCardBaseValue(ai.Hand[candidates[i]]) < getCardBaseValue(ai.Hand[candidates[j]])
	})

	// Return lowest N cards (or all if not enough)
	if len(candidates) > count {
		return candidates[:count]
	}

	// If not enough non-suit cards, add some from the excluded suit
	if len(candidates) < count {
		for i, card := range ai.Hand {
			if card.Suit == excludeSuit {
				alreadyAdded := false
				for _, idx := range candidates {
					if idx == i {
						alreadyAdded = true
						break
					}
				}
				if !alreadyAdded {
					candidates = append(candidates, i)
					if len(candidates) >= count {
						break
					}
				}
			}
		}
	}

	return candidates
}

// decideCantFollow decides what to do when we can't follow suit
// Must play leadCount cards
func (ai *AIPlayer) decideCantFollow(table *GameTable, leadSuit, trumpSuit string, leadCount int, isLeadPair bool, isLeadTriple bool) []int {
	// Check if we should trump
	trumpCards := ai.getTrumpCards(trumpSuit)
	partnerWinning := ai.partnerIsWinning(table)

	// If partner is winning and not last player, discard low
	if partnerWinning && len(table.CurrentTrick) < 4 {
		return ai.discardLow(table, leadSuit, leadCount)
	}

	// If we have trump and want to win
	if len(trumpCards) > 0 && !partnerWinning {
		// Try to match the card type with trump
		if isLeadPair {
			// Try to use a trump pair
			if trumpPair := ai.findPairInSuit(trumpSuit); len(trumpPair) >= 2 {
				return trumpPair[:2]
			}
			// Cannot find trump pair - must play 2 lowest trump cards
			if len(trumpCards) >= 2 {
				sort.Slice(trumpCards, func(i, j int) bool {
					return getCardBaseValue(ai.Hand[trumpCards[i]]) < getCardBaseValue(ai.Hand[trumpCards[j]])
				})
				return trumpCards[:2]
			}
		}
		if isLeadTriple {
			// Try to use a trump triple
			if trumpTriple := ai.findTripleInSuit(trumpSuit); len(trumpTriple) >= 3 {
				return trumpTriple[:3]
			}
			// Cannot find trump triple - must play 3 lowest trump cards
			if len(trumpCards) >= 3 {
				sort.Slice(trumpCards, func(i, j int) bool {
					return getCardBaseValue(ai.Hand[trumpCards[i]]) < getCardBaseValue(ai.Hand[trumpCards[j]])
				})
				return trumpCards[:3]
			}
		}

		// Single card or other pattern - use lowest trumps
		if len(trumpCards) >= leadCount {
			// Use lowest N trump cards
			sort.Slice(trumpCards, func(i, j int) bool {
				return getCardBaseValue(ai.Hand[trumpCards[i]]) < getCardBaseValue(ai.Hand[trumpCards[j]])
			})
			return trumpCards[:leadCount]
		}

		// Not enough trumps, mix trump and discard
		result := make([]int, 0, leadCount)
		result = append(result, trumpCards...)
		remaining := leadCount - len(trumpCards)
		if remaining > 0 {
			discards := ai.findLowestNonTrumpCards(trumpSuit, remaining)
			result = append(result, discards...)
		}

		// Safety check - ensure we have exactly leadCount cards
		if len(result) < leadCount {
			result = ai.ensureCardCount(result, leadCount, leadSuit, trumpSuit)
		}
		return result
	}

	// Discard lowest non-scoring cards
	return ai.discardLow(table, leadSuit, leadCount)
}

// findLowestNonTrumpCards finds the lowest N cards that are not trump
func (ai *AIPlayer) findLowestNonTrumpCards(trumpSuit string, count int) []int {
	var candidates []int
	for i, card := range ai.Hand {
		if card.Suit != trumpSuit {
			candidates = append(candidates, i)
		}
	}

	// Sort by value (ascending)
	sort.Slice(candidates, func(i, j int) bool {
		return getCardBaseValue(ai.Hand[candidates[i]]) < getCardBaseValue(ai.Hand[candidates[j]])
	})

	// Return lowest N cards (or all if not enough)
	if len(candidates) > count {
		return candidates[:count]
	}

	// If not enough non-trump cards, add some trump cards as last resort
	if len(candidates) < count {
		for i, card := range ai.Hand {
			if card.Suit == trumpSuit {
				alreadyAdded := false
				for _, idx := range candidates {
					if idx == i {
						alreadyAdded = true
						break
					}
				}
				if !alreadyAdded {
					candidates = append(candidates, i)
					if len(candidates) >= count {
						break
					}
				}
			}
		}
	}

	return candidates
}

// partnerIsWinning checks if the AI's partner is currently winning the trick
func (ai *AIPlayer) partnerIsWinning(table *GameTable) bool {
	if len(table.CurrentTrick) == 0 {
		return false
	}

	// Check if we have a revealed friend
	if table.FriendRevealed && table.FriendSeat != ai.SeatNumber {
		// Check if friend is currently winning
		currentWinner := getCurrentWinnerSeat(table)
		return currentWinner == table.FriendSeat
	}

	// If friend not revealed, assume we're on defender team
	// and check if winner is not host
	currentWinner := getCurrentWinnerSeat(table)
	// Get host's seat number
	hostSeat := 1 // Default host is seat 1
	for seat, hand := range table.PlayerHands {
		if hand.UserID == table.HostID {
			hostSeat = seat
			break
		}
	}
	return currentWinner != hostSeat
}

// getCurrentWinner returns the current winner and their card strength
func getCurrentWinner(table *GameTable) (int, int) {
	if len(table.CurrentTrick) == 0 {
		return -1, 0
	}

	winnerSeat := table.CurrentTrick[0].Seat
	leadSuit := table.CurrentTrick[0].Card.Suit
	highestStrength := getCardValue(table.CurrentTrick[0].Card, leadSuit, table.TrumpSuit)

	for i := 1; i < len(table.CurrentTrick); i++ {
		pc := table.CurrentTrick[i]
		strength := getCardValue(pc.Card, leadSuit, table.TrumpSuit)
		if strength > highestStrength {
			highestStrength = strength
			winnerSeat = pc.Seat
		}
	}

	return winnerSeat, highestStrength
}

// getCurrentWinnerSeat returns the seat number of the current winner
func getCurrentWinnerSeat(table *GameTable) int {
	if len(table.CurrentTrick) == 0 {
		return -1
	}

	winnerSeat := table.CurrentTrick[0].Seat
	leadSuit := table.CurrentTrick[0].Card.Suit
	highestStrength := getCardValue(table.CurrentTrick[0].Card, leadSuit, table.TrumpSuit)

	for i := 1; i < len(table.CurrentTrick); i++ {
		pc := table.CurrentTrick[i]
		strength := getCardValue(pc.Card, leadSuit, table.TrumpSuit)
		if strength > highestStrength {
			highestStrength = strength
			winnerSeat = pc.Seat
		}
	}

	return winnerSeat
}

// findLowestCard finds the index of the lowest value card
func (ai *AIPlayer) findLowestCard() int {
	if len(ai.Hand) == 0 {
		return 0
	}

	lowestIdx := 0
	lowestValue := getCardBaseValue(ai.Hand[0])

	for i := 1; i < len(ai.Hand); i++ {
		value := getCardBaseValue(ai.Hand[i])
		if value < lowestValue {
			lowestValue = value
			lowestIdx = i
		}
	}

	return lowestIdx
}

// getTrumpCards returns indices of all trump cards in hand
func (ai *AIPlayer) getTrumpCards(trumpSuit string) []int {
	if trumpSuit == "" {
		return nil
	}

	var trumps []int
	for i, card := range ai.Hand {
		if card.Suit == trumpSuit {
			trumps = append(trumps, i)
		}
	}

	// Sort by value (lowest first)
	sort.Slice(trumps, func(i, j int) bool {
		return getCardBaseValue(ai.Hand[trumps[i]]) < getCardBaseValue(ai.Hand[trumps[j]])
	})

	return trumps
}

// discardLow finds low non-scoring cards to discard
// Returns count cards
func (ai *AIPlayer) discardLow(table *GameTable, leadSuit string, count int) []int {
	// Prefer to discard from short suits (that aren't trump)
	// Avoid discarding scoring cards (5, 10, K)

	suitCounts := make(map[string]int)
	for _, card := range ai.Hand {
		if card.Suit != table.TrumpSuit && card.Suit != leadSuit {
			suitCounts[card.Suit]++
		}
	}

	// Find shortest suit
	shortestSuit := ""
	minCount := 1000
	for suit, c := range suitCounts {
		if c > 0 && c < minCount {
			minCount = c
			shortestSuit = suit
		}
	}

	// Get non-scoring cards from shortest suit
	var candidates []int
	if shortestSuit != "" {
		for i, card := range ai.Hand {
			if card.Suit == shortestSuit && !isScoringCard(card) {
				candidates = append(candidates, i)
			}
		}

		// If not enough, add scoring cards from shortest suit
		if len(candidates) < count {
			for i, card := range ai.Hand {
				if card.Suit == shortestSuit && isScoringCard(card) {
					alreadyAdded := false
					for _, idx := range candidates {
						if idx == i {
							alreadyAdded = true
							break
						}
					}
					if !alreadyAdded {
						candidates = append(candidates, i)
					}
				}
			}
		}
	}

	// If still not enough, add from other non-trump suits
	if len(candidates) < count {
		for i, card := range ai.Hand {
			if card.Suit != table.TrumpSuit && card.Suit != leadSuit {
				alreadyAdded := false
				for _, idx := range candidates {
					if idx == i {
						alreadyAdded = true
						break
					}
				}
				if !alreadyAdded {
					candidates = append(candidates, i)
				}
			}
		}
	}

	// If still not enough, add any cards except trump (prefer to keep trump)
	if len(candidates) < count {
		for i, card := range ai.Hand {
			if card.Suit != table.TrumpSuit {
				alreadyAdded := false
				for _, idx := range candidates {
					if idx == i {
						alreadyAdded = true
						break
					}
				}
				if !alreadyAdded {
					candidates = append(candidates, i)
				}
			}
		}
	}

	// Last resort: add trump cards if needed
	if len(candidates) < count {
		for i := range ai.Hand {
			alreadyAdded := false
			for _, idx := range candidates {
				if idx == i {
					alreadyAdded = true
					break
				}
			}
			if !alreadyAdded {
				candidates = append(candidates, i)
				if len(candidates) >= count {
					break
				}
			}
		}
	}

	// Sort by value (prefer to discard low cards)
	sort.Slice(candidates, func(i, j int) bool {
		return getCardBaseValue(ai.Hand[candidates[i]]) < getCardBaseValue(ai.Hand[candidates[j]])
	})

	// Return exactly count cards
	if len(candidates) > count {
		return candidates[:count]
	}

	return candidates
}

// getCardBaseValue returns the base value of a card (2=2, ..., A=14)
func getCardBaseValue(card Card) int {
	values := map[string]int{
		"2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
		"10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
	}
	if val, ok := values[card.Value]; ok {
		return val
	}
	return 0
}

// DecideFriendCard decides which card to call as friend
func (ai *AIPlayer) DecideFriendCard() (string, string) {
	if len(ai.Hand) == 0 {
		return "spades", "A" // Default
	}

	// Strategy: Call a card we have multiple of or a high card
	// Count cards by suit and value
	cardCounts := make(map[string]int)
	for _, card := range ai.Hand {
		key := fmt.Sprintf("%s_%s", card.Suit, card.Value)
		cardCounts[key]++
	}

	// Find a card we have at least 2 of, preferably high value
	bestCard := struct {
		suit     string
		value    string
		count    int
		strength int
	}{"spades", "A", 0, 0}

	for key, count := range cardCounts {
		if count >= 2 {
			// Parse key
			var suit, value string
			fmt.Sscanf(key, "%s_%s", &suit, &value)
			strength := getCardBaseValue(Card{Suit: suit, Value: value})
			if strength > bestCard.strength {
				bestCard.suit = suit
				bestCard.value = value
				bestCard.count = count
				bestCard.strength = strength
			}
		}
	}

	// If no pair, call a high card we have
	if bestCard.count == 0 {
		// Find highest card in hand
		for _, card := range ai.Hand {
			strength := getCardBaseValue(card)
			if strength > bestCard.strength {
				bestCard.suit = card.Suit
				bestCard.value = card.Value
				bestCard.strength = strength
			}
		}
	}

	return bestCard.suit, bestCard.value
}

// ShouldCallFriendAsHost decides if AI should call a specific card as friend
// when AI is the host
func (ai *AIPlayer) ShouldCallFriendAsHost(table *GameTable) (string, string) {
	// Call the Ace of our longest suit (highest chance of having it)
	suitCounts := make(map[string]int)
	for _, card := range ai.Hand {
		suitCounts[card.Suit]++
	}

	longestSuit := ""
	maxCount := 0
	for suit, count := range suitCounts {
		if count > maxCount {
			maxCount = count
			longestSuit = suit
		}
	}

	// Check if we have the Ace
	for _, card := range ai.Hand {
		if card.Suit == longestSuit && card.Value == "A" {
			return longestSuit, "A" // We have it, 1v4 mode
		}
	}

	// Call Ace of longest suit
	return longestSuit, "A"
}

// CreateAIPlayers creates AI players for single player mode
func CreateAIPlayers(gameID string, hostID string) ([]AIPlayer, error) {
	aiPlayers := []AIPlayer{
		{UserID: "ai_player_2", SeatNumber: 2, Hand: []Card{}},
		{UserID: "ai_player_3", SeatNumber: 3, Hand: []Card{}},
		{UserID: "ai_player_4", SeatNumber: 4, Hand: []Card{}},
		{UserID: "ai_player_5", SeatNumber: 5, Hand: []Card{}},
	}

	return aiPlayers, nil
}

// AutoPlayAI makes all AI players play automatically
func AutoPlayAI(table *GameTable) error {
	for table.CurrentPlayer != 1 {
		hand, ok := table.PlayerHands[table.CurrentPlayer]
		if !ok {
			return fmt.Errorf("player %d not found", table.CurrentPlayer)
		}

		// Check if this is an AI player (seat 2-5)
		if table.CurrentPlayer >= 2 {
			ai := &AIPlayer{
				UserID:     hand.UserID,
				SeatNumber: table.CurrentPlayer,
				Hand:       hand.Cards,
			}

			cardIndices := ai.DecidePlay(table)
			_, err := PlayCardsGame(table.GameID, hand.UserID, cardIndices)
			if err != nil {
				return fmt.Errorf("AI %d play failed: %w", table.CurrentPlayer, err)
			}

			// Update AI hand reference
			newHand, ok := table.PlayerHands[table.CurrentPlayer]
			if ok {
				ai.Hand = newHand.Cards
			}
		} else {
			break // Human player's turn
		}
	}

	return nil
}

// ensureCardCount ensures that we have exactly count cards
// This is a safety fallback to prevent AI from getting stuck
func (ai *AIPlayer) ensureCardCount(currentCards []int, count int, excludeSuit string, trumpSuit string) []int {
	if len(currentCards) >= count {
		return currentCards[:count]
	}

	// Create a copy of current cards
	result := make([]int, len(currentCards))
	copy(result, currentCards)

	// Find cards we haven't selected yet
	selectedMap := make(map[int]bool)
	for _, idx := range currentCards {
		selectedMap[idx] = true
	}

	// Prioritize non-trump, non-scoring cards
	type cardPriority struct {
		index    int
		priority int // Lower is better
	}
	var candidates []cardPriority

	for i, card := range ai.Hand {
		if selectedMap[i] {
			continue
		}

		priority := 0
		if card.Suit == trumpSuit {
			priority += 1000 // Avoid trump
		}
		if isScoringCard(card) {
			priority += 100 // Avoid scoring cards
		}
		priority += getCardBaseValue(card) // Prefer low cards

		candidates = append(candidates, cardPriority{i, priority})
	}

	// Sort by priority (lowest first)
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].priority < candidates[j].priority
	})

	// Add cards until we have enough
	for i := 0; i < len(candidates) && len(result) < count; i++ {
		result = append(result, candidates[i].index)
	}

	// Final safety: if still not enough (shouldn't happen), add any remaining cards
	if len(result) < count {
		for i := range ai.Hand {
			if !selectedMap[i] {
				alreadyAdded := false
				for _, idx := range result {
					if idx == i {
						alreadyAdded = true
						break
					}
				}
				if !alreadyAdded {
					result = append(result, i)
					if len(result) >= count {
						break
					}
				}
			}
		}
	}

	return result
}
