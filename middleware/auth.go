package middleware

import (
	"fmt"
	"leve_up/models"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var JWTSecret = []byte("your-secret-key-change-in-production")

// GetJWTSecret returns the JWT secret key
func GetJWTSecret() []byte {
	return JWTSecret
}

// Claims represents JWT claims
type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// AuthMiddleware validates JWT tokens
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return JWTSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Get user from claims
		user, err := models.GetUserByID(claims.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Set("userID", claims.UserID)
		c.Next()
	}
}

// GenerateToken generates a JWT token for a user
func GenerateToken(userID string) (string, error) {
	claims := Claims{
		UserID:           userID,
		RegisteredClaims: jwt.RegisteredClaims{
			// ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret)
}

// GetCurrentUser returns the current user from context
func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	user, exists := c.Get("user")
	if !exists {
		return nil, false
	}
	u, ok := user.(*models.User)
	return u, ok
}

// SendHTML sends an HTML response with user data
func SendHTML(c *gin.Context, template string, data gin.H) {
	if user, exists := GetCurrentUser(c); exists {
		data["user"] = user
		data["loggedIn"] = true
	} else {
		data["loggedIn"] = false
	}
	c.HTML(http.StatusOK, template, data)
}

// SendJSON sends a JSON response
func SendJSON(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

// SendError sends an error JSON response
func SendError(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, gin.H{"success": false, "error": message})
}

// SendSuccess sends a success JSON response
func SendSuccess(c *gin.Context, message string) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": message})
}

// ParseForm parses form data and sends error on failure
func ParseForm(c *gin.Context) (map[string]string, bool) {
	if err := c.Request.ParseForm(); err != nil {
		SendError(c, http.StatusBadRequest, "Invalid form data")
		return nil, false
	}

	data := make(map[string]string)
	for key, values := range c.Request.Form {
		if len(values) > 0 {
			data[key] = values[0]
		}
	}
	return data, true
}

// RequireFields checks if required fields are present
func RequireFields(data map[string]string, fields []string) (string, bool) {
	for _, field := range fields {
		if data[field] == "" {
			return fmt.Sprintf("Field '%s' is required", field), false
		}
	}
	return "", true
}
