package handlers

import (
	"fmt"
	"leve_up/middleware"
	"leve_up/models"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var frontendDistDir = "../frontend/dist"

// SetFrontendDistDir sets frontend build output directory.
func SetFrontendDistDir(distDir string) {
	if distDir != "" {
		frontendDistDir = distDir
	}
}

// ServeFrontendIndex serves the SPA entry file.
func ServeFrontendIndex(c *gin.Context) {
	indexPath := filepath.Join(frontendDistDir, "index.html")
	if _, err := os.Stat(indexPath); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Frontend build not found. Please run `cd frontend && npm run build` first.",
		})
		return
	}
	c.File(indexPath)
}

func parseCardIndices(data map[string]string, keys ...string) ([]int, error) {
	for _, key := range keys {
		raw := strings.TrimSpace(data[key])
		if raw == "" {
			continue
		}

		parts := strings.Split(raw, ",")
		result := make([]int, 0, len(parts))
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			value, err := strconv.Atoi(part)
			if err != nil {
				return nil, fmt.Errorf("invalid card index: %s", part)
			}
			result = append(result, value)
		}
		if len(result) > 0 {
			return result, nil
		}
	}
	return nil, fmt.Errorf("no card indices provided")
}

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
		"gameId":  game.ID,
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

	cardIndices, err := parseCardIndices(data, "cardIndices", "cardIndex")
	if err != nil {
		middleware.SendError(c, http.StatusBadRequest, err.Error())
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

	if suit == "" || value == "" {
		middleware.SendError(c, http.StatusBadRequest, "suit and value are required")
		return
	}

	position := 1 // default
	if strings.TrimSpace(positionStr) != "" {
		if parsed, err := strconv.Atoi(strings.TrimSpace(positionStr)); err == nil {
			position = parsed
		}
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

	cardIndices, err := parseCardIndices(data, "cardIndices", "cardIndex")

	if suit == "" {
		middleware.SendError(c, http.StatusBadRequest, "suit is required")
		return
	}

	if err != nil {
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

	cardIndices, err := parseCardIndices(data, "cardIndices", "cardIndex")
	if err != nil {
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
		"gameId":  game.ID,
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

	players := make([]map[string]interface{}, 0)
	scores := make(map[int]int)
	myPosition := 0
	myHand := make([]models.Card, 0)

	for seat := 1; seat <= 5; seat++ {
		if hand, ok := table.PlayerHands[seat]; ok {
			username := fmt.Sprintf("玩家%d", seat)
			isAI := strings.HasPrefix(hand.UserID, "ai_")
			if isAI {
				username = fmt.Sprintf("AI-%d", seat)
			} else if u, err := models.GetUserByID(hand.UserID); err == nil {
				username = u.Username
			}

			playerInfo := map[string]interface{}{
				"id":        seat,
				"userId":    hand.UserID,
				"position":  seat,
				"username":  username,
				"isReady":   table.Status != "waiting",
				"isAI":      isAI,
				"cardCount": len(hand.Cards),
				"isFriend":  hand.IsFriend,
			}
			players = append(players, playerInfo)

			scores[seat] = hand.Score
			if hand.UserID == user.ID {
				myPosition = seat
				myHand = hand.Cards
			}
		}
	}

	currentTrick := make([]map[string]interface{}, 0, len(table.CurrentTrick))
	for _, trick := range table.CurrentTrick {
		currentTrick = append(currentTrick, map[string]interface{}{
			"playerId": trick.Seat,
			"cards":    []models.Card{trick.Card},
		})
	}

	dealerTeam := make([]int, 0, 2)
	if table.DealerSeat > 0 {
		dealerTeam = append(dealerTeam, table.DealerSeat)
	}
	if table.FriendRevealed && table.FriendSeat > 0 {
		dealerTeam = append(dealerTeam, table.FriendSeat)
	}

	var trumpSuit interface{}
	if table.TrumpSuit != "" {
		trumpSuit = table.TrumpSuit
	}

	gamePayload := map[string]interface{}{
		"id":           table.GameID,
		"status":       table.Status,
		"currentLevel": table.CurrentLevel,
		"currentPlayer": table.CurrentPlayer,
		"dealerTeam":   dealerTeam,
		"currentTrick": currentTrick,
		"players":      players,
		"myHand":       myHand,
		"myPosition":   myPosition,
		"trumpSuit":    trumpSuit,
		"bottomCards":  table.BottomCards,
		"scores":       scores,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"game":    gamePayload,
		// Backward-compatible fields
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
		"myHand":         myHand,
	})
}

// Page handlers

func IndexHandler(c *gin.Context) {
	renderTemplatePage(c, "index.html", "找朋友升级 - 首页", nil)
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

// resolveOptionalUser tries to resolve user from context, header, or cookie.
func resolveOptionalUser(c *gin.Context) (*models.User, bool) {
	if user, ok := middleware.GetCurrentUser(c); ok {
		return user, true
	}

	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			if user, ok := tryGetUserFromToken(parts[1]); ok {
				c.Set("user", user)
				c.Set("userID", user.ID)
				return user, true
			}
		}
	}

	cookieToken, err := c.Cookie("token")
	if err == nil && cookieToken != "" {
		if user, ok := tryGetUserFromToken(cookieToken); ok {
			c.Set("user", user)
			c.Set("userID", user.ID)
			return user, true
		}
	}

	return nil, false
}

func renderTemplatePage(c *gin.Context, templateName, title string, data gin.H) {
	_ = templateName
	_ = title
	_ = data
	ServeFrontendIndex(c)
}

func LoginPageHandler(c *gin.Context) {
	renderTemplatePage(c, "login.html", "登录 - 找朋友升级", nil)
}

func RegisterPageHandler(c *gin.Context) {
	renderTemplatePage(c, "register.html", "注册 - 找朋友升级", nil)
}

func RulesPageHandler(c *gin.Context) {
	renderTemplatePage(c, "rules.html", "游戏规则 - 找朋友升级", nil)
}

func GamePageHandler(c *gin.Context) {
	renderTemplatePage(c, "game.html", "游戏大厅 - 找朋友升级", nil)
}

func GameTablePageHandler(c *gin.Context) {
	ServeFrontendIndex(c)
}

// SinglePlayerGamePageHandler handles single player game page
func SinglePlayerGamePageHandler(c *gin.Context) {
	ServeFrontendIndex(c)
}

// ReplayPageHandler handles game replay page
func ReplayPageHandler(c *gin.Context) {
	ServeFrontendIndex(c)
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
