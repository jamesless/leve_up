package models

import (
	"database/sql"
	"fmt"
	"math/rand"
	"sort"
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
	Status         string              `json:"status"`         // waiting, calling, playing, finished
	CurrentLevel   string              `json:"currentLevel"`   // Current level being played
	TrumpSuit      string              `json:"trumpSuit"`      // Current trump suit
	HostCalledCard *CalledCard         `json:"hostCalledCard"` // Card host called for friend
	FriendRevealed bool                `json:"friendRevealed"` // Whether friend has been revealed
	FriendSeat     int                 `json:"friendSeat"`     // Seat number of friend (when revealed)
	IsSoloMode     bool                `json:"isSoloMode"`     // Whether this is 1v4 mode (called card is in dealer's hand/bottom)
	BottomCards    []Card              `json:"bottomCards"`    // 7 bottom cards
	CurrentPlayer  int                 `json:"currentPlayer"`  // Current player's seat (1-5)
	CurrentTrick   []PlayedCard        `json:"currentTrick"`   // Cards in current trick
	TrickLeader    int                 `json:"trickLeader"`    // Who led the current trick
	TricksWon      [][]Card            `json:"tricksWon"`      // All tricks won by defender team
	PlayerHands    map[int]*PlayerHand `json:"playerHands"`    // Seat -> PlayerHand
	LastPlay       *PlayResult         `json:"lastPlay"`       // Last play result
	CreatedAt      time.Time           `json:"createdAt"`
	UpdatedAt      time.Time           `json:"updatedAt"`

	// 抢庄相关字段
	DealerSeat         int          `json:"dealerSeat"`         // 庄家座位号
	StartingDealerSeat int          `json:"startingDealerSeat"` // 起始发牌人座位号
	CallPhase          string       `json:"callPhase"`          // 抢庄阶段: counting, flipping, finished
	CallCountdown      int          `json:"callCountdown"`      // 抢庄倒计时（秒）
	CurrentCaller      int          `json:"currentCaller"`      // 当前叫庄者座位号
	TrumpRank          string       `json:"trumpRank"`          // 级牌点数（如"2"表示打2级）
	FlippedBottomCards []Card       `json:"flippedBottomCards"` // 已翻开的底牌
	CallRecords        []CallRecord `json:"callRecords"`        // 抢庄记录
}

