package handlers

import (
	"client-management/db"
	"client-management/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetUslugiParams - получить все параметры услуги
func GetUslugiParams(c *gin.Context) {
	uslugaId := c.Param("id")

	rows, err := db.DB.Query(`
		SELECT id, usluga_id, param_name, param_type, 
		       COALESCE(param_options, ''), is_required, sort_order,
		       COALESCE(price, 0) as price
		FROM UslugiParams
		WHERE usluga_id = @p1
		ORDER BY sort_order, id`,
		uslugaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var params []models.UslugiParam
	for rows.Next() {
		var p models.UslugiParam
		err := rows.Scan(&p.ID, &p.UslugaID, &p.ParamName, &p.ParamType,
			&p.ParamOptions, &p.IsRequired, &p.SortOrder, &p.Price)
		if err != nil {
			continue
		}
		params = append(params, p)
	}

	c.JSON(http.StatusOK, params)
}

// CreateUslugiParam - создать параметр для услуги (только админ)
func CreateUslugiParam(c *gin.Context) {
	var req models.UslugiParam
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var id int
	err := db.DB.QueryRow(`
		INSERT INTO UslugiParams (usluga_id, param_name, param_type, param_options, is_required, sort_order, price)
		OUTPUT INSERTED.id
		VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7)`,
		req.UslugaID, req.ParamName, req.ParamType, req.ParamOptions, req.IsRequired, req.SortOrder, req.Price).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	req.ID = id
	c.JSON(http.StatusCreated, req)
}

// UpdateUslugiParam - обновить параметр (только админ)
func UpdateUslugiParam(c *gin.Context) {
	id := c.Param("id")
	var req models.UslugiParam
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	idInt, _ := strconv.Atoi(id)
	_, err := db.DB.Exec(`
		UPDATE UslugiParams 
		SET param_name = @p1, param_type = @p2, param_options = @p3, 
		    is_required = @p4, sort_order = @p5, price = @p6
		WHERE id = @p7`,
		req.ParamName, req.ParamType, req.ParamOptions, req.IsRequired, req.SortOrder, req.Price, idInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	req.ID = idInt
	c.JSON(http.StatusOK, req)
}

// DeleteUslugiParam - удалить параметр (только админ)
// DeleteUslugiParam - удалить параметр (только админ)
func DeleteUslugiParam(c *gin.Context) {
	id := c.Param("id")
	idInt, _ := strconv.Atoi(id)

	// Начинаем транзакцию
	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка начала транзакции: " + err.Error()})
		return
	}

	// Сначала удаляем значения этого параметра в заявках
	_, err = tx.Exec("DELETE FROM ZayavkaUslugiParams WHERE param_id = @p1", idInt)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления значений параметра: " + err.Error()})
		return
	}

	// Затем удаляем сам параметр
	result, err := tx.Exec("DELETE FROM UslugiParams WHERE id = @p1", idInt)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Параметр не найден"})
		return
	}

	// Фиксируем транзакцию
	err = tx.Commit()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка фиксации транзакции: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Параметр и все связанные значения удалены"})
}
