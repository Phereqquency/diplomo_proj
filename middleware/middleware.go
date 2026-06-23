package middleware

import (
	"client-management/db"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware проверяет JWT токен и кладёт claims в контекст
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Сначала пробуем заголовок Authorization
		tokenStr := ""
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			// Если нет заголовка — пробуем query-параметр ?token=
			tokenStr = c.Query("token")
		}

		if tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Требуется авторизация"})
			c.Abort()
			return
		}

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "supersecret_key_change_in_prod"
		}

		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Недействительный токен"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Ошибка чтения токена"})
			c.Abort()
			return
		}

		// Получаем ID пользователя из токена
		var userID int
		switch v := claims["admin_id"].(type) {
		case float64:
			userID = int(v)
		case int:
			userID = v
		}

		// Проверяем, не заблокирован ли пользователь
		var isBlocked bool
		var blockedReason string
		err = db.DB.QueryRow(`
			SELECT COALESCE(is_blocked, 0), COALESCE(blocked_reason, '') 
			FROM Admin WHERE id = @p1`, userID).Scan(&isBlocked, &blockedReason)
		if err == nil && isBlocked {
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "Ваш аккаунт заблокирован",
				"reason": blockedReason,
			})
			c.Abort()
			return
		}

		// JWT содержит поле "admin_id" — это ID пользователя в таблице Admin.
		// Кладём под двумя ключами: "admin_id" (для админских хендлеров)
		// и "user_id" (для пользовательских: GetMyZayavki, GetZayavka, CreateZayavka).
		c.Set("admin_id", userID)
		c.Set("user_id", userID)
		c.Set("email", claims["email"])
		c.Set("role", claims["role"])

		c.Next()
	}
}

// RequireAdmin - только для администраторов
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Доступ запрещен"})
			c.Abort()
			return
		}

		roleStr, ok := role.(string)
		if !ok || roleStr != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Требуются права администратора"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAdminOrManager - для администраторов и менеджеров
func RequireAdminOrManager() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Доступ запрещен"})
			c.Abort()
			return
		}

		roleStr, ok := role.(string)
		if !ok || (roleStr != "admin" && roleStr != "manager") {
			c.JSON(http.StatusForbidden, gin.H{"error": "Требуются права администратора или менеджера"})
			c.Abort()
			return
		}

		c.Next()
	}
}
