package handlers

import (
	"client-management/db"
	"client-management/models"
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetWelcomePage(c *gin.Context) {
	var page models.WelcomePage
	err := db.DB.QueryRow(
		"SELECT TOP 1 id, content, CONVERT(varchar, updated_at, 126) FROM WelcomePage ORDER BY id DESC",
	).Scan(&page.ID, &page.Content, &page.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusOK, gin.H{
				"id":      0,
				"content": defaultContent(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка загрузки страницы: " + err.Error()})
		return
	}

	// content хранится как JSON-строка в БД, но фронтенд ожидает его как строку
	// Возвращаем напрямую — фронтенд сам делает JSON.parse
	c.JSON(http.StatusOK, gin.H{
		"id":         page.ID,
		"content":    page.Content,
		"updated_at": page.UpdatedAt,
	})
}

// UpdateWelcomePage сохраняет новое содержимое главной страницы
func UpdateWelcomePage(c *gin.Context) {
	var req models.WelcomePageUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат данных: " + err.Error()})
		return
	}

	// Сериализуем массив блоков в JSON-строку для хранения в БД
	contentBytes, err := json.Marshal(req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сериализации: " + err.Error()})
		return
	}
	contentStr := string(contentBytes)

	// Проверяем, есть ли запись
	var count int
	err = db.DB.QueryRow("SELECT COUNT(*) FROM WelcomePage").Scan(&count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка проверки записи: " + err.Error()})
		return
	}

	if count > 0 {
		// Обновляем существующую запись
		_, err = db.DB.Exec(
			"UPDATE WelcomePage SET content = @p1, updated_at = GETDATE() WHERE id = (SELECT TOP 1 id FROM WelcomePage ORDER BY id DESC)",
			contentStr,
		)
	} else {
		// Вставляем новую запись
		_, err = db.DB.Exec(
			"INSERT INTO WelcomePage (content, updated_at) VALUES (@p1, GETDATE())",
			contentStr,
		)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Страница успешно сохранена",
		"content": contentStr,
	})
}

// defaultContent возвращает контент по умолчанию если таблица пуста
func defaultContent() string {
	return `[{"type":"hero","id":"default1","props":{"title":"Добро пожаловать в наш сервис","subtitle":"Профессиональные услуги по лучшим ценам","image":"","text":""}},{"type":"services","id":"default2","props":{"title":"Наши услуги"}},{"type":"cta","id":"default3","props":{"text":"Заказать услугу","link":"/register"}},{"type":"footer","id":"default4","props":{"text":"© 2025 СервисЦентр. Все права защищены."}}]`
}
