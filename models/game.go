package models

import (
	"database/sql"
	"fmt"
	"math/rand"
	"time"
)

// GameState represents the current state of a game
type GameState struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	HostID       string    `json:"hostId"`
	PlayerIDs    []string  `json:"playerIds"`
	MaxPlayers   int       `json:"maxPlayers"`
	Status       string    `json:"status"` // waiting, playing, finished
	CurrentLevel string    `json:"currentLevel"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Card represents a playing card
type Card struct {
	Suit  string `json:"suit"`  // hearts, diamonds, clubs, spades, joker
	Value string `json:"value"` // 2-10, J, Q, K, A
	Type  string `json:"type"`  // normal, joker
}

// PlayerHand represents a player's hand and game state
type PlayerHand struct {
	UserID     string `json:"userId"`
	Cards      []Card `json:"cards"`
	SeatNumber int    `json:"seatNumber"`
	IsFriend   bool   `json:"isFriend"`  // Whether this player is the friend
	HasCalled  bool   `json:"hasCalled"` // Whether they've called a card
	Score      int    `json:"score"`     // Current round score
	Collected  []Card `json:"collected"` // Cards collected (scoring cards)
}

// GameTable represents the active game table
type GameTable struct {
	GameID         string              `json:"gameId"`
	HostID         string              `json:"hostId"`
	Status         string              `json:"status"`         // waiting, playing, finished
	CurrentLevel   string              `json:"currentLevel"`   // Current level being played
	TrumpSuit      string              `json:"trumpSuit"`      // Current trump suit
	HostCalledCard *CalledCard         `json:"hostCalledCard"` // Card host called for friend
	FriendRevealed bool                `json:"friendRevealed"` // Whether friend has been revealed
	FriendSeat     int                 `json:"friendSeat"`     // Seat number of friend (when revealed)
	BottomCards    []Card              `json:"bottomCards"`    // 7 bottom cards
	CurrentPlayer  int                 `json:"currentPlayer"`  // Current player's seat (1-5)
	CurrentTrick   []PlayedCard        `json:"currentTrick"`   // Cards in current trick
	TrickLeader    int                 `json:"trickLeader"`    // Who led the current trick
	TricksWon      [][]Card            `json:"tricksWon"`      // All tricks won by defender team
	PlayerHands    map[int]*PlayerHand `json:"playerHands"`    // Seat -> PlayerHand
	LastPlay       *PlayResult         `json:"lastPlay"`       // Last play result
	CreatedAt      time.Time           `json:"createdAt"`
	UpdatedAt      time.Time           `json:"updatedAt"`
}

// CalledCard represents the card the host calls to find a friend
type CalledCard struct {
	Suit  string `json:"suit"`
	Value string `json:"value"`
}

// PlayedCard represents a card played during the game
type PlayedCard struct {
	Card      Card  `json:"card"`
	Seat      int   `json:"seat"`
	IsLead    bool  `json:"isLead"`
	Timestamp int64 `json:"timestamp"`
}

// PlayResult represents the result of a card play
type PlayResult struct {
	Success       bool   `json:"success"`
	Message       string `json:"message"`
	NextPlayer    int    `json:"nextPlayer"`
	TrickComplete bool   `json:"trickComplete"`
	TrickWinner   int    `json:"trickWinner,omitempty"`
}

// In-memory game storage (in production, use Redis or similar)
var activeGames = make(map[string]*GameTable)

// StartGame initializes and starts a game with card dealing
func StartGame(gameID, hostID string) (*GameTable, error) {
	game, err := GetGame(gameID)
	if err != nil {
		return nil, err
	}

	if game.HostID != hostID {
		return nil, fmt.Errorf("only host can start the game")
	}

	if len(game.PlayerIDs) != 5 {
		return nil, fmt.Errorf("need exactly 5 players to start")
	}

	if game.Status != "waiting" {
		return nil, fmt.Errorf("game already started")
	}

	// Deal cards
	hands, bottomCards := DealCards(5)

	// Initialize game table
	table := &GameTable{
		GameID:         gameID,
		HostID:         hostID,
		Status:         "playing",
		CurrentLevel:   game.CurrentLevel,
		TrumpSuit:      "",
		HostCalledCard: nil,
		FriendRevealed: false,
		BottomCards:    bottomCards,
		CurrentPlayer:  1, // First player leads
		TrickLeader:    1,
		CurrentTrick:   make([]PlayedCard, 0),
		TricksWon:      make([][]Card, 0),
		PlayerHands:    make(map[int]*PlayerHand),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Assign cards to players
	for i, playerID := range game.PlayerIDs {
		seat := i + 1
		table.PlayerHands[seat] = &PlayerHand{
			UserID:     playerID,
			Cards:      hands[i],
			SeatNumber: seat,
			IsFriend:   false,
			Score:      0,
			Collected:  make([]Card, 0),
		}
	}

	// Store active game
	activeGames[gameID] = table

	// Update game status in database
	UpdateGameStatus(gameID, "playing")

	return table, nil
}

// GetTableGame retrieves the active game table
func GetTableGame(gameID string) (*GameTable, error) {
	table, exists := activeGames[gameID]
	if !exists {
		// Try to load from database
		game, err := GetGame(gameID)
		if err != nil {
			return nil, ErrGameNotFound
		}
		if game.Status == "waiting" {
			return &GameTable{
				GameID:       gameID,
				HostID:       game.HostID,
				Status:       "waiting",
				PlayerHands:  make(map[int]*PlayerHand),
				CurrentTrick: make([]PlayedCard, 0),
			}, nil
		}
		return nil, fmt.Errorf("game not active in memory")
	}
	return table, nil
}

// CallFriendCard sets the card the host calls to find their friend
func CallFriendCard(gameID, userID, suit, value string) error {
	table, err := GetTableGame(gameID)
	if err != nil {
		return err
	}

	if table.HostID != userID {
		return fmt.Errorf("only host can call friend")
	}

	if table.Status != "playing" {
		return fmt.Errorf("game not in playing state")
	}

	table.HostCalledCard = &CalledCard{
		Suit:  suit,
		Value: value,
	}
	table.UpdatedAt = time.Now()

	return nil
}

// PlayCardGame plays a card from a player's hand
func PlayCardGame(gameID, userID string, cardIndex int) (*PlayResult, error) {
	table, err := GetTableGame(gameID)
	if err != nil {
		return nil, err
	}

	if table.Status != "playing" {
		return nil, fmt.Errorf("game not in playing state")
	}

	// Find player's seat
	var playerSeat int
	var hand *PlayerHand
	for seat, h := range table.PlayerHands {
		if h.UserID == userID {
			playerSeat = seat
			hand = h
			break
		}
	}

	if hand == nil {
		return nil, fmt.Errorf("player not in game")
	}

	if playerSeat != table.CurrentPlayer {
		return nil, fmt.Errorf("not your turn")
	}

	// Validate card index
	if cardIndex < 0 || cardIndex >= len(hand.Cards) {
		return nil, fmt.Errorf("invalid card index")
	}

	card := hand.Cards[cardIndex]

	// Check for friend reveal (when called card is played)
	if !table.FriendRevealed && table.HostCalledCard != nil {
		if card.Suit == table.HostCalledCard.Suit && card.Value == table.HostCalledCard.Value {
			table.FriendRevealed = true
			table.FriendSeat = playerSeat
			hand.IsFriend = true
		}
	}

	// Remove card from hand and add to current trick
	hand.Cards = append(hand.Cards[:cardIndex], hand.Cards[cardIndex+1:]...)
	isLead := len(table.CurrentTrick) == 0
	if isLead {
		table.TrickLeader = playerSeat
	}

	table.CurrentTrick = append(table.CurrentTrick, PlayedCard{
		Card:      card,
		Seat:      playerSeat,
		IsLead:    isLead,
		Timestamp: time.Now().UnixNano(),
	})

	table.UpdatedAt = time.Now()

	result := &PlayResult{
		Success: true,
		Message: fmt.Sprintf("Played %s of %s", card.Value, card.Suit),
	}

	// Check if trick is complete (5 cards played)
	if len(table.CurrentTrick) == 5 {
		winner := determineTrickWinner(table.CurrentTrick, table.TrumpSuit)
		result.TrickComplete = true
		result.TrickWinner = winner

		// Collect scoring cards
		var collectedCards []Card
		for _, pc := range table.CurrentTrick {
			if isScoringCard(pc.Card) {
				collectedCards = append(collectedCards, pc.Card)
			}
		}

		// Winner gets the cards
		if winnerHand, ok := table.PlayerHands[winner]; ok {
			winnerHand.Collected = append(winnerHand.Collected, collectedCards...)
		}

		table.TricksWon = append(table.TricksWon, []Card{card})

		// Clear trick and set winner as next leader
		table.CurrentTrick = make([]PlayedCard, 0)
		table.CurrentPlayer = winner
		table.TrickLeader = winner
	} else {
		// Next player
		result.NextPlayer = playerSeat%5 + 1
		table.CurrentPlayer = result.NextPlayer
	}

	table.LastPlay = result
	return result, nil
}

// determineTrickWinner determines who wins the current trick
func determineTrickWinner(trick []PlayedCard, trumpSuit string) int {
	winner := trick[0].Seat
	leadSuit := trick[0].Card.Suit
	highestValue := getCardValue(trick[0].Card, leadSuit, trumpSuit)

	for i := 1; i < len(trick); i++ {
		pc := trick[i]
		value := getCardValue(pc.Card, leadSuit, trumpSuit)
		if value > highestValue {
			highestValue = value
			winner = pc.Seat
		}
	}

	return winner
}

// getCardValue returns the numeric value of a card for comparison
func getCardValue(card Card, leadSuit, trumpSuit string) int {
	values := map[string]int{
		"2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
		"J": 11, "Q": 12, "K": 13, "A": 14,
	}

	baseValue := values[card.Value]

	// Trump cards are highest
	if trumpSuit != "" && card.Suit == trumpSuit {
		return baseValue + 100
	}

	// Big joker is highest of all
	if card.Type == "joker" && card.Value == "big" {
		return 200
	}

	// Small joker
	if card.Type == "joker" && card.Value == "small" {
		return 150
	}

	// Lead suit cards beat non-lead, non-trump
	if card.Suit == leadSuit {
		return baseValue
	}

	// Non-lead, non-trump cards are lowest
	return baseValue - 100
}

// isScoringCard checks if a card is worth points
func isScoringCard(card Card) bool {
	if card.Type == "joker" {
		return true // Jokers are worth points
	}
	if card.Value == "5" {
		return true // 5s are worth 5 points
	}
	if card.Value == "10" || card.Value == "K" {
		return true // 10s and Ks are worth 10 points
	}
	return false
}

// GetPlayerHand returns a player's hand (only for that player)
func GetPlayerHand(gameID, userID string) (*PlayerHand, error) {
	table, err := GetTableGame(gameID)
	if err != nil {
		return nil, err
	}

	for _, hand := range table.PlayerHands {
		if hand.UserID == userID {
			return hand, nil
		}
	}

	return nil, fmt.Errorf("player not in game")
}

// CreateGame creates a new game
func CreateGame(name, hostID string) (*GameState, error) {
	var id string
	var err error

	// Try to generate a unique ID (retry if collision)
	for i := 0; i < 10; i++ {
		id = generateID()
		query := `INSERT INTO games (id, name, host_id, max_players, status, current_level) VALUES ($1, $2, $3, $4, $5, $6)`
		_, err = db.Exec(query, id, name, hostID, 5, "waiting", "2")
		if err == nil {
			break
		}
		// Check if it's a duplicate error, try again
		if !isDuplicateError(err) {
			return nil, err
		}
	}
	if err != nil {
		return nil, err
	}

	// Add host as first player
	_, err = db.Exec(`INSERT INTO game_players (game_id, user_id, seat_number) VALUES ($1, $2, 1)`, id, hostID)
	if err != nil {
		return nil, err
	}

	return GetGame(id)
}

// CreateSinglePlayerGame creates a single player game with AI opponents
func CreateSinglePlayerGame(name, hostID string) (*GameState, error) {
	var id string
	var err error

	// Try to generate a unique ID (retry if collision)
	for i := 0; i < 10; i++ {
		id = generateID()
		query := `INSERT INTO games (id, name, host_id, max_players, status, current_level) VALUES ($1, $2, $3, $4, $5, $6)`
		_, err = db.Exec(query, id, name, hostID, 5, "waiting", "2")
		if err == nil {
			break
		}
		// Check if it's a duplicate error, try again
		if !isDuplicateError(err) {
			return nil, err
		}
	}
	if err != nil {
		return nil, err
	}

	// Add human player as seat 1
	_, err = db.Exec(`INSERT INTO game_players (game_id, user_id, seat_number) VALUES ($1, $2, 1)`, id, hostID)
	if err != nil {
		return nil, err
	}

	// Add AI players for seats 2-5
	// Use simpler AI IDs that are consistent across games
	aiPlayers := []string{"ai_2", "ai_3", "ai_4", "ai_5"}
	for i, aiID := range aiPlayers {
		// First, ensure AI user exists in users table (for foreign key)
		// Use username that matches the ID to ensure uniqueness
		_, err = db.Exec(`INSERT INTO users (id, username, password, level, wins, losses) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
			aiID, aiID, "ai", "2", 0, 0)
		if err != nil {
			return nil, fmt.Errorf("failed to create AI user %s: %w", aiID, err)
		}

		// Then add to game_players
		_, err = db.Exec(`INSERT INTO game_players (game_id, user_id, seat_number) VALUES ($1, $2, $3)`, id, aiID, i+2)
		if err != nil {
			return nil, fmt.Errorf("failed to add AI player %s to game: %w", aiID, err)
		}
	}

	return GetGame(id)
}

