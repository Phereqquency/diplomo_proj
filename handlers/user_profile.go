package handlers

import (
	"client-management/db"
	"client-management/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetMyProfile - получить профиль текущего пользователя
func GetMyProfile(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не авторизован"})
		return
	}

	var p models.Polzovatel
	row := db.DB.QueryRow(`
		SELECT id, imya, email, COALESCE(messenger, ''), COALESCE(pozhelaniya, '')
		FROM Polzovatel WHERE id = @p1`, userID)

	err := row.Scan(&p.ID, &p.Imya, &p.Email, &p.Messenger, &p.Pozhelaniya)
	if err != nil {
		// Если нет записи в Polzovatel, создаём из данных Admin
		var admin models.Admin
		row2 := db.DB.QueryRow(`SELECT id, imya, email FROM Admin WHERE id = @p1`, userID)
		err2 := row2.Scan(&admin.ID, &admin.Imya, &admin.Email)
		if err2 != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Профиль не найден"})
			return
		}
		p.ID = admin.ID
		p.Imya = admin.Imya
		p.Email = admin.Email
		p.Messenger = ""
		p.Pozhelaniya = ""
	}

	c.JSON(http.StatusOK, p)
}

// UpdateMyProfile - обновить профиль текущего пользователя
func UpdateMyProfile(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не авторизован"})
		return
	}

	var req models.Polzovatel
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Проверяем, существует ли запись в Polzovatel
	var exists int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM Polzovatel WHERE id = @p1", userID).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if exists == 0 {
		// Создаём запись с явным id (совпадает с Admin.id)
		tx, txErr := db.DB.Begin()
		if txErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка транзакции"})
			return
		}
		tx.Exec("SET IDENTITY_INSERT Polzovatel ON")
		_, err = tx.Exec(`INSERT INTO Polzovatel (id, imya, email, messenger, pozhelaniya) VALUES (@p1, @p2, @p3, @p4, @p5)`,
			userID, req.Imya, req.Email, req.Messenger, req.Pozhelaniya)
		tx.Exec("SET IDENTITY_INSERT Polzovatel OFF")
		if err != nil {
			tx.Rollback()
		} else {
			err = tx.Commit()
		}
	} else {
		// Обновляем запись
		_, err = db.DB.Exec(`
			UPDATE Polzovatel 
			SET imya = @p1, email = @p2, messenger = @p3, pozhelaniya = @p4
			WHERE id = @p5`,
			req.Imya, req.Email, req.Messenger, req.Pozhelaniya, userID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Также обновляем имя в таблице Admin
	_, err = db.DB.Exec("UPDATE Admin SET imya = @p1 WHERE id = @p2", req.Imya, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Профиль обновлён"})
}