// CallRecord represents a bid for dealer
type CallRecord struct {
	Seat      int    `json:"seat"`      // 叫庄者座位号
	Suit      string `json:"suit"`      // 叫庄花色
	Rank      string `json:"rank"`      // 叫庄级牌点数
	Count     int    `json:"count"`     // 叫庄张数（1=单张，2=对子，3=三张）
	Timestamp int64  `json:"timestamp"` // 叫庄时间戳
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

	// Determine starting dealer (random for first game)
	startingDealer := rand.Intn(5) + 1 // Random seat 1-5

	// Initialize game table
	table := &GameTable{
		GameID:             gameID,
		HostID:             hostID,
		Status:             "calling", // 进入抢庄阶段
		CurrentLevel:       game.CurrentLevel,
		TrumpSuit:          "",
		HostCalledCard:     nil,
		FriendRevealed:     false,
		BottomCards:        bottomCards,
		CurrentPlayer:      startingDealer, // 起始发牌人先叫庄
		TrickLeader:        startingDealer,
		CurrentTrick:       make([]PlayedCard, 0),
		TricksWon:          make([][]Card, 0),
		PlayerHands:        make(map[int]*PlayerHand),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
		StartingDealerSeat: startingDealer, // 起始发牌人
		CurrentCaller:      startingDealer,
		CallPhase:          "counting", // 倒计时抢庄阶段
		CallCountdown:      10,         // 10秒倒计时
		TrumpRank:          game.CurrentLevel,
		FlippedBottomCards: make([]Card, 0),
		CallRecords:        make([]CallRecord, 0),
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

	// Log game start action
	LogGameAction(GameActionLogRequest{
		GameID:     gameID,
		ActionType: "game_start",
		PlayerSeat: 0,
		PlayerID:   hostID,
		ActionData: map[string]interface{}{
			"starting_dealer": startingDealer,
			"current_level":   game.CurrentLevel,
			"player_count":    len(game.PlayerIDs),
		},
		ResultData: map[string]interface{}{
			"status": "success",
		},
	})

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
// 如果叫的牌在庄家手中或底牌中，则触发1打4独打模式
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

	// 检查叫的牌是否在庄家手中或底牌中
	dealerHand, ok := table.PlayerHands[table.DealerSeat]
	if !ok {
		return fmt.Errorf("dealer hand not found")
	}

	// 检查庄家手牌
	for _, card := range dealerHand.Cards {
		if card.Suit == suit && card.Value == value {
			// 叫的牌在庄家手中，触发1打4模式
			table.IsSoloMode = true
			table.FriendRevealed = true
			table.FriendSeat = table.DealerSeat // 庄家自己就是"朋友"
			table.UpdatedAt = time.Now()
			return nil
		}
	}

	// 检查底牌
	for _, card := range table.BottomCards {
		if card.Suit == suit && card.Value == value {
			// 叫的牌在底牌中，触发1打4模式
			table.IsSoloMode = true
			table.FriendRevealed = true
			table.FriendSeat = table.DealerSeat // 庄家自己就是"朋友"
			table.UpdatedAt = time.Now()
			return nil
		}
	}

	// 叫的牌不在庄家手中也不在底牌中，正常2打3模式
	table.IsSoloMode = false
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
// 规则：所有花色的5、10、K都是分值牌（总分300分）
func isScoringCard(card Card) bool {
	// 所有花色的5、10、K都是分值牌
	if card.Value == "5" || card.Value == "10" || card.Value == "K" {
		return true
	}
	return false
}

// getCardPoints returns the point value of a scoring card
// 规则：所有花色5=5分，10=10分，K=10分（3副牌总分300分）
func getCardPoints(card Card) int {
	// 所有花色的5、10、K都是分值牌
	if card.Value == "5" {
		return 5 // 5 = 5分
	}
	if card.Value == "10" || card.Value == "K" {
		return 10 // 10, K = 10分
	}
	return 0
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

	// 单人模式：玩家1是庄家（起始发牌人）
	startingDealer := 1

	// Initialize game table
	table := &GameTable{
		GameID:             gameID,
		HostID:             hostID,
		Status:             "calling", // 进入抢庄阶段
		CurrentLevel:       game.CurrentLevel,
		TrumpSuit:          "",
		HostCalledCard:     nil,
		FriendRevealed:     false,
		BottomCards:        bottomCards,
		CurrentPlayer:      startingDealer,
		TrickLeader:        startingDealer,
		CurrentTrick:       make([]PlayedCard, 0),
		TricksWon:          make([][]Card, 0),
		PlayerHands:        make(map[int]*PlayerHand),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
		StartingDealerSeat: startingDealer,
		CurrentCaller:      startingDealer,
		CallPhase:          "counting",
		CallCountdown:      10,
		TrumpRank:          game.CurrentLevel,
		FlippedBottomCards: make([]Card, 0),
		CallRecords:        make([]CallRecord, 0),
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
// 规则：60分一级，总分300分
// 正常局升级表（庄家找到盟友，2打3）
// | 抓分范围 | 结果 | 庄家方升级 | 抓分方升级 |
// | 0 分 | 大光 | 连升 3 级 | 不升级 |
// | 1 - 59 分 | 小光 | 连升 2 级 | 不升级 |
// | 60 - 119 分 | 小胜 | 升 1 级 | 不升级 |
// | 120 - 179 分 | 反超 | 不升级 | 每人升 1 级 |
// | 180 - 239 分 | 大胜 | 不升级 | 每人升 2 级 |
// | 240 - 299 分 | 完胜 | 不升级 | 每人升 3 级 |
// | 300 分 | 满光 | 不升级 | 每人升 4 级 |
//
// 独打局升级表（庄家 1 打 4）
// | 抓分范围 | 结果 | 庄家升级 | 抓分方升级 |
// | 0 - 59 分 | 独赢 | 升 4 级 | 不升级 |
// | 60 - 119 分 | 险胜 | 升 2 级 | 不升级 |
// | 120 - 179 分 | 反超 | 不升级 | 每人升 1 级 |
// | 180 分及以上 | 惨败 | 不升级 | 每人升 2 级 |
func CalculateLevelUp(score int, isSolo bool, winnerIsDefender bool) int {
	if isSolo {
		// 独打局（庄家 1 打 4）
		if winnerIsDefender {
			// 庄家（防守方）获胜
			if score <= 59 {
				return 4 // 独赢，升 4 级
			}
			return 2 // 险胜，升 2 级
		} else {
			// 抓分方获胜
			if score >= 180 {
				return 2 // 惨败，抓分方每人升 2 级
			}
			return 1 // 反超，抓分方每人升 1 级
		}
	} else {
		// 正常局（庄家找到盟友，2 打 3）
		if winnerIsDefender {
			// 庄家方获胜
			if score == 0 {
				return 3 // 大光，庄家方连升 3 级
			} else if score <= 59 {
				return 2 // 小光，庄家方连升 2 级
			}
			return 1 // 小胜，庄家方升 1 级
		} else {
			// 抓分方获胜
			if score >= 300 {
				return 4 // 满光，抓分方每人升 4 级
			} else if score >= 240 {
				return 3 // 完胜，抓分方每人升 3 级
			} else if score >= 180 {
				return 2 // 大胜，抓分方每人升 2 级
			}
			return 1 // 反超，抓分方每人升 1 级
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

// PlayCardsGame plays multiple cards from a player's hand
func PlayCardsGame(gameID, userID string, cardIndices []int) (*PlayResult, error) {
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

	// Validate card indices
	if len(cardIndices) == 0 {
		return nil, fmt.Errorf("no cards selected")
	}

	// Validate all card indices
	for _, idx := range cardIndices {
		if idx < 0 || idx >= len(hand.Cards) {
			return nil, fmt.Errorf("invalid card index: %d", idx)
		}
	}

	// Get the cards to be played
	var cardsToPlay []Card
	for _, idx := range cardIndices {
		cardsToPlay = append(cardsToPlay, hand.Cards[idx])
	}

	// Check if this is a throw (甩牌) - leading with multiple cards of same suit
	isLead := len(table.CurrentTrick) == 0
	if isLead && len(cardsToPlay) >= 2 {
		// Check for throw cards validation
		throwResult := ValidateThrowCards(cardsToPlay, table, playerSeat)

		if !throwResult.IsValid && len(throwResult.ActualPlay) < len(cardsToPlay) {
			// 甩牌失败，只出最小的牌
			// 重新计算 cardIndices，只保留要出的牌
			actualCardIndices := make([]int, 0, len(throwResult.ActualPlay))
			for i, idx := range cardIndices {
				if i < len(throwResult.ActualPlay) {
					actualCardIndices = append(actualCardIndices, idx)
				}
			}
			cardIndices = actualCardIndices
			cardsToPlay = throwResult.ActualPlay
			fmt.Printf("甩牌失败: %s，只出最小牌\n", throwResult.Reason)
		}
	}

	// Validate the play (must be valid combination)
	fmt.Printf("DEBUG: Validating %d cards: %+v\n", len(cardsToPlay), cardsToPlay)
	if err := validateCardPlay(cardsToPlay, table); err != nil {
		fmt.Printf("DEBUG: Validation failed: %v\n", err)
		return nil, err
	}

	// Check for friend reveal with first card
	if !table.FriendRevealed && table.HostCalledCard != nil && len(cardsToPlay) > 0 {
		if cardsToPlay[0].Suit == table.HostCalledCard.Suit && cardsToPlay[0].Value == table.HostCalledCard.Value {
			table.FriendRevealed = true
			table.FriendSeat = playerSeat
			hand.IsFriend = true
		}
	}

	// Remove cards from hand (remove in reverse order to preserve indices)
	sort.Slice(cardIndices, func(i, j int) bool { return cardIndices[i] > cardIndices[j] })
	for _, idx := range cardIndices {
		hand.Cards = append(hand.Cards[:idx], hand.Cards[idx+1:]...)
	}

	// Add all played cards to current trick
	isLead = len(table.CurrentTrick) == 0
	if isLead {
		table.TrickLeader = playerSeat
	}

	for _, card := range cardsToPlay {
		table.CurrentTrick = append(table.CurrentTrick, PlayedCard{
			Card:      card,
			Seat:      playerSeat,
			IsLead:    isLead,
			Timestamp: time.Now().UnixNano(),
		})
	}

	table.UpdatedAt = time.Now()

	result := &PlayResult{
		Success: true,
		Message: fmt.Sprintf("Played %d cards", len(cardsToPlay)),
	}

	// Check if trick is complete (5 cards played - considering pairs/triples count as one play)
	if len(table.CurrentTrick) >= 5 {
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

		// Store all played cards in tricks won
		var trickCards []Card
		for _, pc := range table.CurrentTrick {
			trickCards = append(trickCards, pc.Card)
		}
		table.TricksWon = append(table.TricksWon, trickCards)

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

// validateCardPlay validates if the selected cards form a valid play
func validateCardPlay(cards []Card, table *GameTable) error {
	if len(cards) == 0 {
		return fmt.Errorf("no cards to play")
	}

	// Check if this is the first play of the trick
	isLead := len(table.CurrentTrick) == 0

	if isLead {
		// Leading: can play single card, pair, triple, or tractor
		return validateLeadPlay(cards)
	} else {
		// Following: must follow the lead card type
		return validateFollowPlay(cards, table)
	}
}

// validateLeadPlay validates a lead play
func validateLeadPlay(cards []Card) error {
	if len(cards) == 1 {
		// Single card is always valid
		return nil
	}

	// Check for tractor (consecutive pairs or triples of same suit)
	if len(cards) >= 4 {
		if err := validateTractor(cards); err == nil {
			return nil // Valid tractor
		}
		// If not a valid tractor, continue to check pair/triple
	}

	// For pairs and triples, all cards must have same value AND same suit
	firstValue := cards[0].Value
	firstSuit := cards[0].Suit

	for _, card := range cards {
		if card.Value != firstValue {
			return fmt.Errorf("all cards must have the same value for pairs/triples")
		}
		if card.Suit != firstSuit {
			return fmt.Errorf("all cards must have the same suit for pairs/triples")
		}
	}

	// Pair (2 cards) or Triple (3 cards) with same value and suit is valid
	if len(cards) == 2 || len(cards) == 3 {
		return nil
	}

	return fmt.Errorf("invalid card combination")
}

// ThrowCardsResult represents the result of a throw cards validation
type ThrowCardsResult struct {
	IsValid       bool   // Whether the throw is valid
	ActualPlay    []Card // Cards that should actually be played
	ReturnedCards []Card // Cards that should be returned to hand
	Reason        string // Reason for failure or success
}

// ValidateThrowCards validates if a throw (甩牌) is valid
// 规则：甩牌时，如果其中最小的牌比所有其他玩家该花色的牌都大或相等，甩牌成功
// 否则只出最小的那张牌，其他牌收回手里
func ValidateThrowCards(cards []Card, table *GameTable, playerSeat int) *ThrowCardsResult {
	if len(cards) < 2 {
		return &ThrowCardsResult{
			IsValid:    true,
			ActualPlay: cards,
		}
	}

	// 检查是否同花色
	firstSuit := cards[0].Suit
	for _, card := range cards {
		if card.Suit != firstSuit {
			return &ThrowCardsResult{
				IsValid:    false,
				ActualPlay: cards,
				Reason:     "甩牌必须是同花色",
			}
		}
	}

	// 找出最小的牌
	minCard := findMinCard(cards)
	minValue := getCardNumericValue(minCard.Value)

	// 检查所有其他玩家手中的该花色牌
	for seat, hand := range table.PlayerHands {
		if seat == playerSeat {
			continue
		}

		// 检查该玩家是否有更大的该花色牌
		for _, card := range hand.Cards {
			if card.Suit == firstSuit {
				cardValue := getCardNumericValue(card.Value)
				if cardValue > minValue {
					// 有玩家有更大的牌，甩牌失败
					return &ThrowCardsResult{
						IsValid:       false,
						ActualPlay:    []Card{minCard},
						ReturnedCards: removeCardFromSlice(cards, minCard),
						Reason:        fmt.Sprintf("玩家%d有更大的%s牌", seat, getSuitDisplayName(firstSuit)),
					}
				}
			}
		}
	}

	// 甩牌成功
	return &ThrowCardsResult{
		IsValid:    true,
		ActualPlay: cards,
		Reason:     "甩牌成功",
	}
}

// findMinCard finds the card with minimum value in a slice
func findMinCard(cards []Card) Card {
	minCard := cards[0]
	minValue := getCardNumericValue(cards[0].Value)

	for _, card := range cards {
		value := getCardNumericValue(card.Value)
		if value < minValue {
			minValue = value
			minCard = card
		}
	}

	return minCard
}

// removeCardFromSlice removes a card from a slice (first occurrence)
func removeCardFromSlice(cards []Card, target Card) []Card {
	result := make([]Card, 0, len(cards))
	found := false
	for _, card := range cards {
		if !found && card.Suit == target.Suit && card.Value == target.Value {
			found = true
			continue
		}
		result = append(result, card)
	}
	return result
}

// getSuitDisplayName returns the Chinese display name of a suit
func getSuitDisplayName(suit string) string {
	names := map[string]string{
		"spades":   "黑桃",
		"hearts":   "红桃",
		"clubs":    "梅花",
		"diamonds": "方片",
		"joker":    "王",
	}
	return names[suit]
}

// validateTractor validates if cards form a tractor (consecutive pairs or triples of same suit)
// 规则：连对（2对以上）或连三（2组以上三张）
func validateTractor(cards []Card) error {
	// Tractor must have at least 4 cards (2 pairs) or 6 cards (2 triples)
	if len(cards) < 4 {
		return fmt.Errorf("tractor must have at least 4 cards (2 pairs) or 6 cards (2 triples)")
	}

	// All cards must have the same suit
	firstSuit := cards[0].Suit
	for _, card := range cards {
		if card.Suit != firstSuit {
			return fmt.Errorf("all cards in tractor must have the same suit")
		}
	}

	// Count occurrences of each value
	valueCounts := make(map[string]int)
	for _, card := range cards {
		valueCounts[card.Value]++
	}

	// Check if all values have the same count (either all 2s for pairs, or all 3s for triples)
	var expectedCount int
	firstValue := true
	for _, count := range valueCounts {
		if firstValue {
			expectedCount = count
			firstValue = false
			// Must be either 2 (pairs) or 3 (triples)
			if expectedCount != 2 && expectedCount != 3 {
				return fmt.Errorf("tractor consists of consecutive pairs (2) or triples (3)")
			}
		} else {
			if count != expectedCount {
				return fmt.Errorf("tractor must be all pairs or all triples, not mixed")
			}
		}
	}

	// Verify total card count matches
	if len(cards) != len(valueCounts)*expectedCount {
		return fmt.Errorf("invalid card count for tractor")
	}

	// Must have at least 2 groups
	if len(valueCounts) < 2 {
		return fmt.Errorf("tractor must have at least 2 groups")
	}

	// Check if values are consecutive
	values := make([]string, 0, len(valueCounts))
	for value := range valueCounts {
		values = append(values, value)
	}

	// Sort values by their numeric order
	sort.Slice(values, func(i, j int) bool {
		return getCardNumericValue(values[i]) < getCardNumericValue(values[j])
	})

	// Check if values are consecutive
	for i := 1; i < len(values); i++ {
		prevValue := getCardNumericValue(values[i-1])
		currValue := getCardNumericValue(values[i])
		if currValue != prevValue+1 {
			return fmt.Errorf("tractor values must be consecutive (e.g., 10-J-Q)")
		}
	}

	return nil
}

// getCardNumericValue returns the numeric value for sorting and comparison
func getCardNumericValue(value string) int {
	values := map[string]int{
		"2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
		"J": 11, "Q": 12, "K": 13, "A": 14,
	}
	return values[value]
}

// validateFollowPlay validates following a lead
// 跟牌优先级：
// 1. 相同牌型、相同数量
// 2. 相同花色的对子
// 3. 相同花色的单张
// 4. 主牌杀（无色时用主牌，牌型需完美匹配）
// 5. 垫任意其他牌
func validateFollowPlay(cards []Card, table *GameTable) error {
	if len(table.CurrentTrick) == 0 {
		return fmt.Errorf("no lead to follow")
	}

	// Get the lead play
	leadPlay := table.CurrentTrick[0].Card
	leadSuit := leadPlay.Suit
	leadSeat := table.CurrentTrick[0].Seat

	// Count how many cards the leader played and what type
	leadCards := []Card{}
	for _, pc := range table.CurrentTrick {
		if pc.Seat == leadSeat {
			leadCards = append(leadCards, pc.Card)
		} else {
			break
		}
	}

	leadCardCount := len(leadCards)

	// Must play same number of cards
	if len(cards) != leadCardCount {
		return fmt.Errorf("must play %d cards", leadCardCount)
	}

	// Determine lead play type
	isLeadPair := leadCardCount == 2 && leadCards[0].Value == leadCards[1].Value && leadCards[0].Suit == leadCards[1].Suit
	isLeadTriple := leadCardCount == 3 && leadCards[0].Value == leadCards[1].Value && leadCards[1].Value == leadCards[2].Value && leadCards[0].Suit == leadCards[1].Suit && leadCards[1].Suit == leadCards[2].Suit
	isLeadTractor := isTractor(leadCards)

	// Check if player's cards form a pair/triple
	isPlayerPair := leadCardCount == 2 && cards[0].Value == cards[1].Value && cards[0].Suit == cards[1].Suit
	isPlayerTriple := leadCardCount == 3 && cards[0].Value == cards[1].Value && cards[1].Value == cards[2].Value && cards[0].Suit == cards[1].Suit && cards[1].Suit == cards[2].Suit
	isPlayerTractor := isTractor(cards)

	// 检查玩家是否有领出花色的牌
	hasLeadSuit := false
	for _, card := range cards {
		if card.Suit == leadSuit {
			hasLeadSuit = true
			break
		}
	}

	// 跟牌规则优先级：
	// 1. 有色必须跟色：相同牌型、相同数量
	if hasLeadSuit {
		if isLeadPair && isPlayerPair {
			return nil // 相同牌型、相同花色
		}
		if isLeadTriple && isPlayerTriple {
			return nil // 相同牌型、相同花色
		}
		if isLeadTractor && isPlayerTractor {
			return nil // 拖拉机配拖拉机
		}

		// 2. 相同花色的对子（如果领出的是对子或三张）
		if (isLeadPair || isLeadTriple) && !isPlayerPair && !isPlayerTriple {
			// 检查是否有相同花色的对子
			if hasPairInSuit(cards, leadSuit) {
				return fmt.Errorf("有相同花色的对子，必须跟对子")
			}
		}

		// 3. 相同花色的单张
		return validateSingleSuitFollow(cards, leadSuit)
	}

	// 4. 无色时：主牌杀（牌型必须完美匹配）
	trumpSuit := table.TrumpSuit
	if trumpSuit != "" {
		// 检查是否使用主牌
		allTrump := true
		for _, card := range cards {
			if card.Suit != trumpSuit {
				allTrump = false
				break
			}
		}

		if allTrump {
			// 主牌杀：牌型必须完美匹配
			if isLeadPair && isPlayerPair {
				return nil // 主牌对子杀成功
			}
			if isLeadTriple && isPlayerTriple {
				return nil // 主牌三张杀成功
			}
			if isLeadTractor && isPlayerTractor {
				return nil // 主牌拖拉机杀成功
			}
			// 如果领出的是甩牌（多张同花色但不成对子/拖拉机）
			// 主牌也必须出同样数量和牌型
			if !isLeadPair && !isLeadTriple && !isLeadTractor {
				// 检查玩家的主牌是否也不是对子/拖拉机（单张组合）
				if !isPlayerPair && !isPlayerTriple && !isPlayerTractor {
					return nil // 主牌单张组合杀成功
				}
			}
			return fmt.Errorf("主牌杀必须牌型匹配")
		}
	}

	// 5. 垫任意其他牌
	return nil
}

// isTractor checks if the cards form a tractor (consecutive pairs or triples)
func isTractor(cards []Card) bool {
	if len(cards) < 4 {
		return false
	}
	firstSuit := cards[0].Suit
	for _, card := range cards {
		if card.Suit != firstSuit {
			return false
		}
	}

	valueCounts := make(map[string]int)
	for _, card := range cards {
		valueCounts[card.Value]++
	}

	// Check if all values have the same count (either all 2s or all 3s)
	var expectedCount int
	firstValue := true
	for _, count := range valueCounts {
		if firstValue {
			expectedCount = count
			firstValue = false
			// Must be either 2 (pairs) or 3 (triples)
			if expectedCount != 2 && expectedCount != 3 {
				return false
			}
		} else {
			if count != expectedCount {
				return false
			}
		}
	}

	// Must have at least 2 groups
	if len(valueCounts) < 2 {
		return false
	}

	values := make([]string, 0, len(valueCounts))
	for value := range valueCounts {
		values = append(values, value)
	}
	sort.Slice(values, func(i, j int) bool {
		return getCardNumericValue(values[i]) < getCardNumericValue(values[j])
	})

	for i := 1; i < len(values); i++ {
		prevValue := getCardNumericValue(values[i-1])
		currValue := getCardNumericValue(values[i])
		if currValue != prevValue+1 {
			return false
		}
	}
	return true
}

// hasPairInSuit checks if player has a pair in the given suit
func hasPairInSuit(cards []Card, suit string) bool {
	suitCards := make(map[string]int)
	for _, card := range cards {
		if card.Suit == suit {
			suitCards[card.Value]++
		}
	}
	for _, count := range suitCards {
		if count >= 2 {
			return true
		}
	}
	return false
}

// validateSingleSuitFollow validates following with single cards (when can't match pair/triple)
func validateSingleSuitFollow(cards []Card, leadSuit string) error {
	// Check if player has any card of lead suit
	hasLeadSuit := false
	for _, card := range cards {
		if card.Suit == leadSuit {
			hasLeadSuit = true
			break
		}
	}

	if hasLeadSuit {
		// If player has lead suit, all played cards must be of lead suit
		for _, card := range cards {
			if card.Suit != leadSuit {
				return fmt.Errorf("must follow suit if possible")
			}
		}
	}

	return nil
}

// ==================== 抢庄相关函数 ====================

// CallDealer handles a player calling for dealer (抢庄)
// 玩家用级牌叫庄，决定主牌花色
func CallDealer(gameID, userID string, suit string, cardIndices []int) (*GameTable, error) {
	table, err := GetTableGame(gameID)
	if err != nil {
		return nil, err
	}

	if table.Status != "calling" {
		return nil, fmt.Errorf("game not in calling phase")
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

	if table.CallPhase != "counting" {
		return nil, fmt.Errorf("not in countdown phase")
	}

	// Validate card indices and check they are rank cards
	rank := table.TrumpRank // 当前级牌点数（如"2"）
	var cardsToPlay []Card
	for _, idx := range cardIndices {
		if idx < 0 || idx >= len(hand.Cards) {
			return nil, fmt.Errorf("invalid card index")
		}
		card := hand.Cards[idx]
		// 检查是否是级牌
		if card.Value != rank {
			return nil, fmt.Errorf("只能用级牌叫庄")
		}
		cardsToPlay = append(cardsToPlay, card)
	}

	// 检查是否是同花色的级牌
	firstSuit := cardsToPlay[0].Suit
	for _, card := range cardsToPlay {
		if card.Suit != firstSuit {
			return nil, fmt.Errorf("叫庄的级牌必须是同花色")
		}
	}

	// 记录叫庄
	table.CallRecords = append(table.CallRecords, CallRecord{
		Seat:      playerSeat,
		Suit:      suit,
		Rank:      rank,
		Count:     len(cardsToPlay),
		Timestamp: time.Now().UnixNano(),
	})

	// 检查反庄（如果之前已经有人叫庄）
	if len(table.CallRecords) > 1 {
		lastCall := table.CallRecords[len(table.CallRecords)-2]
		// 反庄规则：
		// 1. 同花色反：使用相同花色、相同点数的级牌，张数必须更多
		// 2. 升级反：使用比当前级牌高1级或以上的级牌 → 自己成为新庄家
		if suit == lastCall.Suit && rank == lastCall.Rank {
			// 同花色反，张数必须更多
			if len(cardsToPlay) <= lastCall.Count {
				return nil, fmt.Errorf("反庄张数必须多于当前叫庄")
			}
			if len(cardsToPlay) > 3 {
				return nil, fmt.Errorf("反主最多3张")
			}
		} else {
			// 升级反：使用更高级的牌反庄，自己成为新庄家
			currentRankValue := getCardNumericValue(lastCall.Rank)
			newRankValue := getCardNumericValue(rank)
			if newRankValue <= currentRankValue {
				return nil, fmt.Errorf("升级反必须用更高级的牌")
			}
			// 升级反成功，更新庄家和级牌
			table.TrumpRank = rank
			table.DealerSeat = playerSeat
			table.TrumpSuit = suit
			table.HostID = table.PlayerHands[playerSeat].UserID
			table.CallPhase = "finished"
			table.UpdatedAt = time.Now()

			// 如果是单人模式，直接进入找朋友阶段
			if isSinglePlayerGame(table) {
				return finalizeDealerAndStartPlaying(table)
			}

			return table, nil
		}
	}

	// 设置庄家和主牌花色
	table.DealerSeat = playerSeat
	table.TrumpSuit = suit
	table.HostID = table.PlayerHands[playerSeat].UserID
	table.CallPhase = "finished"

	// 如果是单人模式，直接进入找朋友阶段
	if isSinglePlayerGame(table) {
		return finalizeDealerAndStartPlaying(table)
	}

	table.UpdatedAt = time.Now()
	return table, nil
}

// isSinglePlayerGame checks if this is a single player game
func isSinglePlayerGame(table *GameTable) bool {
	aiCount := 0
	for _, hand := range table.PlayerHands {
		if len(hand.UserID) >= 3 && hand.UserID[:3] == "ai_" {
			aiCount++
		}
	}
	return aiCount == 4
}

// FlipBottomCard handles flipping a card from the bottom to determine dealer
// 翻底牌定庄
func FlipBottomCard(gameID string) (*GameTable, error) {
	table, err := GetTableGame(gameID)
	if err != nil {
		return nil, err
	}

	if table.Status != "calling" {
		return nil, fmt.Errorf("game not in calling phase")
	}

	if table.CallPhase != "flipping" {
		return nil, fmt.Errorf("not in flipping phase")
	}

	if len(table.FlippedBottomCards) >= len(table.BottomCards) {
		return nil, fmt.Errorf("all bottom cards have been flipped")
	}

	// 翻开下一张底牌
	nextCard := table.BottomCards[len(table.FlippedBottomCards)]
	table.FlippedBottomCards = append(table.FlippedBottomCards, nextCard)

	// 检查是否翻到了级牌
	rank := table.TrumpRank
	if nextCard.Value == rank {
		// 找到了级牌，确定庄家
		// 找出所有打这个级别的玩家，按逆时针顺序选择距离起始发牌人最近的
		var candidates []int
		for seat, hand := range table.PlayerHands {
			// 检查玩家的等级
			user, err := GetUserByID(hand.UserID)
			if err == nil && user.Level == rank {
				candidates = append(candidates, seat)
			}
		}

		if len(candidates) > 0 {
			// 按逆时针顺序找最近的
			selectedSeat := findClosestSeatCounterClockwise(table.StartingDealerSeat, candidates)
			table.DealerSeat = selectedSeat
			table.TrumpSuit = nextCard.Suit
			table.HostID = table.PlayerHands[selectedSeat].UserID
			table.CallPhase = "finished"

			return finalizeDealerAndStartPlaying(table)
		}
	}

	// 如果翻完了所有底牌还没定庄，则首发人当庄
	if len(table.FlippedBottomCards) >= len(table.BottomCards) {
		table.DealerSeat = table.StartingDealerSeat
		table.TrumpSuit = table.BottomCards[len(table.BottomCards)-1].Suit
		table.HostID = table.PlayerHands[table.StartingDealerSeat].UserID
		table.CallPhase = "finished"

		return finalizeDealerAndStartPlaying(table)
	}

	table.UpdatedAt = time.Now()
	return table, nil
}

// findClosestSeatCounterClockwise finds the closest seat going counter-clockwise
// 从起始发牌人开始，按逆时针顺序找最近的玩家
func findClosestSeatCounterClockwise(startingSeat int, candidates []int) int {
	if len(candidates) == 0 {
		return startingSeat
	}
	if len(candidates) == 1 {
		return candidates[0]
	}

	// 按逆时针顺序检查（逆时针：1->5->4->3->2->1）
	// 也就是顺时针的反方向
	for i := 0; i < 5; i++ {
		seat := ((startingSeat - 1 - i + 5) % 5) + 1
		for _, candidate := range candidates {
			if candidate == seat {
				return candidate
			}
		}
	}

	return candidates[0]
}

// finalizeDealerAndStartPlaying finalizes dealer selection and starts the playing phase
func finalizeDealerAndStartPlaying(table *GameTable) (*GameTable, error) {
	// 庄家收取底牌
	if dealerHand, ok := table.PlayerHands[table.DealerSeat]; ok {
		// 将底牌加入庄家手牌（后续需要扣回7张）
		for _, card := range table.BottomCards {
			dealerHand.Cards = append(dealerHand.Cards, card)
		}
	}

	// 进入扣牌阶段，庄家需要从手牌中选择7张牌扣回底牌
	table.Status = "discarding"
	table.CallPhase = "discarding"
	table.UpdatedAt = time.Now()

	return table, nil
}

// DiscardBottomCards 庄家扣牌（选择7张牌扣回底牌）
func DiscardBottomCards(gameID string, userID string, cardIndices []int) (*GameTable, error) {
	table, err := GetTableGame(gameID)
	if err != nil {
		return nil, err
	}

	if table.Status != "discarding" {
		return nil, fmt.Errorf("game not in discarding phase")
	}

	// 验证只有庄家可以扣牌
	dealerHand, ok := table.PlayerHands[table.DealerSeat]
	if !ok || dealerHand.UserID != userID {
		return nil, fmt.Errorf("only dealer can discard cards")
	}

	// 验证选择了7张牌
	if len(cardIndices) != 7 {
		return nil, fmt.Errorf("must select exactly 7 cards to discard")
	}

	// 验证索引有效性
	for _, idx := range cardIndices {
		if idx < 0 || idx >= len(dealerHand.Cards) {
			return nil, fmt.Errorf("invalid card index: %d", idx)
		}
	}

	// 收集要扣的牌
	var discardedCards []Card
	usedIndices := make(map[int]bool)
	for _, idx := range cardIndices {
		if usedIndices[idx] {
			return nil, fmt.Errorf("duplicate card index: %d", idx)
		}
		usedIndices[idx] = true
		discardedCards = append(discardedCards, dealerHand.Cards[idx])
	}

	// 从庄家手牌中移除扣的牌
	newHandCards := make([]Card, 0, len(dealerHand.Cards)-7)
	for i, card := range dealerHand.Cards {
		if !usedIndices[i] {
			newHandCards = append(newHandCards, card)
		}
	}
	dealerHand.Cards = newHandCards
	table.PlayerHands[table.DealerSeat] = dealerHand

	// 将扣的牌放回底牌
	table.BottomCards = discardedCards

	// 进入游戏阶段
	table.Status = "playing"
	table.CurrentPlayer = table.DealerSeat // 庄家先出牌
	table.CallPhase = "finished"
	table.UpdatedAt = time.Now()

	return table, nil
}

// ==================== 抠底相关函数 ====================

// BottomCardMultiplier represents the multiplier for bottom cards
type BottomCardMultiplier struct {
	Multiplier int    `json:"multiplier"`
	Reason     string `json:"reason"`
}

// CalculateBottomMultiplier calculates the multiplier for bottom cards based on the last trick
// 抠底倍数计算：
// - 单张抠底：×1
// - 对子抠底：×2
// - 三张抠底：×4
// - 拖拉机抠底：对应牌型翻倍
func CalculateBottomMultiplier(lastTrick []PlayedCard, trumpSuit string) BottomCardMultiplier {
	if len(lastTrick) == 0 {
		return BottomCardMultiplier{Multiplier: 0, Reason: "没有出牌"}
	}

	// 获取最后一轮的领出牌
	leadSeat := lastTrick[0].Seat
	var leadCards []Card
	for _, pc := range lastTrick {
		if pc.Seat == leadSeat {
			leadCards = append(leadCards, pc.Card)
		} else {
			break
		}
	}

	leadCount := len(leadCards)

	// 检查牌型
	if leadCount == 1 {
		return BottomCardMultiplier{Multiplier: 1, Reason: "单张抠底"}
	}

	if leadCount == 2 {
		// 检查是否是对子
		if leadCards[0].Value == leadCards[1].Value && leadCards[0].Suit == leadCards[1].Suit {
			return BottomCardMultiplier{Multiplier: 2, Reason: "对子抠底"}
		}
	}

	if leadCount == 3 {
		// 检查是否是三张
		if leadCards[0].Value == leadCards[1].Value && leadCards[1].Value == leadCards[2].Value &&
			leadCards[0].Suit == leadCards[1].Suit && leadCards[1].Suit == leadCards[2].Suit {
			return BottomCardMultiplier{Multiplier: 4, Reason: "三张抠底"}
		}
	}

	if leadCount >= 4 && leadCount%2 == 0 {
		// 检查是否是拖拉机（连对）
		if isValidTractor(leadCards) {
			pairCount := leadCount / 2
			return BottomCardMultiplier{Multiplier: pairCount, Reason: fmt.Sprintf("拖拉机抠底（%d对）", pairCount)}
		}
	}

	// 默认单张
	return BottomCardMultiplier{Multiplier: 1, Reason: "单张抠底"}
}

// isValidTractor checks if cards form a valid tractor (consecutive pairs or triples)
func isValidTractor(cards []Card) bool {
	if len(cards) < 4 {
		return false
	}

	// 检查是否同花色
	firstSuit := cards[0].Suit
	for _, card := range cards {
		if card.Suit != firstSuit {
			return false
		}
	}

	// Count occurrences of each value
	valueCounts := make(map[string]int)
	for _, card := range cards {
		valueCounts[card.Value]++
	}

	// Check if all values have the same count (either all 2s or all 3s)
	var expectedCount int
	firstValue := true
	for _, count := range valueCounts {
		if firstValue {
			expectedCount = count
			firstValue = false
			// Must be either 2 (pairs) or 3 (triples)
			if expectedCount != 2 && expectedCount != 3 {
				return false
			}
		} else {
			if count != expectedCount {
				return false
			}
		}
	}

	// Must have at least 2 groups
	if len(valueCounts) < 2 {
		return false
	}

	// 检查是否连续
	values := make([]string, 0, len(valueCounts))
	for value := range valueCounts {
		values = append(values, value)
	}

	sort.Slice(values, func(i, j int) bool {
		return getCardNumericValue(values[i]) < getCardNumericValue(values[j])
	})

	for i := 1; i < len(values); i++ {
		prevValue := getCardNumericValue(values[i-1])
		currValue := getCardNumericValue(values[i])
		if currValue != prevValue+1 {
			return false
		}
	}

	return true
}

// CalculateBottomCardsScore calculates the total score from bottom cards with multiplier
func CalculateBottomCardsScore(bottomCards []Card, multiplier int) int {
	if multiplier == 0 {
		return 0
	}

	totalScore := 0
	for _, card := range bottomCards {
		totalScore += getCardPoints(card)
	}

	return totalScore * multiplier
}

// AutoCallForDealer 自动为AI玩家叫庄（单人模式）
func AutoCallForDealer(gameID string) (*GameTable, error) {
	table, err := GetTableGame(gameID)
	if err != nil {
		return nil, err
	}

	if table.Status != "calling" && table.Status != "playing" {
		return nil, fmt.Errorf("game not in calling phase")
	}

	if table.TrumpSuit != "" {
		// Already has trump suit, skip
		return table, nil
	}

	// 在单人模式中，玩家1（人类）是庄家，直接使用人类玩家的最长花色作为主牌
	if hand, ok := table.PlayerHands[1]; ok {
		// 找出最长的花色
		suitCounts := make(map[string]int)
		for _, card := range hand.Cards {
			suitCounts[card.Suit]++
		}

		longestSuit := ""
		maxCount := 0
		for suit, count := range suitCounts {
			if count > maxCount && suit != "joker" {
				maxCount = count
				longestSuit = suit
			}
		}

		table.DealerSeat = 1
		table.TrumpSuit = longestSuit
		table.CallPhase = "finished"

		return finalizeDealerAndStartPlaying(table)
	}

	return nil, fmt.Errorf("human player not found")
}
