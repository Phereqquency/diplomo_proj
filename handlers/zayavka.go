package handlers

import (
	"client-management/db"
	"client-management/models"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func getUserIDFromContext(c *gin.Context) int {
	raw, exists := c.Get("user_id")
	if !exists {
		return 0
	}
	switch v := raw.(type) {
	case float64:
		return int(v)
	case int:
		return v
	case int64:
		return int(v)
	}
	return 0
}

// getUslugiParamsForZayavka - получить параметры услуги в заказе
func getUslugiParamsForZayavka(zayavkaID int, uslugiID int) []models.ZayavkaUslugiParam {
	rows, err := db.DB.Query(`
		SELECT zup.id, zup.zayavka_id, zup.uslugi_id, zup.param_id,
		       COALESCE(up.param_name, ''), zup.param_value, COALESCE(zup.param_price, 0)
		FROM ZayavkaUslugiParams zup
		LEFT JOIN UslugiParams up ON zup.param_id = up.id
		WHERE zup.zayavka_id = @p1 AND zup.uslugi_id = @p2`,
		zayavkaID, uslugiID)
	if err != nil {
		return []models.ZayavkaUslugiParam{}
	}
	defer rows.Close()

	var params []models.ZayavkaUslugiParam
	for rows.Next() {
		var p models.ZayavkaUslugiParam
		err := rows.Scan(&p.ID, &p.ZayavkaID, &p.UslugiID, &p.ParamID, &p.ParamName, &p.ParamValue, &p.ParamPrice)
		if err != nil {
			continue
		}
		params = append(params, p)
	}
	return params
}

func GetZayavki(c *gin.Context) {
	status := c.Query("status")
	polzovatelID := c.Query("polzovatel_id")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	userID := getUserIDFromContext(c)

	log.Printf("GetZayavki called: role=%s, userID=%d, status=%s", roleStr, userID, status)

	query := `
		SELECT z.id, z.nomer, z.status, z.data_podachi, z.data_resheniya,
		       z.polzovatel_id, z.admin_id, z.tsena, COALESCE(z.tz, N''),
		       COALESCE(z.srochnost, 'Не указана'),
		       COALESCE(p.imya, a.imya, '') as client_imya, 
		       COALESCE(p.email, a.email, '') as client_email, 
		       COALESCE(p.messenger, '') as messenger,
		       COALESCE(adm.imya, '') as admin_imya
		FROM Zayavka z
		LEFT JOIN Polzovatel p ON z.polzovatel_id = p.id
		LEFT JOIN Admin a ON z.polzovatel_id = a.id
		LEFT JOIN Admin adm ON z.admin_id = adm.id
		WHERE 1=1`

	args := []interface{}{}
	paramIdx := 1

	if roleStr == "manager" {
		query += fmt.Sprintf(" AND z.assigned_manager_id = @p%d", paramIdx)
		args = append(args, userID)
		paramIdx++
	}

	if status != "" {
		query += fmt.Sprintf(" AND z.status = @p%d", paramIdx)
		args = append(args, status)
		paramIdx++
	}
	if polzovatelID != "" {
		query += fmt.Sprintf(" AND z.polzovatel_id = @p%d", paramIdx)
		args = append(args, polzovatelID)
		paramIdx++
	}
	if dateFrom != "" {
		query += fmt.Sprintf(" AND z.data_podachi >= @p%d", paramIdx)
		args = append(args, dateFrom)
		paramIdx++
	}
	if dateTo != "" {
		query += fmt.Sprintf(" AND z.data_podachi <= @p%d", paramIdx)
		args = append(args, dateTo)
	}

	query += " ORDER BY z.data_podachi DESC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var zayavki []models.Zayavka
	for rows.Next() {
		var z models.Zayavka
		var clientImya, clientEmail, messenger, adminImya string
		var adminID sql.NullInt64
		var dataResheniya sql.NullTime
		var tsena sql.NullFloat64
		var srochnost string

		err := rows.Scan(&z.ID, &z.Nomer, &z.Status, &z.DataPodachi,
			&dataResheniya, &z.PolzovatelID, &adminID, &tsena, &z.Tz,
			&srochnost, &clientImya, &clientEmail, &messenger, &adminImya)
		if err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

		z.Srochnost = srochnost
		z.Polzovatel = &models.Polzovatel{
			ID:        z.PolzovatelID,
			Imya:      clientImya,
			Email:     clientEmail,
			Messenger: messenger,
		}

		if dataResheniya.Valid {
			z.DataResheniya = &dataResheniya.Time
		}
		if adminID.Valid {
			id := int(adminID.Int64)
			z.AdminID = &id
		}
		if tsena.Valid {
			z.Tsena = &tsena.Float64
		}

		zayavki = append(zayavki, z)
	}

	if zayavki == nil {
		zayavki = []models.Zayavka{}
	}
	c.JSON(http.StatusOK, zayavki)
}

func GetZayavka(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID := getUserIDFromContext(c)
	role, _ := c.Get("role")
	roleStr, _ := role.(string)

	var z models.Zayavka
	var p models.Polzovatel
	var adminID sql.NullInt64
	var assignedManagerID sql.NullInt64
	var dataResheniya sql.NullTime
	var tsena sql.NullFloat64
	var srochnost string
	var polzovatelID int
	var managerName, managerEmail string

	row := db.DB.QueryRow(`
		SELECT z.id, z.nomer, z.status, z.data_podachi, z.data_resheniya,
		       z.polzovatel_id, z.admin_id, z.tsena, COALESCE(z.tz, N''),
		       COALESCE(z.srochnost, 'Не указана'),
		       z.assigned_manager_id,
		       COALESCE(p.imya, a.imya, '') as imya,
		       COALESCE(p.email, a.email, '') as email,
		       COALESCE(p.messenger, '') as messenger,
		       COALESCE(p.pozhelaniya, '') as pozhelaniya,
		       COALESCE(m.imya, '') as manager_imya, COALESCE(m.email, '') as manager_email
		FROM Zayavka z
		LEFT JOIN Polzovatel p ON z.polzovatel_id = p.id
		LEFT JOIN Admin a ON z.polzovatel_id = a.id
		LEFT JOIN Admin m ON z.assigned_manager_id = m.id
		WHERE z.id = @p1`, id)

	err := row.Scan(&z.ID, &z.Nomer, &z.Status, &z.DataPodachi,
		&dataResheniya, &polzovatelID, &adminID, &tsena, &z.Tz,
		&srochnost, &assignedManagerID, &p.Imya, &p.Email, &p.Messenger, &p.Pozhelaniya,
		&managerName, &managerEmail)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заявка не найдена"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Проверка доступа: админ - может всё, менеджер - только свои заказы, пользователь - только свои
	if roleStr == "manager" {
		if !assignedManagerID.Valid || int(assignedManagerID.Int64) != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "У вас нет доступа к этой заявке"})
			return
		}
	} else if roleStr == "user" {
		if polzovatelID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к этой заявке"})
			return
		}
	}

	z.PolzovatelID = polzovatelID
	z.Srochnost = srochnost

	if assignedManagerID.Valid {
		aid := int(assignedManagerID.Int64)
		z.AssignedManagerID = &aid
		z.AssignedManager = &models.Admin{ID: aid, Imya: managerName, Email: managerEmail}
	}

	if dataResheniya.Valid {
		z.DataResheniya = &dataResheniya.Time
	}
	if adminID.Valid {
		aid := int(adminID.Int64)
		z.AdminID = &aid
	}
	if tsena.Valid {
		z.Tsena = &tsena.Float64
	}

	p.ID = polzovatelID
	z.Polzovatel = &p

	// Получаем услуги для заказа
	uslugiRows, err := db.DB.Query(`
		SELECT u.id, u.naimenovanie, COALESCE(u.opisanie,''), COALESCE(u.kartinka,''),
		       u.kategoriya_id, COALESCE(k.naimenovanie, ''), COALESCE(u.tsena, 0)
		FROM Uslugi u
		INNER JOIN Zayavka_Uslugi zu ON u.id = zu.uslugi_id
		LEFT JOIN Kategoriya k ON u.kategoriya_id = k.id
		WHERE zu.zayavka_id = @p1`, z.ID)

	if err == nil {
		defer uslugiRows.Close()
		var uslugiList []models.ZayavkaUslugaWithParams
		for uslugiRows.Next() {
			var u models.ZayavkaUslugaWithParams
			err := uslugiRows.Scan(&u.ID, &u.Naimenovanie, &u.Opisanie, &u.Kartinka,
				&u.KategoriyaID, &u.Kategoriya, &u.Tsena)
			if err != nil {
				continue
			}
			// Получаем параметры для этой услуги
			u.Params = getUslugiParamsForZayavka(z.ID, u.ID)
			uslugiList = append(uslugiList, u)
		}
		z.Uslugi = uslugiList
	}

	c.JSON(http.StatusOK, z)
}

