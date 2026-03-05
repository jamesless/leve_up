package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	ws "leve_up/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins for development. In production, specify allowed origins.
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var wsHub *ws.Hub

// SetWebSocketHub sets the WebSocket hub instance
func SetWebSocketHub(hub *ws.Hub) {
	wsHub = hub
	log.Println("WebSocket hub initialized")
}

// GetWebSocketHub returns the WebSocket hub instance
func GetWebSocketHub() *ws.Hub {
	return wsHub
}

// WebSocketHandler handles WebSocket upgrade requests
func WebSocketHandler(hub *ws.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Upgrade HTTP connection to WebSocket
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("Failed to upgrade connection: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to upgrade to WebSocket"})
			return
		}

		// Create new client and register it
		client := ws.NewClient(hub, conn)
		hub.Register(client)

		// Run client read and write pumps
		client.Run()

		log.Printf("WebSocket client connected. Total clients: %d", hub.GetClientCount())
	}
}
