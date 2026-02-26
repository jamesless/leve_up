package handlers

import (
	"encoding/json"
	"fmt"
	"html/template"
	"leve_up/middleware"
	"leve_up/models"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Register handles user registration
func Register(c *gin.Context) {
	data, ok := middleware.ParseForm(c)
	if !ok {
		return
	}

	if errMsg, ok := middleware.RequireFields(data, []string{"username", "password"}); !ok {
		middleware.SendError(c, http.StatusBadRequest, errMsg)
		return
	}

	username := data["username"]
	password := data["password"]

	// Check password length
	if len(password) < 4 {
		middleware.SendError(c, http.StatusBadRequest, "Password must be at least 4 characters")
		return
	}

	// Create user
	user, err := models.CreateUser(username, password)
	if err == models.ErrUserExists {
		middleware.SendError(c, http.StatusConflict, "Username already exists")
		return
	}
	if err != nil {
		log.Println("CreateUser error:", err)
		middleware.SendError(c, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// Generate token
	token, err := middleware.GenerateToken(user.ID)
	if err != nil {
		middleware.SendError(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	// Set token as cookie for page navigation
	c.SetSameSite(http.SameSiteDefaultMode)
	c.SetCookie("token", token, 86400, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Registration successful",
		"token":   token,
		"user":    user,
	})
}

// Login handles user login
func Login(c *gin.Context) {
	data, ok := middleware.ParseForm(c)
	if !ok {
		return
	}

	if errMsg, ok := middleware.RequireFields(data, []string{"username", "password"}); !ok {
		middleware.SendError(c, http.StatusBadRequest, errMsg)
		return
	}

	username := data["username"]
	password := data["password"]

	// Find user
	user, err := models.GetUserByUsername(username)
	if err == models.ErrUserNotFound {
		middleware.SendError(c, http.StatusUnauthorized, "Invalid username or password")
		return
	}
	if err != nil {
		middleware.SendError(c, http.StatusInternalServerError, "Login failed")
		return
	}

	// Check password (in production, use bcrypt)
	if user.Password != password {
		middleware.SendError(c, http.StatusUnauthorized, "Invalid username or password")
		return
	}

	// Generate token
	token, err := middleware.GenerateToken(user.ID)
	if err != nil {
		middleware.SendError(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	// Set token as cookie for page navigation
	c.SetSameSite(http.SameSiteDefaultMode)
	c.SetCookie("token", token, 86400, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"token":   token,
		"user":    user,
	})
}

// Logout handles user logout
func Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

// GetCurrentUser returns the current logged-in user
func GetCurrentUser(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    user,
	})
}

// CreateGame creates a new game room
func CreateGame(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)

	data, ok := middleware.ParseForm(c)
	if !ok {
		return
	}

	gameName := "新房间"
	if data["name"] != "" {
		gameName = data["name"]
	}

	game, err := models.CreateGame(gameName, user.ID)
	if err != nil {
		middleware.SendError(c, http.StatusInternalServerError, "Failed to create game")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"game":    game,
	})
}

// GetGame retrieves a game by ID
func GetGame(c *gin.Context) {
	gameID := c.Param("id")

	game, err := models.GetGame(gameID)
	if err == models.ErrGameNotFound {
		middleware.SendError(c, http.StatusNotFound, "Game not found")
		return
	}
	if err != nil {
		middleware.SendError(c, http.StatusInternalServerError, "Failed to get game")
		return
	}

	// Get player details
	players := make([]map[string]interface{}, 0)
	for _, playerID := range game.PlayerIDs {
		if user, err := models.GetUserByID(playerID); err == nil {
			players = append(players, map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
				"level":    user.Level,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"game":    game,
		"players": players,
	})
}

// JoinGame adds a player to a game
func JoinGame(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	gameID := c.Param("id")

	err := models.JoinGame(gameID, user.ID)
	if err == models.ErrGameNotFound {
		middleware.SendError(c, http.StatusNotFound, "Game not found")
		return
	}
	if err == models.ErrGameFull {
		middleware.SendError(c, http.StatusConflict, "Game is full")
		return
	}
	if err != nil {
		middleware.SendError(c, http.StatusInternalServerError, "Failed to join game")
		return
	}

	game, _ := models.GetGame(gameID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Joined game successfully",
		"game":    game,
	})
}

// PlayCard handles playing a card or multiple cards
func PlayCard(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	gameID := c.Param("id")

	data, ok := middleware.ParseForm(c)
	if !ok {
		return
	}

	// Support both old single card and new multi-card formats
	var cardIndices []int

	if data["cardIndices"] != "" {
		// New format: comma-separated indices
		indexStrs := strings.Split(data["cardIndices"], ",")
		for _, idxStr := range indexStrs {
			var idx int
			fmt.Sscanf(strings.TrimSpace(idxStr), "%d", &idx)
			cardIndices = append(cardIndices, idx)
		}
	} else if data["cardIndex"] != "" {
		// Old format: single index
		var cardIndex int
		fmt.Sscanf(data["cardIndex"], "%d", &cardIndex)
		cardIndices = []int{cardIndex}
	}

	if len(cardIndices) == 0 {
		middleware.SendError(c, http.StatusBadRequest, "No card indices provided")
		return
	}

	result, err := models.PlayCardsGame(gameID, user.ID, cardIndices)
	if err != nil {
		fmt.Printf("PlayCardsGame error: %v, cardIndices: %v\n", err, cardIndices)
		middleware.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Log the play action
	game, _ := models.GetGame(gameID)
	if game != nil {
		playerSeat := 0
		for i, id := range game.PlayerIDs {
			if id == user.ID {
				playerSeat = i + 1
				break
			}
		}

		models.LogGameAction(models.GameActionLogRequest{
			GameID:     gameID,
			ActionType: "play_cards",
			PlayerSeat: playerSeat,
			PlayerID:   user.ID,
			ActionData: map[string]interface{}{
				"cardIndices": cardIndices,
			},
			ResultData: result,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  result,
	})
}

// StartGameHandler starts a game (deals cards)
func StartGameHandler(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	gameID := c.Param("id")

	table, err := models.StartGame(gameID, user.ID)
	if err != nil {
		middleware.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"table":   table,
		"message": "游戏开始，请抢庄",
	})
}

// CallFriendHandler handles the host calling a friend card
func CallFriendHandler(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	gameID := c.Param("id")

	data, ok := middleware.ParseForm(c)
	if !ok {
		return
	}

	suit := data["suit"]
	value := data["value"]
	positionStr := data["position"]

	if suit == "" || value == "" || positionStr == "" {
		middleware.SendError(c, http.StatusBadRequest, "suit, value and position are required")
		return
	}

	// Parse position (第几张：1, 2, or 3)
	position := 1 // default
	if positionStr != "" {
		fmt.Sscanf(positionStr, "%d", &position)
	}

	err := models.CallFriendCard(gameID, user.ID, suit, value, position)
	if err != nil {
		middleware.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Log the call friend action
	game, _ := models.GetGame(gameID)
	if game != nil {
		playerSeat := 0
		for i, id := range game.PlayerIDs {
			if id == user.ID {
				playerSeat = i + 1
				break
			}
		}

		models.LogGameAction(models.GameActionLogRequest{
			GameID:     gameID,
			ActionType: "call_friend",
			PlayerSeat: playerSeat,
			PlayerID:   user.ID,
			ActionData: map[string]interface{}{
				"suit":     suit,
				"value":    value,
				"position": position,
			},
			ResultData: nil,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Friend card called",
	})
}

// CallDealerHandler handles a player calling for dealer (抢庄)
func CallDealerHandler(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	gameID := c.Param("id")

	data, ok := middleware.ParseForm(c)
	if !ok {
		return
	}

	suit := data["suit"]

	// 解析牌的索引
	var cardIndices []int
	if data["cardIndices"] != "" {
		indexStrs := strings.Split(data["cardIndices"], ",")
		for _, idxStr := range indexStrs {
			var idx int
			fmt.Sscanf(strings.TrimSpace(idxStr), "%d", &idx)
			cardIndices = append(cardIndices, idx)
		}
	}

	if suit == "" {
		middleware.SendError(c, http.StatusBadRequest, "suit is required")
		return
	}

	if len(cardIndices) == 0 {
		middleware.SendError(c, http.StatusBadRequest, "cardIndices is required")
		return
	}

	table, err := models.CallDealer(gameID, user.ID, suit, cardIndices)
	if err != nil {
		middleware.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Log the call dealer action
	game, _ := models.GetGame(gameID)
	if game != nil {
		playerSeat := 0
		for i, id := range game.PlayerIDs {
			if id == user.ID {
				playerSeat = i + 1
				break
			}
		}

		models.LogGameAction(models.GameActionLogRequest{
			GameID:     gameID,
			ActionType: "call_dealer",
			PlayerSeat: playerSeat,
			PlayerID:   user.ID,
			ActionData: map[string]interface{}{
				"suit":        suit,
				"cardIndices": cardIndices,
			},
			ResultData: table,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"table":   table,
		"message": "抢庄成功",
	})
}

// FlipBottomCardHandler handles flipping a card from the bottom
func FlipBottomCardHandler(c *gin.Context) {
	gameID := c.Param("id")

	table, err := models.FlipBottomCard(gameID)
	if err != nil {
		middleware.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"table":   table,
	})
}

// DiscardBottomCardsHandler handles the dealer discarding cards to the bottom
func DiscardBottomCardsHandler(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	gameID := c.Param("id")

	data, ok := middleware.ParseForm(c)
	if !ok {
		return
	}

	// 解析牌的索引
	var cardIndices []int
	if data["cardIndices"] != "" {
		indexStrs := strings.Split(data["cardIndices"], ",")
		for _, idxStr := range indexStrs {
			var idx int
			fmt.Sscanf(strings.TrimSpace(idxStr), "%d", &idx)
			cardIndices = append(cardIndices, idx)
		}
	}

	if len(cardIndices) == 0 {
		middleware.SendError(c, http.StatusBadRequest, "cardIndices is required")
		return
	}

	table, err := models.DiscardBottomCards(gameID, user.ID, cardIndices)
	if err != nil {
		middleware.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Log the discard action
	game, _ := models.GetGame(gameID)
	if game != nil {
		playerSeat := 0
		for i, id := range game.PlayerIDs {
			if id == user.ID {
				playerSeat = i + 1
				break
			}
		}

		models.LogGameAction(models.GameActionLogRequest{
			GameID:     gameID,
			ActionType: "discard_bottom",
			PlayerSeat: playerSeat,
			PlayerID:   user.ID,
			ActionData: map[string]interface{}{
				"cardIndices": cardIndices,
			},
			ResultData: table,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"table":   table,
		"message": "扣牌成功",
	})
}

// CreateSinglePlayerGame creates a single player game with AI opponents
func CreateSinglePlayerGame(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)

	data, ok := middleware.ParseForm(c)
	if !ok {
		return
	}

	gameName := "单人练习"
	if data["name"] != "" {
		gameName = data["name"]
	}

	game, err := models.CreateSinglePlayerGame(gameName, user.ID)
	if err != nil {
		log.Println("CreateSinglePlayerGame error:", err)
		middleware.SendError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"game":    game,
	})
}

// StartSinglePlayerGame starts a single player game and auto-plays AI
func StartSinglePlayerGame(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	gameID := c.Param("id")

	table, err := models.StartSinglePlayerGame(gameID, user.ID)
	if err != nil {
		middleware.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 自动为玩家抢庄（单人模式）
	table, err = models.AutoCallForDealer(gameID)
	if err != nil {
		middleware.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"table":   table,
	})
}

// AIPlayHandler makes AI players play automatically
func AIPlayHandler(c *gin.Context) {
	gameID := c.Param("id")

	table, err := models.AIPlayTurn(gameID)
	if err != nil {
		middleware.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"table":   table,
	})
}

// GetGameTableHandler returns the current game table state
func GetGameTableHandler(c *gin.Context) {
	gameID := c.Param("id")
	user, _ := middleware.GetCurrentUser(c)

	table, err := models.GetTableGame(gameID)
	if err != nil {
		middleware.SendError(c, http.StatusNotFound, err.Error())
		return
	}

	// Build players list with card counts
	players := make([]map[string]interface{}, 0)
	for seat := 1; seat <= 5; seat++ {
		if hand, ok := table.PlayerHands[seat]; ok {
			playerInfo := map[string]interface{}{
				"seat":      seat,
				"cardCount": len(hand.Cards),
				"isFriend":  hand.IsFriend,
			}
			// Check if this is an AI player
			if hand.UserID[:3] == "ai_" {
				playerInfo["isAI"] = true
				playerInfo["username"] = fmt.Sprintf("AI-%d", seat)
			} else {
				playerInfo["isAI"] = false
				playerInfo["userId"] = hand.UserID
			}
			players = append(players, playerInfo)
		}
	}

	// Only include current player's hand
	response := map[string]interface{}{
		"success":        true,
		"gameId":         table.GameID,
		"status":         table.Status,
		"currentLevel":   table.CurrentLevel,
		"trumpSuit":      table.TrumpSuit,
		"hostCalledCard": table.HostCalledCard,
		"friendRevealed": table.FriendRevealed,
		"friendSeat":     table.FriendSeat,
		"currentPlayer":  table.CurrentPlayer,
		"currentTrick":   table.CurrentTrick,
		"lastPlay":       table.LastPlay,
		"players":        players,
	}

	// Add player's hand if they're in the game
	for _, hand := range table.PlayerHands {
		if hand.UserID == user.ID {
			response["myHand"] = hand
			break
		}
	}

	c.JSON(http.StatusOK, response)
}

// Page handlers

func IndexHandler(c *gin.Context) {
	// Try to get user from token if available
	data := gin.H{"title": "找朋友升级 - 首页"}

	// Check Authorization header for token
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			// Token present, try to validate and get user
			if user, ok := tryGetUserFromToken(parts[1]); ok {
				data["user"] = user
				data["loggedIn"] = true
				middleware.SendHTML(c, "index.html", data)
				return
			}
		}
	}

	// No valid token, show logged out view
	data["loggedIn"] = false
	c.HTML(http.StatusOK, "index.html", data)
}

// tryGetUserFromToken attempts to get user from JWT token
func tryGetUserFromToken(tokenString string) (*models.User, bool) {
	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return middleware.GetJWTSecret(), nil
	})

	if err != nil || !token.Valid {
		return nil, false
	}

	user, err := models.GetUserByID(claims.UserID)
	if err != nil {
		return nil, false
	}

	return user, true
}