// GetZayavkaForUser - получение заказа для обычного пользователя
func GetZayavkaForUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID заказа"})
		return
	}

	userID := getUserIDFromContext(c)

	var z models.Zayavka
	var p models.Polzovatel
	var adminID sql.NullInt64
	var dataResheniya sql.NullTime
	var tsena sql.NullFloat64
	var srochnost string
	var polzovatelID int

	row := db.DB.QueryRow(`
		SELECT z.id, z.nomer, z.status, z.data_podachi, z.data_resheniya,
		       z.polzovatel_id, z.admin_id, z.tsena, COALESCE(z.tz, N''),
		       COALESCE(z.srochnost, 'Не указана'),
		       COALESCE(p.imya, a.imya, '') as imya,
		       COALESCE(p.email, a.email, '') as email,
		       COALESCE(p.messenger, '') as messenger,
		       COALESCE(p.pozhelaniya, '') as pozhelaniya
		FROM Zayavka z
		LEFT JOIN Polzovatel p ON z.polzovatel_id = p.id
		LEFT JOIN Admin a ON z.polzovatel_id = a.id
		WHERE z.id = @p1`, id)

	err = row.Scan(&z.ID, &z.Nomer, &z.Status, &z.DataPodachi,
		&dataResheniya, &polzovatelID, &adminID, &tsena, &z.Tz,
		&srochnost, &p.Imya, &p.Email, &p.Messenger, &p.Pozhelaniya)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заказ не найден"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Проверяем, что заказ принадлежит этому пользователю
	if polzovatelID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Это не ваш заказ"})
		return
	}

	z.PolzovatelID = polzovatelID
	z.Srochnost = srochnost

	if dataResheniya.Valid {
		z.DataResheniya = &dataResheniya.Time
	}
	if adminID.Valid {
		aid := int(adminID.Int64)
		z.AdminID = &aid
	}
	if tsena.Valid {
		z.Tsena = &tsena.Float64
	}

	p.ID = polzovatelID
	z.Polzovatel = &p

	// Получаем услуги для заказа
	uslugiRows, err := db.DB.Query(`
		SELECT u.id, u.naimenovanie, COALESCE(u.opisanie,''), COALESCE(u.kartinka,''),
		       u.kategoriya_id, COALESCE(k.naimenovanie, ''), COALESCE(u.tsena, 0)
		FROM Uslugi u
		INNER JOIN Zayavka_Uslugi zu ON u.id = zu.uslugi_id
		LEFT JOIN Kategoriya k ON u.kategoriya_id = k.id
		WHERE zu.zayavka_id = @p1`, z.ID)

	if err == nil {
		defer uslugiRows.Close()
		var uslugiList []models.ZayavkaUslugaWithParams
		for uslugiRows.Next() {
			var u models.ZayavkaUslugaWithParams
			err := uslugiRows.Scan(&u.ID, &u.Naimenovanie, &u.Opisanie, &u.Kartinka,
				&u.KategoriyaID, &u.Kategoriya, &u.Tsena)
			if err != nil {
				continue
			}
			u.Params = getUslugiParamsForZayavka(z.ID, u.ID)
			uslugiList = append(uslugiList, u)
		}
		z.Uslugi = uslugiList
	}

	c.JSON(http.StatusOK, z)
}

