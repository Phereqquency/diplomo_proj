package handlers

import (
	"client-management/db"
	"client-management/models"
	"database/sql"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Imya == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Имя обязательно"})
		return
	}
	if req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email обязателен"})
		return
	}
	if req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пароль обязателен"})
		return
	}
	if len(req.Imya) > 100 || len(req.Email) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Превышена длина поля"})
		return
	}
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пароль должен быть не менее 6 символов"})
		return
	}
	if len(req.Password) > 255 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пароль слишком длинный"})
		return
	}

	var exists int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM Admin WHERE email = @p1", req.Email).Scan(&exists)
	if err != nil {
		log.Printf("Ошибка проверки пользователя: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка проверки пользователя"})
		return
	}
	if exists > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Пользователь с таким email уже существует"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Ошибка хеширования пароля: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка хеширования пароля"})
		return
	}

	// Создаем пользователя в таблице Admin
	var adminID int
	err = db.DB.QueryRow(
		"INSERT INTO Admin (imya, email, password_hash, role, is_blocked) OUTPUT INSERTED.id VALUES (@p1, @p2, @p3, 'user', 0)",
		req.Imya, req.Email, string(hash),
	).Scan(&adminID)
	if err != nil {
		log.Printf("Ошибка создания пользователя: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания пользователя: " + err.Error()})
		return
	}

	// Создаем запись в таблице Polzovatel с тем же id, что и в Admin
	// ВАЖНО: id в Polzovatel должен совпадать с id в Admin, т.к. используется как FK
	tx, err := db.DB.Begin()
	if err != nil {
		db.DB.Exec("DELETE FROM Admin WHERE id = @p1", adminID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка начала транзакции"})
		return
	}
	_, err = tx.Exec("SET IDENTITY_INSERT Polzovatel ON")
	if err == nil {
		_, err = tx.Exec(
			"INSERT INTO Polzovatel (id, imya, email, messenger, pozhelaniya) VALUES (@p1, @p2, @p3, @p4, @p5)",
			adminID, req.Imya, req.Email, "", "",
		)
		tx.Exec("SET IDENTITY_INSERT Polzovatel OFF")
	}
	if err != nil {
		tx.Rollback()
		log.Printf("Ошибка создания профиля пользователя: %v", err)
		// Откатываем создание Admin, чтобы не было "мёртвых" записей без Polzovatel
		db.DB.Exec("DELETE FROM Admin WHERE id = @p1", adminID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания профиля: " + err.Error()})
		return
	}
	if err = tx.Commit(); err != nil {
		db.DB.Exec("DELETE FROM Admin WHERE id = @p1", adminID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка фиксации транзакции"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Пользователь успешно зарегистрирован"})
}

func GetAdmins(c *gin.Context) {
	rows, err := db.DB.Query(`
		SELECT id, imya, email, COALESCE(role, 'user') as role,
		       COALESCE(is_blocked, 0) as is_blocked,
		       COALESCE(blocked_reason, '') as blocked_reason
		FROM Admin 
		ORDER BY id`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения списка пользователей"})
		return
	}
	defer rows.Close()

	var admins []models.AdminWithBlockInfo
	for rows.Next() {
		var a models.AdminWithBlockInfo
		err := rows.Scan(&a.ID, &a.Imya, &a.Email, &a.Role, &a.IsBlocked, &a.BlockedReason)
		if err != nil {
			log.Printf("Ошибка сканирования: %v", err)
			continue
		}
		admins = append(admins, a)
	}

	c.JSON(http.StatusOK, admins)
}

// GetManagers - получить список всех менеджеров
func GetManagers(c *gin.Context) {
	rows, err := db.DB.Query(`
		SELECT id, imya, email, COALESCE(role, 'user') as role, COALESCE(is_blocked, 0) as is_blocked
		FROM Admin 
		WHERE role = 'manager'
		ORDER BY imya`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения списка менеджеров"})
		return
	}
	defer rows.Close()

	var managers []models.AdminRole
	for rows.Next() {
		var m models.AdminRole
		err := rows.Scan(&m.ID, &m.Imya, &m.Email, &m.Role, &m.IsBlocked)
		if err != nil {
			continue
		}
		managers = append(managers, m)
	}

	if managers == nil {
		managers = []models.AdminRole{}
	}

	c.JSON(http.StatusOK, managers)
}

func UpdateAdminRole(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validRoles := map[string]bool{"admin": true, "user": true, "manager": true}
	if !validRoles[req.Role] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимая роль. Допустимые: admin, user, manager"})
		return
	}

	// Преобразуем ID в int
	idInt, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	// Защита: нельзя изменить роль самому себе
	currentAdminID, exists := c.Get("admin_id")
	if exists {
		var currentID int
		switch v := currentAdminID.(type) {
		case float64:
			currentID = int(v)
		case int:
			currentID = v
		}
		if currentID == idInt {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя изменить свою собственную роль"})
			return
		}
	}

	result, err := db.DB.Exec("UPDATE Admin SET role = @p1 WHERE id = @p2", req.Role, idInt)
	if err != nil {
		log.Printf("Ошибка обновления роли: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления роли"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Роль успешно обновлена"})
}

// BlockUser - блокировка пользователя
func BlockUser(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)

	idInt, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	// Нельзя заблокировать самого себя
	currentAdminID, exists := c.Get("admin_id")
	if exists {
		var currentID int
		switch v := currentAdminID.(type) {
		case float64:
			currentID = int(v)
		case int:
			currentID = v
		}
		if currentID == idInt {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя заблокировать самого себя"})
			return
		}
	}

	// Проверяем, не заблокирован ли уже
	var isBlocked bool
	err = db.DB.QueryRow("SELECT is_blocked FROM Admin WHERE id = @p1", idInt).Scan(&isBlocked)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	if isBlocked {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пользователь уже заблокирован"})
		return
	}

	_, err = db.DB.Exec(`
		UPDATE Admin 
		SET is_blocked = 1, blocked_at = @p1, blocked_reason = @p2 
		WHERE id = @p3`,
		time.Now(), req.Reason, idInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка блокировки: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Пользователь заблокирован"})
}

// UnblockUser - разблокировка пользователя
func UnblockUser(c *gin.Context) {
	id := c.Param("id")

	idInt, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	_, err = db.DB.Exec(`
		UPDATE Admin 
		SET is_blocked = 0, blocked_at = NULL, blocked_reason = NULL 
		WHERE id = @p1`, idInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка разблокировки: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Пользователь разблокирован"})
}

func Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email и пароль обязательны"})
		return
	}

	log.Printf("Попытка входа: %s", req.Email)

	var admin models.Admin
	var isBlocked bool
	var blockedReason string

	row := db.DB.QueryRow(`
		SELECT id, imya, email, password_hash, COALESCE(role, 'user') as role,
		       COALESCE(is_blocked, 0) as is_blocked, COALESCE(blocked_reason, '')
		FROM Admin WHERE email = @p1`,
		req.Email,
	)
	err := row.Scan(&admin.ID, &admin.Imya, &admin.Email, &admin.PasswordHash, &admin.Role, &isBlocked, &blockedReason)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Пользователь не найден: %s", req.Email)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный email или пароль"})
			return
		}
		log.Printf("Ошибка поиска пользователя: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при поиске пользователя"})
		return
	}

	// Проверка блокировки
	if isBlocked {
		log.Printf("Пользователь заблокирован: %s, причина: %s", req.Email, blockedReason)
		message := "Ваш аккаунт заблокирован"
		if blockedReason != "" {
			message += ". Причина: " + blockedReason
		}
		c.JSON(http.StatusForbidden, gin.H{"error": message})
		return
	}

	log.Printf("Найден пользователь: %s, роль: %s", admin.Email, admin.Role)

	err = bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password))
	if err != nil {
		log.Printf("Неверный пароль для пользователя %s: %v", req.Email, err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный email или пароль"})
		return
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "supersecret_key_change_in_prod"
	}

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"admin_id": admin.ID,
		"user_id":  admin.ID,
		"email":    admin.Email,
		"role":     admin.Role,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenStr, err := jwtToken.SignedString([]byte(secret))
	if err != nil {
		log.Printf("Ошибка генерации токена: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации токена"})
		return
	}

	admin.PasswordHash = ""

	c.JSON(http.StatusOK, models.LoginResponse{
		Token: tokenStr,
		Admin: admin,
	})
}
