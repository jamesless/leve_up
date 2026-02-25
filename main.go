package main

import (
	"leve_up/handlers"
	"leve_up/middleware"
	"leve_up/models"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	if err := models.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Create Gin router
	r := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	// Serve static files
	r.Static("/static", "./static")
	r.LoadHTMLGlob("templates/*")

	// Public routes
	r.GET("/", handlers.IndexHandler)
	r.GET("/login", handlers.LoginPageHandler)
	r.GET("/register", handlers.RegisterPageHandler)
	r.GET("/rules", handlers.RulesPageHandler)
	r.GET("/game", handlers.GamePageHandler)
	r.GET("/game/table/:id", handlers.GameTablePageHandler)
	r.GET("/game/singleplayer/:id", handlers.SinglePlayerGamePageHandler)

	// API routes
	api := r.Group("/api")
	{
		// Auth routes
		api.POST("/register", handlers.Register)
		api.POST("/login", handlers.Login)
		api.POST("/logout", handlers.Logout)

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/user", handlers.GetCurrentUser)
			protected.POST("/game/create", handlers.CreateGame)
			protected.POST("/game/singleplayer", handlers.CreateSinglePlayerGame)
			protected.GET("/game/:id", handlers.GetGame)
			protected.GET("/game/:id/table", handlers.GetGameTableHandler)
			protected.POST("/game/:id/join", handlers.JoinGame)
			protected.POST("/game/:id/start", handlers.StartGameHandler)
			protected.POST("/game/:id/start-single", handlers.StartSinglePlayerGame)
			protected.POST("/game/:id/call-friend", handlers.CallFriendHandler)
			protected.POST("/game/:id/call-dealer", handlers.CallDealerHandler)
			protected.POST("/game/:id/flip-bottom", handlers.FlipBottomCardHandler)
			protected.POST("/game/:id/discard-bottom", handlers.DiscardBottomCardsHandler)
			protected.POST("/game/:id/play", handlers.PlayCard)
			protected.POST("/game/:id/ai-play", handlers.AIPlayHandler)
		}
	}

	// Start server
	log.Println("Server starting on :8080")
	r.Run(":8080")
}