func LoginPageHandler(c *gin.Context) {
	middleware.SendHTML(c, "login.html", gin.H{
		"title": "登录 - 找朋友升级",
	})
}

func RegisterPageHandler(c *gin.Context) {
	middleware.SendHTML(c, "register.html", gin.H{
		"title": "注册 - 找朋友升级",
	})
}

func RulesPageHandler(c *gin.Context) {
	middleware.SendHTML(c, "rules.html", gin.H{
		"title": "游戏规则 - 找朋友升级",
	})
}

func GamePageHandler(c *gin.Context) {
	middleware.SendHTML(c, "game.html", gin.H{
		"title": "游戏大厅 - 找朋友升级",
	})
}

func GameTablePageHandler(c *gin.Context) {
	user, ok := middleware.GetCurrentUser(c)
	if !ok {
		// Not logged in, redirect to login
		c.Redirect(http.StatusFound, "/login")
		return
	}

	gameID := c.Param("id")

	// Get game info
	game, err := models.GetGame(gameID)
	if err != nil {
		middleware.SendError(c, http.StatusNotFound, "Game not found")
		return
	}

	// Get table state
	table, err := models.GetTableGame(gameID)
	if err != nil {
		middleware.SendError(c, http.StatusInternalServerError, "Failed to get game state")
		return
	}

	// Get players info
	players := make([]map[string]interface{}, 0)
	for i, playerID := range game.PlayerIDs {
		if u, err := models.GetUserByID(playerID); err == nil {
			seat := i + 1
			playerInfo := map[string]interface{}{
				"id":       u.ID,
				"username": u.Username,
				"level":    u.Level,
				"seat":     seat,
			}
			// Add card count if game is playing
			if table.Status == "playing" {
				if hand, ok := table.PlayerHands[seat]; ok {
					playerInfo["cardCount"] = len(hand.Cards)
					playerInfo["isFriend"] = hand.IsFriend
				}
			}
			players = append(players, playerInfo)
		} else {
			// AI player
			seat := i + 1
			playerInfo := map[string]interface{}{
				"id":       playerID,
				"username": "AI " + playerID[len(playerID)-1:],
				"level":    "2",
				"seat":     seat,
				"isAI":     true,
			}
			if table.Status == "playing" {
				if hand, ok := table.PlayerHands[seat]; ok {
					playerInfo["cardCount"] = len(hand.Cards)
					playerInfo["isFriend"] = hand.IsFriend
				}
			}
			players = append(players, playerInfo)
		}
	}

	// Get current user's seat
	mySeat := 0
	for i, playerID := range game.PlayerIDs {
		if playerID == user.ID {
			mySeat = i + 1
			break
		}
	}

	// Get my hand if game is playing
	var myHand *models.PlayerHand
	if table.Status == "playing" {
		for _, hand := range table.PlayerHands {
			if hand.UserID == user.ID {
				myHand = hand
				break
			}
		}
	}

	// Build game JSON for frontend
	gameData := map[string]interface{}{
		"id":             game.ID,
		"name":           game.Name,
		"status":         table.Status,
		"currentLevel":   table.CurrentLevel,
		"currentPlayer":  table.CurrentPlayer,
		"trumpSuit":      table.TrumpSuit,
		"players":        players,
		"mySeat":         mySeat,
		"hostCalledCard": table.HostCalledCard,
		"friendRevealed": table.FriendRevealed,
		"friendSeat":     table.FriendSeat,
		"currentTrick":   table.CurrentTrick,
	}
	gameJSON, _ := json.Marshal(gameData)

	// Build my hand JSON
	var myHandJSON string
	if myHand != nil {
		handBytes, _ := json.Marshal(myHand)
		myHandJSON = string(handBytes)
	} else {
		myHandJSON = "null"
	}

	middleware.SendHTML(c, "game_table.html", gin.H{
		"title":      fmt.Sprintf("%s - 找朋友升级", game.Name),
		"game":       game,
		"gameJSON":   template.HTML(string(gameJSON)),
		"myHandJSON": template.HTML(myHandJSON),
		"user":       user,
		"loggedIn":   true,
	})
}