// StartSinglePlayerGame starts a single player game with AI opponents
func StartSinglePlayerGame(gameID, hostID string) (*GameTable, error) {
	game, err := GetGame(gameID)
	if err != nil {
		return nil, err
	}

	if game.HostID != hostID {
		return nil, fmt.Errorf("only host can start the game")
	}

	// Should have exactly 5 players (1 human + 4 AI)
	if len(game.PlayerIDs) != 5 {
		return nil, fmt.Errorf("single player mode requires 5 players")
	}

	if game.Status != "waiting" {
		return nil, fmt.Errorf("game already started")
	}

	// Deal cards
	hands, bottomCards := DealCards(5)

	// Initialize game table
	table := &GameTable{
		GameID:         gameID,
		HostID:         hostID,
		Status:         "playing",
		CurrentLevel:   game.CurrentLevel,
		TrumpSuit:      "",
		HostCalledCard: nil,
		FriendRevealed: false,
		BottomCards:    bottomCards,
		CurrentPlayer:  1, // Human player leads first
		TrickLeader:    1,
		CurrentTrick:   make([]PlayedCard, 0),
		TricksWon:      make([][]Card, 0),
		PlayerHands:    make(map[int]*PlayerHand),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Assign cards to players (seat 1 is human, 2-5 are AI)
	for i, playerID := range game.PlayerIDs {
		seat := i + 1
		table.PlayerHands[seat] = &PlayerHand{
			UserID:     playerID,
			Cards:      hands[i],
			SeatNumber: seat,
			IsFriend:   false,
			Score:      0,
			Collected:  make([]Card, 0),
		}
	}

	// Store active game
	activeGames[gameID] = table

	// Update game status in database
	UpdateGameStatus(gameID, "playing")

	return table, nil
}

// AIPlayTurn makes AI players play until it's the human's turn
func AIPlayTurn(gameID string) (*GameTable, error) {
	table, err := GetTableGame(gameID)
	if err != nil {
		return nil, err
	}

	if table.Status != "playing" {
		return nil, fmt.Errorf("game not in playing state")
	}

	// Keep playing while it's an AI player's turn (seats 2-5)
	maxIterations := 4 // Prevent infinite loop
	iterations := 0

	for table.CurrentPlayer != 1 && iterations < maxIterations {
		hand, ok := table.PlayerHands[table.CurrentPlayer]
		if !ok {
			return nil, fmt.Errorf("player %d not found", table.CurrentPlayer)
		}

		// Create AI player
		ai := &AIPlayer{
			UserID:     hand.UserID,
			SeatNumber: table.CurrentPlayer,
			Hand:       hand.Cards,
		}

		// Decide which card to play
		cardIndex := ai.DecidePlay(table)

		// Play the card
		_, err = PlayCardGame(gameID, hand.UserID, cardIndex)
		if err != nil {
			return nil, fmt.Errorf("AI %d play failed: %w", table.CurrentPlayer, err)
		}

		// Refresh table state
		table, _ = GetTableGame(gameID)
		iterations++
	}

	return table, nil
}

// AICallFriendCard decides which card to call as friend
func AICallFriendCard(cards []Card) (string, string) {
	if len(cards) == 0 {
		return "spades", "A"
	}

	// Strategy: Call Ace of longest suit or a suit we have multiple cards of
	suitCounts := make(map[string]int)
	for _, card := range cards {
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
	for _, card := range cards {
		if card.Suit == longestSuit && card.Value == "A" {
			return longestSuit, "A" // We have it, 1v4 mode
		}
	}

	return longestSuit, "A"
}

// GetGame retrieves a game by ID
func GetGame(id string) (*GameState, error) {
	query := `SELECT id, name, host_id, max_players, status, current_level, created_at, updated_at FROM games WHERE id = $1`

	game := &GameState{}
	err := db.QueryRow(query, id).Scan(
		&game.ID, &game.Name, &game.HostID, &game.MaxPlayers,
		&game.Status, &game.CurrentLevel, &game.CreatedAt, &game.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrGameNotFound
	}
	if err != nil {
		return nil, err
	}

	// Load players
	game.PlayerIDs, err = getGamePlayers(id)
	if err != nil {
		return nil, err
	}

	return game, nil
}

// getGamePlayers gets all player IDs for a game
func getGamePlayers(gameID string) ([]string, error) {
	query := `SELECT user_id FROM game_players WHERE game_id = $1 ORDER BY seat_number`

	rows, err := db.Query(query, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var playerIDs []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		playerIDs = append(playerIDs, userID)
	}

	return playerIDs, rows.Err()
}

// JoinGame adds a player to a game
func JoinGame(gameID, playerID string) error {
	// Check if game exists and get current player count
	game, err := GetGame(gameID)
	if err != nil {
		return err
	}

	if len(game.PlayerIDs) >= game.MaxPlayers {
		return ErrGameFull
	}

	// Check if player already in game
	for _, id := range game.PlayerIDs {
		if id == playerID {
			return nil // Already in game
		}
	}

	// Get next seat number
	nextSeat := len(game.PlayerIDs) + 1

	// Add player to game
	query := `INSERT INTO game_players (game_id, user_id, seat_number) VALUES ($1, $2, $3)`
	_, err = db.Exec(query, gameID, playerID, nextSeat)

	return err
}

// ListGames returns all active games
func ListGames() ([]*GameState, error) {
	query := `SELECT id, name, host_id, max_players, status, current_level, created_at, updated_at FROM games WHERE status != 'finished' ORDER BY created_at DESC`

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var games []*GameState
	for rows.Next() {
		game := &GameState{}
		err := rows.Scan(
			&game.ID, &game.Name, &game.HostID, &game.MaxPlayers,
			&game.Status, &game.CurrentLevel, &game.CreatedAt, &game.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Load players
		game.PlayerIDs, err = getGamePlayers(game.ID)
		if err != nil {
			return nil, err
		}

		games = append(games, game)
	}

	return games, rows.Err()
}

// UpdateGameStatus updates the status of a game
func UpdateGameStatus(gameID, status string) error {
	query := `UPDATE games SET status = $1 WHERE id = $2`
	_, err := db.Exec(query, status, gameID)
	return err
}

// GetGamePlayersWithInfo returns detailed player information for a game
func GetGamePlayersWithInfo(gameID string) ([]*PlayerInfo, error) {
	query := `
		SELECT u.id, u.username, u.level, u.wins, u.losses, gp.seat_number
		FROM game_players gp
		JOIN users u ON gp.user_id = u.id
		WHERE gp.game_id = $1
		ORDER BY gp.seat_number
	`

	rows, err := db.Query(query, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var players []*PlayerInfo
	for rows.Next() {
		p := &PlayerInfo{}
		err := rows.Scan(&p.ID, &p.Username, &p.Level, &p.Wins, &p.Losses, &p.SeatNumber)
		if err != nil {
			return nil, err
		}
		players = append(players, p)
	}

	return players, rows.Err()
}

// PlayerInfo represents player information with seat number
type PlayerInfo struct {
	ID         string `json:"id"`
	Username   string `json:"username"`
	Level      string `json:"level"`
	Wins       int    `json:"wins"`
	Losses     int    `json:"losses"`
	SeatNumber int    `json:"seatNumber"`
}

// DealCards deals cards for a 5-player, 3-deck game
// Each player gets 31 cards, 7 cards go to the bottom
func DealCards(playerCount int) ([][]Card, []Card) {
	// Create 3 decks of cards (162 cards total)
	var allCards []Card
	suits := []string{"hearts", "diamonds", "clubs", "spades"}
	values := []string{"2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"}

	for deck := 0; deck < 3; deck++ {
		for _, suit := range suits {
			for _, value := range values {
				allCards = append(allCards, Card{
					Suit:  suit,
					Value: value,
					Type:  "normal",
				})
			}
		}
		// Add jokers for each deck
		allCards = append(allCards, Card{Suit: "joker", Value: "small", Type: "joker"})
		allCards = append(allCards, Card{Suit: "joker", Value: "big", Type: "joker"})
	}

	// Proper shuffle using rand
	rand.Seed(time.Now().UnixNano())
	for i := len(allCards) - 1; i > 0; i-- {
		j := rand.Intn(i + 1)
		allCards[i], allCards[j] = allCards[j], allCards[i]
	}

	// Deal cards
	hands := make([][]Card, playerCount)
	cardsPerPlayer := 31

	for i := 0; i < playerCount; i++ {
		hands[i] = allCards[i*cardsPerPlayer : (i+1)*cardsPerPlayer]
	}

	// Remaining 7 cards are the bottom cards
	bottomCards := allCards[playerCount*cardsPerPlayer:]

	return hands, bottomCards
}

// CalculateLevelUp determines how many levels to advance based on score
func CalculateLevelUp(score int, isSolo bool, winnerIsDefender bool) int {
	if isSolo {
		// Solo game (1 vs 4)
		if winnerIsDefender {
			// Solo winner (defender)
			if score <= 59 {
				return 4
			}
			return 2
		} else {
			// Attackers won
			if score >= 180 {
				return 2
			}
			return 1
		}
	} else {
		// Normal game (2 vs 3)
		if winnerIsDefender {
			// Defender team won
			if score == 0 {
				return 3
			} else if score <= 59 {
				return 2
			}
			return 1
		} else {
			// Attacker team won
			if score >= 300 {
				return 4
			} else if score >= 240 {
				return 3
			} else if score >= 180 {
				return 2
			}
			return 1
		}
	}
}

// RecordGameResult records the result of a game for all players
func RecordGameResult(gameID string, results []GameResult) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO game_records (game_id, user_id, old_level, new_level, is_winner, score)
		VALUES ($1, $2, $3, $4, $5, $6)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, r := range results {
		_, err = stmt.Exec(gameID, r.UserID, r.OldLevel, r.NewLevel, r.IsWinner, r.Score)
		if err != nil {
			return err
		}

		// Update user level
		if err := UpdateUserLevel(r.UserID, r.NewLevel); err != nil {
			return err
		}

		// Update win/loss count
		if r.IsWinner {
			if err := IncrementUserWins(r.UserID); err != nil {
				return err
			}
		} else {
			if err := IncrementUserLosses(r.UserID); err != nil {
				return err
			}
		}
	}

	// Update game status
	if _, err := tx.Exec(`UPDATE games SET status = 'finished' WHERE id = $1`, gameID); err != nil {
		return err
	}

	return tx.Commit()
}

// GameResult represents the result for a single player
type GameResult struct {
	UserID   string `json:"user_id"`
	OldLevel string `json:"old_level"`
	NewLevel string `json:"new_level"`
	IsWinner bool   `json:"is_winner"`
	Score    int    `json:"score"`
}