func CreateZayavka(c *gin.Context) {
	var req models.CreateZayavkaRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("JSON parsing error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// ОТЛАДКА - выводим полученные данные
	log.Printf("=== ПОЛУЧЕНЫ ДАННЫЕ ДЛЯ СОЗДАНИЯ ЗАЯВКИ ===")
	log.Printf("UslugiIDs (выбранные услуги): %v", req.UslugiIDs)
	log.Printf("Params (параметры): %v", req.Params)
	log.Printf("Tz (ТЗ): %s", req.Tz)
	log.Printf("Srochnost (срочность): %s", req.Srochnost)

	if len(req.UslugiIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Выберите услуги"})
		return
	}

	validSrochnost := map[string]bool{"Срочно": true, "Средняя срочность": true, "Не срочно": true, "": true}
	if req.Srochnost != "" && !validSrochnost[req.Srochnost] {
		req.Srochnost = "Не указана"
	}
	if req.Srochnost == "" {
		req.Srochnost = "Не указана"
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Нет user_id"})
		return
	}
	log.Printf("UserID: %d", userID)

	// Получаем данные пользователя из Admin
	var imya, email string
	err := db.DB.QueryRow("SELECT imya, email FROM Admin WHERE id = @p1", userID).Scan(&imya, &email)
	if err != nil {
		log.Printf("Error getting user data: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось получить данные пользователя: " + err.Error()})
		return
	}

	// Создаём запись в Polzovatel, если её нет (id должен совпадать с Admin.id)
	var polzExists int
	db.DB.QueryRow("SELECT COUNT(*) FROM Polzovatel WHERE id = @p1", userID).Scan(&polzExists)
	if polzExists == 0 {
		txPolz, txErr := db.DB.Begin()
		if txErr == nil {
			txPolz.Exec("SET IDENTITY_INSERT Polzovatel ON")
			_, insertErr := txPolz.Exec(
				"INSERT INTO Polzovatel (id, imya, email, messenger, pozhelaniya) VALUES (@p1, @p2, @p3, @p4, @p5)",
				userID, imya, email, "", "",
			)
			txPolz.Exec("SET IDENTITY_INSERT Polzovatel OFF")
			if insertErr != nil {
				txPolz.Rollback()
				log.Printf("Warning: Failed to ensure Polzovatel record: %v", insertErr)
			} else {
				txPolz.Commit()
			}
		}
	}

	// Генерируем номер заявки
	nomer := fmt.Sprintf("ZAY-%d-%04d", time.Now().Year(), time.Now().UnixNano()%10000)
	log.Printf("Номер заявки: %s", nomer)

	// Создаём заявку
	var zayavkaID int
	err = db.DB.QueryRow(`
		INSERT INTO Zayavka (nomer, status, data_podachi, polzovatel_id, tz, srochnost)
		OUTPUT INSERTED.id
		VALUES (@p1, N'Новая', DATEADD(hour, 3, GETUTCDATE()), @p2, @p3, @p4)
	`, nomer, userID, req.Tz, req.Srochnost).Scan(&zayavkaID)

	if err != nil {
		log.Printf("Error creating Zayavka: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания заявки: " + err.Error()})
		return
	}
	log.Printf("Создана заявка с ID: %d", zayavkaID)

	// Вставляем услуги и их параметры
	for _, uid := range req.UslugiIDs {
		log.Printf("Пытаемся вставить услугу ID=%d в заявку ID=%d", uid, zayavkaID)

		// Проверяем, существует ли услуга
		var uslugaExists int
		db.DB.QueryRow("SELECT COUNT(*) FROM Uslugi WHERE id = @p1", uid).Scan(&uslugaExists)
		if uslugaExists == 0 {
			log.Printf("Услуга с ID=%d не найдена в БД!", uid)
			continue
		}

		// Вставляем связь заявка-услуга
		result, err := db.DB.Exec(`
			INSERT INTO Zayavka_Uslugi (zayavka_id, uslugi_id) 
			VALUES (@p1, @p2)`,
			zayavkaID, uid)
		if err != nil {
			log.Printf("ОШИБКА вставки услуги %d: %v", uid, err)
			continue
		}

		rows, _ := result.RowsAffected()
		log.Printf("Услуга %d вставлена, затронуто строк: %d", uid, rows)

		// Сохраняем параметры для этой услуги
		if params, ok := req.Params[uid]; ok {
			log.Printf("Параметры для услуги %d: %v", uid, params)
			for paramId, paramValue := range params {
				if paramValue != "" {
					var paramPrice float64
					db.DB.QueryRow("SELECT COALESCE(price, 0) FROM UslugiParams WHERE id = @p1", paramId).Scan(&paramPrice)

					_, err = db.DB.Exec(`
						INSERT INTO ZayavkaUslugiParams (zayavka_id, uslugi_id, param_id, param_value, param_price)
						VALUES (@p1, @p2, @p3, @p4, @p5)`,
						zayavkaID, uid, paramId, paramValue, paramPrice)
					if err != nil {
						log.Printf("Ошибка сохранения параметра %d: %v", paramId, err)
					} else {
						log.Printf("Параметр %d = %s сохранён", paramId, paramValue)
					}
				}
			}
		}
	}

	// Обновляем общую цену заявки
	var totalPrice float64
	db.DB.QueryRow(`
		SELECT COALESCE(SUM(u.tsena), 0)
		FROM Zayavka_Uslugi zu
		JOIN Uslugi u ON zu.uslugi_id = u.id
		WHERE zu.zayavka_id = @p1`, zayavkaID).Scan(&totalPrice)
	log.Printf("Сумма услуг: %.2f", totalPrice)

	var paramsPrice float64
	db.DB.QueryRow(`
		SELECT COALESCE(SUM(param_price), 0)
		FROM ZayavkaUslugiParams
		WHERE zayavka_id = @p1`, zayavkaID).Scan(&paramsPrice)
	log.Printf("Сумма параметров: %.2f", paramsPrice)

	totalPrice += paramsPrice
	_, err = db.DB.Exec("UPDATE Zayavka SET tsena = @p1 WHERE id = @p2", totalPrice, zayavkaID)
	if err != nil {
		log.Printf("Ошибка обновления цены: %v", err)
	}
	log.Printf("ИТОГОВАЯ ЦЕНА: %.2f", totalPrice)

	c.JSON(http.StatusCreated, gin.H{
		"id":    zayavkaID,
		"nomer": nomer,
	})
}

func UpdateZayavkaStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID заявки"})
		return
	}

	rawAdminID, _ := c.Get("admin_id")
	var adminID interface{} = nil
	if v, ok := rawAdminID.(float64); ok && v > 0 {
		// Проверяем, существует ли такой admin в базе
		var exists int
		err = db.DB.QueryRow("SELECT COUNT(*) FROM Admin WHERE id = @p1", int(v)).Scan(&exists)
		if err == nil && exists > 0 {
			adminID = int(v)
		}
	}

	var req models.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Статус обязателен"})
		return
	}

	validStatuses := map[string]bool{"Новая": true, "В работе": true, "Завершена": true, "Отклонена": true}
	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимый статус"})
		return
	}

	var dataResheniya interface{} = nil
	if req.Status == "Завершена" || req.Status == "Отклонена" {
		dataResheniya = time.Now()
	}

	var result sql.Result
	if dataResheniya != nil {
		if adminID != nil {
			result, err = db.DB.Exec(
				"UPDATE Zayavka SET status=@p1, admin_id=@p2, data_resheniya=@p3 WHERE id=@p4",
				req.Status, adminID, dataResheniya, id)
		} else {
			result, err = db.DB.Exec(
				"UPDATE Zayavka SET status=@p1, data_resheniya=@p2 WHERE id=@p3",
				req.Status, dataResheniya, id)
		}
	} else {
		if adminID != nil {
			result, err = db.DB.Exec(
				"UPDATE Zayavka SET status=@p1, admin_id=@p2 WHERE id=@p3",
				req.Status, adminID, id)
		} else {
			result, err = db.DB.Exec(
				"UPDATE Zayavka SET status=@p1 WHERE id=@p2",
				req.Status, id)
		}
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заявка не найдена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Статус обновлен"})
}

