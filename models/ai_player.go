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

// DecidePlay decides which card to play based on current game state
func (ai *AIPlayer) DecidePlay(table *GameTable) int {
	if len(ai.Hand) == 0 {
		return 0
	}

	// If leading (first to play in this trick)
	if len(table.CurrentTrick) == 0 {
		return ai.decideLeadCard(table)
	}

	// If following, must follow suit if possible
	return ai.decideFollowCard(table)
}

// decideLeadCard chooses a card when leading a trick
func (ai *AIPlayer) decideLeadCard(table *GameTable) int {
	// Strategy: Lead with a low card from a long suit to drain opponents
	// Or lead with a strong card if we want to win the trick

	// Count cards by suit
	suitCounts := make(map[string]int)
	for _, card := range ai.Hand {
		suitCounts[card.Suit]++
	}

	// Find longest suit
	longestSuit := ""
	maxCount := 0
	for suit, count := range suitCounts {
		if count > maxCount {
			maxCount = count
			longestSuit = suit
		}
	}

	// Get non-trump cards of longest suit (if trump is set)
	var candidates []int
	for i, card := range ai.Hand {
		if card.Suit == longestSuit {
			// If trump is set and this is trump, skip
			if table.TrumpSuit != "" && card.Suit == table.TrumpSuit {
				continue
			}
			candidates = append(candidates, i)
		}
	}

	// If no candidates, just use lowest card overall
	if len(candidates) == 0 {
		return ai.findLowestCard()
	}

	// Play lowest card from the longest suit (conservative strategy)
	return candidates[len(candidates)-1]
}

// decideFollowCard chooses a card when following a lead
func (ai *AIPlayer) decideFollowCard(table *GameTable) int {
	leadSuit := table.CurrentTrick[0].Card.Suit
	trumpSuit := table.TrumpSuit

	// Find cards that can follow the lead suit
	var followCards []int
	for i, card := range ai.Hand {
		if card.Suit == leadSuit {
			followCards = append(followCards, i)
		}
	}

	// If we can follow suit
	if len(followCards) > 0 {
		return ai.decideFollowWithSuit(table, followCards)
	}

	// Can't follow suit - decide to trump or discard
	return ai.decideCantFollow(table, leadSuit, trumpSuit)
}

// decideFollowWithSuit decides which card to play when we have the lead suit
func (ai *AIPlayer) decideFollowWithSuit(table *GameTable, followCards []int) int {
	// Check if we can win the trick with current cards
	_, currentHigh := getCurrentWinner(table)

	// Sort follow cards by strength
	strengths := make([]struct {
		index    int
		strength int
	}, len(followCards))

	for i, cardIdx := range followCards {
		card := ai.Hand[cardIdx]
		strength := getCardValue(card, table.CurrentTrick[0].Card.Suit, table.TrumpSuit)
		strengths[i] = struct {
			index    int
			strength int
		}{cardIdx, strength}
	}

	// Sort by strength (ascending)
	sort.Slice(strengths, func(i, j int) bool {
		return strengths[i].strength < strengths[j].strength
	})

	// If partner is currently winning and we're not the last player
	// Play low to conserve strength
	if ai.partnerIsWinning(table) && len(table.CurrentTrick) < 4 {
		return strengths[0].index
	}

	// If we can beat the current high card with our highest, play to win
	if strengths[len(strengths)-1].strength > currentHigh {
		// Play just enough to win (conservative)
		for i := len(strengths) - 1; i >= 0; i-- {
			if strengths[i].strength > currentHigh {
				return strengths[i].index
			}
		}
	}

	// Can't win or don't want to win - play lowest
	return strengths[0].index
}

// decideCantFollow decides what to do when we can't follow suit
func (ai *AIPlayer) decideCantFollow(table *GameTable, leadSuit, trumpSuit string) int {
	// Check if we should trump
	trumpCards := ai.getTrumpCards(trumpSuit)
	partnerWinning := ai.partnerIsWinning(table)

	// If partner is winning and not last player, discard low
	if partnerWinning && len(table.CurrentTrick) < 4 {
		return ai.discardLow(table, leadSuit)
	}

	// If we have trump and want to win
	if len(trumpCards) > 0 && !partnerWinning {
		// Play lowest trump to win
		return trumpCards[len(trumpCards)-1]
	}

	// Discard lowest non-scoring card
	return ai.discardLow(table, leadSuit)
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

// discardLow finds a low non-scoring card to discard
func (ai *AIPlayer) discardLow(table *GameTable, leadSuit string) int {
	// Prefer to discard from short suits (that aren't trump)
	// Avoid discarding scoring cards (5, 10, K)

	suitCounts := make(map[string]int)
	for _, card := range ai.Hand {
		if card.Suit != table.TrumpSuit {
			suitCounts[card.Suit]++
		}
	}

	// Find shortest suit
	shortestSuit := ""
	minCount := 1000
	for suit, count := range suitCounts {
		if count > 0 && count < minCount {
			minCount = count
			shortestSuit = suit
		}
	}

	// Get non-scoring cards from shortest suit
	var candidates []int
	for i, card := range ai.Hand {
		if card.Suit == shortestSuit && !isScoringCard(card) {
			candidates = append(candidates, i)
		}
	}

	if len(candidates) > 0 {
		// Return highest card from candidates (discard high)
		highestIdx := candidates[0]
		for _, idx := range candidates {
			if getCardBaseValue(ai.Hand[idx]) > getCardBaseValue(ai.Hand[highestIdx]) {
				highestIdx = idx
			}
		}
		return highestIdx
	}

	// Fallback: discard lowest card overall
	return ai.findLowestCard()
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

			cardIndex := ai.DecidePlay(table)
			_, err := PlayCardGame(table.GameID, hand.UserID, cardIndex)
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