// SinglePlayerGamePageHandler handles single player game page
func SinglePlayerGamePageHandler(c *gin.Context) {
	// Try to get user from Authorization header
	user, ok := middleware.GetCurrentUser(c)

	// If no user from header, try from cookie
	if !ok {
		cookie, err := c.Cookie("token")
		if err == nil && cookie != "" {
			user, ok = tryGetUserFromToken(cookie)
		}
	}

	// Still no user, render page with logged_out state
	gameID := c.Param("id")

	// If user is not authenticated, still render page but let frontend handle auth
	if !ok {
		// Render page without game data, frontend will load via API
		middleware.SendHTML(c, "singleplayer_game.html", gin.H{
			"title":    "单人游戏 - 找朋友升级",
			"gameID":   gameID,
			"loggedIn": false,
		})
		return
	}

	// Get game info
	game, err := models.GetGame(gameID)
	if err != nil {
		middleware.SendError(c, http.StatusNotFound, "Game not found")
		return
	}

	// Start the game if not started
	if game.Status == "waiting" {
		table, err := models.StartSinglePlayerGame(gameID, user.ID)
		if err != nil {
			middleware.SendError(c, http.StatusBadRequest, err.Error())
			return
		}

		// Auto call dealer for single player mode
		table, err = models.AutoCallForDealer(gameID)
		if err != nil {
			middleware.SendError(c, http.StatusBadRequest, err.Error())
			return
		}
	}

	// Get table state
	table, err := models.GetTableGame(gameID)
	if err != nil {
		middleware.SendError(c, http.StatusInternalServerError, "Failed to get game state")
		return
	}

	// Get players info (with AI names)
	players := make([]map[string]interface{}, 0)
	for i, playerID := range game.PlayerIDs {
		seat := i + 1
		var username string
		var isAI bool

		if playerID == user.ID {
			username = user.Username
			isAI = false
		} else {
			username = fmt.Sprintf("AI-%d", seat)
			isAI = true
		}

		// Get player level
		var playerLevel string
		if !isAI {
			playerLevel = user.Level
		} else {
			playerLevel = "2" // AI default level
		}

		playerInfo := map[string]interface{}{
			"id":       playerID,
			"username": username,
			"level":    playerLevel,
			"seat":     seat,
			"isAI":     isAI,
		}

		if table.Status == "playing" {
			if hand, ok := table.PlayerHands[seat]; ok {
				playerInfo["cardCount"] = len(hand.Cards)
			}
		}
		players = append(players, playerInfo)
	}

	// Get my hand (human player is always seat 1)
	var myHand *models.PlayerHand
	if table.Status == "playing" {
		myHand = table.PlayerHands[1]
	}

	// Build game JSON for frontend
	gameData := map[string]interface{}{
		"id":             game.ID,
		"name":           game.Name,
		"status":         table.Status,
		"currentLevel":   table.CurrentLevel,
		"currentPlayer":  table.CurrentPlayer,
		"trumpSuit":      table.TrumpSuit,
		"players":        players,
		"mySeat":         1,
		"hostCalledCard": table.HostCalledCard,
		"friendRevealed": table.FriendRevealed,
		"friendSeat":     table.FriendSeat,
		"currentTrick":   table.CurrentTrick,
		"isSinglePlayer": true,
	}
	gameJSON, _ := json.Marshal(gameData)

	// Build my hand JSON
	var myHandJSON string
	if myHand != nil {
		handBytes, _ := json.Marshal(myHand)
		myHandJSON = string(handBytes)
	} else {
		myHandJSON = "null"
	}

	middleware.SendHTML(c, "singleplayer_game.html", gin.H{
		"title":        fmt.Sprintf("%s - 单人模式", game.Name),
		"gameID":       gameID,
		"game":         game,
		"currentLevel": table.CurrentLevel,
		"gameJSON":     template.HTML(string(gameJSON)),
		"myHandJSON":   template.HTML(myHandJSON),
		"user":         user,
		"loggedIn":     true,
	})
}

