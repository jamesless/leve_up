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

// DecidePlay decides which cards to play based on current game state
// Returns slice of card indices (can be multiple for pairs, triples, etc.)
func (ai *AIPlayer) DecidePlay(table *GameTable) []int {
	if len(ai.Hand) == 0 {
		return []int{0}
	}

	// If leading (first to play in this trick)
	if len(table.CurrentTrick) == 0 {
		return ai.decideLeadCards(table)
	}

	// If following, must follow suit if possible
	return ai.decideFollowCards(table)
}

// decideLeadCards chooses cards when leading a trick
func (ai *AIPlayer) decideLeadCards(table *GameTable) []int {
	// Try to throw cards (甩牌) if we have a strong suit
	if throwIndices := ai.tryThrowCards(table); len(throwIndices) > 0 {
		return throwIndices
	}

	// Try to lead with a pair or triple if we have one
	if pairIndices := ai.findStrongestPair(); len(pairIndices) > 0 {
		return pairIndices
	}

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
		lowestIdx := ai.findLowestCard()
		return []int{lowestIdx}
	}

	// Sort candidates by card value (ascending for lowest first)
	sort.Slice(candidates, func(i, j int) bool {
		return getCardBaseValue(ai.Hand[candidates[i]]) < getCardBaseValue(ai.Hand[candidates[j]])
	})

	// Play lowest card from the longest suit (conservative strategy)
	return []int{candidates[0]}
}

// findStrongestPair finds the strongest pair or triple to lead with
func (ai *AIPlayer) findStrongestPair() []int {
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

	// Find triples first (priority)
	for _, indices := range cardGroups {
		if len(indices) >= 3 {
			return indices[:3]
		}
	}

	// Find pairs
	for _, indices := range cardGroups {
		if len(indices) >= 2 {
			return indices[:2]
		}
	}

	return nil
}

// tryThrowCards attempts to find a valid throw (甩牌)
// Returns card indices if a throw is possible, empty otherwise
func (ai *AIPlayer) tryThrowCards(table *GameTable) []int {
	// Group cards by suit
	suitCards := make(map[string][]int)
	for i, card := range ai.Hand {
		suitCards[card.Suit] = append(suitCards[card.Suit], i)
	}

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
			// Return indices of cards to throw
			return indices
		}
	}

	// No valid throw found
	return nil
}

// decideFollowCards chooses cards when following a lead
// Must respect the lead card type (pair, triple, etc.)
func (ai *AIPlayer) decideFollowCards(table *GameTable) []int {
	leadSuit := table.CurrentTrick[0].Card.Suit
	trumpSuit := table.TrumpSuit

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

	// Find cards that can follow the lead suit
	var followCards []int
	for i, card := range ai.Hand {
		if card.Suit == leadSuit {
			followCards = append(followCards, i)
		}
	}

	// If we can follow suit
	if len(followCards) > 0 {
		return ai.decideFollowWithSuit(table, followCards, leadCount, isLeadPair, isLeadTriple, leadSuit)
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
	}

	if isLeadTriple {
		// Try to find a triple in the lead suit
		if tripleIndices := ai.findTripleInSuit(leadSuit); len(tripleIndices) >= 3 {
			return tripleIndices[:3]
		}
	}

	// Can't match the exact type, play leadCount cards from the suit
	// Sort follow cards by strength
	strengths := make([]struct {
		index    int
		strength int
	}, len(followCards))

	for i, cardIdx := range followCards {
		card := ai.Hand[cardIdx]
		strength := getCardValue(card, leadSuit, table.TrumpSuit)
		strengths[i] = struct {
			index    int
			strength int
		}{cardIdx, strength}
	}

	// Sort by strength (ascending)
	sort.Slice(strengths, func(i, j int) bool {
		return strengths[i].strength < strengths[j].strength
	})

	// Select leadCount cards
	selectedIndices := make([]int, 0, leadCount)
	for i := 0; i < leadCount && i < len(strengths); i++ {
		selectedIndices = append(selectedIndices, strengths[i].index)
	}

	// If we don't have enough cards in the suit, add more cards from other suits
	if len(selectedIndices) < leadCount {
		// Need to add more cards from other suits
		otherCards := ai.findLowestNonSuitCards(leadSuit, leadCount-len(selectedIndices))
		selectedIndices = append(selectedIndices, otherCards...)
	}

	return selectedIndices
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

	// Return lowest N cards
	if len(candidates) > count {
		candidates = candidates[:count]
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
		}
		if isLeadTriple {
			// Try to use a trump triple
			if trumpTriple := ai.findTripleInSuit(trumpSuit); len(trumpTriple) >= 3 {
				return trumpTriple[:3]
			}
		}

		// Can't match type, use lowest trumps
		if len(trumpCards) >= leadCount {
			return trumpCards[len(trumpCards)-leadCount:]
		}

		// Not enough trumps, mix trump and discard
		result := make([]int, 0, leadCount)
		result = append(result, trumpCards...)
		remaining := leadCount - len(trumpCards)
		if remaining > 0 {
			discards := ai.findLowestNonTrumpCards(trumpSuit, remaining)
			result = append(result, discards...)
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

	// Return lowest N cards
	if len(candidates) > count {
		candidates = candidates[:count]
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
		if card.Suit != table.TrumpSuit {
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
	for i, card := range ai.Hand {
		if card.Suit == shortestSuit && !isScoringCard(card) {
			candidates = append(candidates, i)
		}
	}

	// If not enough, add scoring cards from shortest suit
	if len(candidates) < count {
		for i, card := range ai.Hand {
			if card.Suit == shortestSuit && isScoringCard(card) {
				candidates = append(candidates, i)
			}
		}
	}

	// If still not enough, add from other non-trump suits
	if len(candidates) < count {
		for i, card := range ai.Hand {
			if card.Suit != table.TrumpSuit && card.Suit != shortestSuit {
				candidates = append(candidates, i)
			}
		}
	}

	// Sort by value (prefer to discard low cards)
	sort.Slice(candidates, func(i, j int) bool {
		return getCardBaseValue(ai.Hand[candidates[i]]) < getCardBaseValue(ai.Hand[candidates[j]])
	})

	// Return count cards
	if len(candidates) > count {
		candidates = candidates[:count]
	}

	// If still not enough (edge case), add any remaining cards
	if len(candidates) < count {
		for i := range ai.Hand {
			alreadySelected := false
			for _, idx := range candidates {
				if idx == i {
					alreadySelected = true
					break
				}
			}
			if !alreadySelected {
				candidates = append(candidates, i)
				if len(candidates) >= count {
					break
				}
			}
		}
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