func UpdateZayavkaTsena(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID заявки"})
		return
	}

	var req models.UpdateTsenaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Tsena < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Цена не может быть отрицательной"})
		return
	}

	result, err := db.DB.Exec(
		"UPDATE Zayavka SET tsena=@p1 WHERE id=@p2",
		req.Tsena, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заявка не найдена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Цена обновлена"})
}

func DeleteZayavka(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID заявки"})
		return
	}

	// Начинаем транзакцию
	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка начала транзакции"})
		return
	}

	// 1. Удаляем параметры заявки
	_, err = tx.Exec("DELETE FROM ZayavkaUslugiParams WHERE zayavka_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления параметров: " + err.Error()})
		return
	}

	// 2. Удаляем связи заявка-услуга
	_, err = tx.Exec("DELETE FROM Zayavka_Uslugi WHERE zayavka_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления связей услуг: " + err.Error()})
		return
	}

	// 3. Удаляем сообщения чата
	_, err = tx.Exec("DELETE FROM OrderMessages WHERE zayavka_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления сообщений: " + err.Error()})
		return
	}

	// 4. Удаляем файлы
	_, err = tx.Exec("DELETE FROM OrderFiles WHERE zayavka_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления файлов: " + err.Error()})
		return
	}

	// 5. Удаляем версии ТЗ
	_, err = tx.Exec("DELETE FROM TzVersions WHERE zayavka_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления версий ТЗ: " + err.Error()})
		return
	}

	// 6. Удаляем акты и их позиции
	// Сначала получаем ID актов
	rows, err := tx.Query("SELECT id FROM Acts WHERE zayavka_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения актов: " + err.Error()})
		return
	}

	var actIDs []int
	for rows.Next() {
		var actID int
		rows.Scan(&actID)
		actIDs = append(actIDs, actID)
	}
	rows.Close()

	// Удаляем позиции актов
	for _, actID := range actIDs {
		_, err = tx.Exec("DELETE FROM ActItems WHERE act_id = @p1", actID)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления позиций актов: " + err.Error()})
			return
		}
	}

	// Удаляем сами акты
	_, err = tx.Exec("DELETE FROM Acts WHERE zayavka_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления актов: " + err.Error()})
		return
	}

	// 7. Наконец, удаляем саму заявку
	result, err := tx.Exec("DELETE FROM Zayavka WHERE id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Заявка не найдена"})
		return
	}

	// Фиксируем транзакцию
	err = tx.Commit()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка фиксации транзакции"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Заявка и все связанные данные удалены"})
}