// ReplayPageHandler handles game replay page
func ReplayPageHandler(c *gin.Context) {
	// Check if user is logged in
	user, ok := middleware.GetCurrentUser(c)
	if !ok {
		// Try from cookie
		cookie, err := c.Cookie("token")
		if err == nil && cookie != "" {
			user, ok = tryGetUserFromToken(cookie)
		}
	}

	// Redirect to login if not authenticated
	if !ok {
		c.Redirect(http.StatusFound, "/login")
		return
	}

	gameID := c.Param("id")

	middleware.SendHTML(c, "replay.html", gin.H{
		"title":    "游戏回放 - 找朋友升级",
		"gameID":   gameID,
		"user":     user,
		"loggedIn": true,
	})
}

// GetGameReplayHandler retrieves the replay data for a specific game
func GetGameReplayHandler(c *gin.Context) {
	gameID := c.Param("id")

	replay, err := models.GetGameReplay(gameID)
	if err != nil {
		middleware.SendError(c, http.StatusNotFound, "Replay not found for this game")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"replay":  replay,
	})
}

// GetGameActionsHandler retrieves all action logs for a specific game
func GetGameActionsHandler(c *gin.Context) {
	gameID := c.Param("id")

	actions, err := models.GetGameActionLogs(gameID)
	if err != nil {
		middleware.SendError(c, http.StatusInternalServerError, "Failed to retrieve game actions")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"actions": actions,
		"count":   len(actions),
	})
}
