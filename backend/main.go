package main

import (
	"leve_up/handlers"
	"leve_up/middleware"
	"leve_up/models"
	ws "leve_up/websocket"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file - try multiple locations
	envPaths := []string{
		".env",         // Current directory
		"backend/.env", // If run from project root
		"../.env",      // If in a subdirectory
	}

	loaded := false
	for _, envPath := range envPaths {
		if err := godotenv.Load(envPath); err == nil {
			log.Printf("Loaded .env from %s", envPath)
			loaded = true
			break
		}
	}

	if !loaded {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize database
	if err := models.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Initialize WebSocket hub
	hub := ws.NewHub()
	go hub.Run()
	handlers.SetWebSocketHub(hub)
	log.Println("WebSocket hub started")

	// Create Gin router
	r := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	// Serve frontend build output (SPA)
	frontendDistDir := os.Getenv("FRONTEND_DIST_DIR")
	if frontendDistDir == "" {
		frontendDistDir = "../frontend/dist"
	}
	frontendDistDir = filepath.Clean(frontendDistDir)
	handlers.SetFrontendDistDir(frontendDistDir)
	r.Static("/assets", filepath.Join(frontendDistDir, "assets"))

	// Public routes
	r.GET("/", handlers.IndexHandler)
	r.GET("/login", handlers.LoginPageHandler)
	r.GET("/register", handlers.RegisterPageHandler)
	r.GET("/rules", handlers.RulesPageHandler)
	r.GET("/game", handlers.GamePageHandler)
	r.GET("/game/table/:id", handlers.GameTablePageHandler)
	r.GET("/game/singleplayer/:id", handlers.SinglePlayerGamePageHandler)
	r.GET("/game/replay/:id", handlers.ReplayPageHandler)

	// API routes
	api := r.Group("/api")
	{
		// WebSocket endpoint
		api.GET("/ws/lobby", handlers.WebSocketHandler(hub))

		// Auth routes
		api.POST("/register", handlers.Register)
		api.POST("/login", handlers.Login)
		api.POST("/logout", handlers.Logout)

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/user", handlers.GetCurrentUser)
			protected.GET("/games", handlers.ListGames)
			protected.POST("/game/create", handlers.CreateGame)
			protected.POST("/game/singleplayer", handlers.CreateSinglePlayerGame)
			protected.GET("/game/:id", handlers.GetGame)
			protected.GET("/game/:id/table", handlers.GetGameTableHandler)
			protected.POST("/game/:id/join", handlers.JoinGame)
			protected.POST("/game/:id/start", handlers.StartGameHandler)
			protected.POST("/game/:id/start-single", handlers.StartSinglePlayerGame)
			protected.POST("/game/:id/call-friend", handlers.CallFriendHandler)
			protected.POST("/game/:id/call-dealer", handlers.CallDealerHandler)
			protected.POST("/game/:id/pass-call", handlers.PassCallHandler)
			protected.GET("/game/:id/check-countdown", handlers.CheckCountdownHandler)
			protected.POST("/game/:id/flip-bottom", handlers.FlipBottomCardHandler)
			protected.POST("/game/:id/discard-bottom", handlers.DiscardBottomCardsHandler)
			protected.POST("/game/:id/play", handlers.PlayCard)
			protected.POST("/game/:id/pass", handlers.PassTurnHandler)
			protected.POST("/game/:id/ai-play", handlers.AIPlayHandler)
			// Replay APIs
			protected.GET("/game/:id/replay", handlers.GetGameReplayHandler)
			protected.GET("/game/:id/actions", handlers.GetGameActionsHandler)
		}
	}

	// SPA fallback for non-API routes
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.JSON(404, gin.H{"success": false, "error": "Not Found"})
			return
		}
		handlers.ServeFrontendIndex(c)
	})

	// Start server
	log.Println("Server starting on :8080")
	r.Run(":8080")
}