func GetMyZayavki(c *gin.Context) {
	userID := getUserIDFromContext(c)
	log.Printf("GetMyZayavki called for userID: %d", userID)

	status := c.Query("status")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	query := `
		SELECT z.id, z.nomer, z.status, z.data_podachi, z.data_resheniya,
		       z.polzovatel_id, z.admin_id, z.tsena, COALESCE(z.tz, N''),
		       COALESCE(z.srochnost, 'Не указана'),
		       COALESCE(p.imya, '') as imya, 
		       COALESCE(p.email, '') as email, 
		       COALESCE(p.messenger, '') as messenger,
		       COALESCE(a.imya, '') as admin_imya
		FROM Zayavka z
		LEFT JOIN Polzovatel p ON z.polzovatel_id = p.id
		LEFT JOIN Admin a ON z.admin_id = a.id
		WHERE z.polzovatel_id = @p1`

	args := []interface{}{userID}
	paramIdx := 2

	if status != "" {
		query += fmt.Sprintf(" AND z.status = @p%d", paramIdx)
		args = append(args, status)
		paramIdx++
	}
	if dateFrom != "" {
		query += fmt.Sprintf(" AND z.data_podachi >= @p%d", paramIdx)
		args = append(args, dateFrom)
		paramIdx++
	}
	if dateTo != "" {
		query += fmt.Sprintf(" AND z.data_podachi <= @p%d", paramIdx)
		args = append(args, dateTo)
	}

	query += " ORDER BY z.data_podachi DESC"

	log.Printf("Query: %s, Args: %v", query, args)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		log.Printf("Query error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var zayavki []models.Zayavka
	for rows.Next() {
		var z models.Zayavka
		var p models.Polzovatel
		var adminImya string
		var adminID sql.NullInt64
		var dataResheniya sql.NullTime
		var tsena sql.NullFloat64
		var srochnost string

		err := rows.Scan(&z.ID, &z.Nomer, &z.Status, &z.DataPodachi,
			&dataResheniya, &z.PolzovatelID, &adminID, &tsena, &z.Tz,
			&srochnost, &p.Imya, &p.Email, &p.Messenger, &adminImya)
		if err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

		z.Srochnost = srochnost

		if dataResheniya.Valid {
			z.DataResheniya = &dataResheniya.Time
		}
		if adminID.Valid {
			id := int(adminID.Int64)
			z.AdminID = &id
		}
		if tsena.Valid {
			z.Tsena = &tsena.Float64
		}

		p.ID = z.PolzovatelID
		z.Polzovatel = &p
		zayavki = append(zayavki, z)
	}

	if zayavki == nil {
		zayavki = []models.Zayavka{}
	}
	log.Printf("Returning %d zayavki", len(zayavki))
	c.JSON(http.StatusOK, zayavki)
}

// AssignManagerToZayavka - назначить менеджера на заявку (только для админов)
func AssignManagerToZayavka(c *gin.Context) {
	zayavkaId := c.Param("id")
	var req struct {
		ManagerID int `json:"manager_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Проверяем, что менеджер существует и имеет роль manager
	var role string
	var isBlocked bool
	err := db.DB.QueryRow("SELECT role, COALESCE(is_blocked, 0) FROM Admin WHERE id = @p1", req.ManagerID).Scan(&role, &isBlocked)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Менеджер не найден"})
		return
	}
	if role != "manager" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пользователь не является менеджером"})
		return
	}
	if isBlocked {
		c.JSON(http.StatusForbidden, gin.H{"error": "Разработчик заблокирован и не может быть назначен на заявку"})
		return
	}

	// Назначаем менеджера на заявку
	_, err = db.DB.Exec(`
		UPDATE Zayavka 
		SET assigned_manager_id = @p1 
		WHERE id = @p2`,
		req.ManagerID, zayavkaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка назначения менеджера: " + err.Error()})
		return
	}

	// Получаем имя менеджера для сообщения
	var managerName string
	db.DB.QueryRow("SELECT imya FROM Admin WHERE id = @p1", req.ManagerID).Scan(&managerName)

	// Отправляем сообщение в чат о назначении менеджера
	userID := getUserIDFromContext(c)
	db.DB.Exec(`
		INSERT INTO OrderMessages (zayavka_id, sender_id, message, created_at, is_read)
		VALUES (@p1, @p2, @p3, GETDATE(), 0)`,
		zayavkaId, userID, fmt.Sprintf("👔 Назначен разработчик: %s", managerName))

	c.JSON(http.StatusOK, gin.H{"message": "Разработчик успешно назначен"})
}
