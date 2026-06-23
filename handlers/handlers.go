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
)

// ============================================
// ПОЛЬЗОВАТЕЛИ (Polzovateli)
// ============================================

func GetPolzovateli(c *gin.Context) {
	query := `
		SELECT 
			a.id, 
			a.imya, 
			a.email, 
			COALESCE(p.messenger, '') as messenger,
			COALESCE(p.pozhelaniya, '') as pozhelaniya,
			a.role,
			COALESCE(a.is_blocked, 0) as is_blocked,
			COALESCE(a.blocked_reason, '') as blocked_reason
		FROM Admin a
		LEFT JOIN Polzovatel p ON a.id = p.id
		WHERE a.role IN ('user', 'manager')
		ORDER BY a.imya`

	rows, err := db.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var list []models.PolzovatelWithBlockInfo
	for rows.Next() {
		var p models.PolzovatelWithBlockInfo
		err := rows.Scan(&p.ID, &p.Imya, &p.Email, &p.Messenger, &p.Pozhelaniya, &p.Role, &p.IsBlocked, &p.BlockedReason)
		if err != nil {
			continue
		}
		list = append(list, p)
	}

	if list == nil {
		list = []models.PolzovatelWithBlockInfo{}
	}
	c.JSON(http.StatusOK, list)
}

func GetPolzovatel(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var p models.Polzovatel
	row := db.DB.QueryRow(
		"SELECT id, imya, email, COALESCE(messenger,''), COALESCE(pozhelaniya,'') FROM Polzovatel WHERE id = @p1", id)
	if err := row.Scan(&p.ID, &p.Imya, &p.Email, &p.Messenger, &p.Pozhelaniya); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}
	c.JSON(http.StatusOK, p)
}

func CreatePolzovatel(c *gin.Context) {
	var p models.Polzovatel
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if p.Imya == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Имя обязательно"})
		return
	}
	if p.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email обязателен"})
		return
	}
	if len(p.Imya) > 100 || len(p.Email) > 100 || len(p.Messenger) > 100 || len(p.Pozhelaniya) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Превышена длина поля"})
		return
	}

	var id int
	err := db.DB.QueryRow(
		"INSERT INTO Polzovatel (imya, email, messenger, pozhelaniya) OUTPUT INSERTED.id VALUES (@p1,@p2,@p3,@p4)",
		p.Imya, p.Email, p.Messenger, p.Pozhelaniya).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	p.ID = id
	c.JSON(http.StatusCreated, p)
}

func UpdatePolzovatel(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	var p models.Polzovatel
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if p.Imya == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Имя обязательно"})
		return
	}
	if p.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email обязателен"})
		return
	}
	if len(p.Imya) > 100 || len(p.Email) > 100 || len(p.Messenger) > 100 || len(p.Pozhelaniya) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Превышена длина поля"})
		return
	}

	result, err := db.DB.Exec(
		"UPDATE Polzovatel SET imya=@p1, email=@p2, messenger=@p3, pozhelaniya=@p4 WHERE id=@p5",
		p.Imya, p.Email, p.Messenger, p.Pozhelaniya, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	p.ID = id
	c.JSON(http.StatusOK, p)
}

func DeletePolzovatel(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	// Начинаем транзакцию
	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка начала транзакции"})
		return
	}

	// Удаляем из Polzovatel
	_, err = tx.Exec("DELETE FROM Polzovatel WHERE id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления из Polzovatel: " + err.Error()})
		return
	}

	// Удаляем из Admin
	result, err := tx.Exec("DELETE FROM Admin WHERE id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления из Admin: " + err.Error()})
		return
	}

	rows, _ := result.RowsAffected()

	// Фиксируем транзакцию
	err = tx.Commit()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка фиксации транзакции"})
		return
	}

	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Пользователь полностью удален из системы"})
}

// ============================================
// УСЛУГИ (Uslugi)
// ============================================

func GetUslugi(c *gin.Context) {
	kategID := c.Query("kategoriya_id")
	query := `SELECT u.id, u.naimenovanie, COALESCE(u.opisanie,''), COALESCE(u.kartinka,''), 
	          u.kategoriya_id, k.naimenovanie, COALESCE(u.tsena, 0)
	          FROM Uslugi u JOIN Kategoriya k ON u.kategoriya_id = k.id`
	args := []interface{}{}
	if kategID != "" {
		query += " WHERE u.kategoriya_id = @p1"
		args = append(args, kategID)
	}
	query += " ORDER BY k.naimenovanie, u.naimenovanie"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var list []models.Uslugi
	for rows.Next() {
		var u models.Uslugi
		rows.Scan(&u.ID, &u.Naimenovanie, &u.Opisanie, &u.Kartinka, &u.KategoriyaID, &u.Kategoriya, &u.Tsena)
		list = append(list, u)
	}
	if list == nil {
		list = []models.Uslugi{}
	}
	c.JSON(http.StatusOK, list)
}

func CreateUslugi(c *gin.Context) {
	var u models.Uslugi
	if err := c.ShouldBindJSON(&u); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if u.Naimenovanie == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Наименование обязательно"})
		return
	}
	if u.KategoriyaID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректная категория"})
		return
	}
	if u.Tsena < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Цена не может быть отрицательной"})
		return
	}
	if len(u.Naimenovanie) > 200 || len(u.Opisanie) > 500 || len(u.Kartinka) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Превышена длина поля"})
		return
	}

	var id int
	err := db.DB.QueryRow(
		"INSERT INTO Uslugi (naimenovanie, opisanie, kartinka, kategoriya_id, tsena) OUTPUT INSERTED.id VALUES (@p1,@p2,@p3,@p4,@p5)",
		u.Naimenovanie, u.Opisanie, u.Kartinka, u.KategoriyaID, u.Tsena).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	u.ID = id
	c.JSON(http.StatusCreated, u)
}

func UpdateUslugi(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var u models.Uslugi
	if err := c.ShouldBindJSON(&u); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if u.Naimenovanie == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Наименование обязательно"})
		return
	}
	if u.KategoriyaID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректная категория"})
		return
	}
	if u.Tsena < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Цена не может быть отрицательной"})
		return
	}
	if len(u.Naimenovanie) > 200 || len(u.Opisanie) > 500 || len(u.Kartinka) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Превышена длина поля"})
		return
	}

	_, err := db.DB.Exec(
		"UPDATE Uslugi SET naimenovanie=@p1, opisanie=@p2, kartinka=@p3, kategoriya_id=@p4, tsena=@p5 WHERE id=@p6",
		u.Naimenovanie, u.Opisanie, u.Kartinka, u.KategoriyaID, u.Tsena, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	u.ID = id
	c.JSON(http.StatusOK, u)
}

func DeleteUslugi(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// Начинаем транзакцию
	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка начала транзакции"})
		return
	}

	// 1. Сначала удаляем связанные параметры в ZayavkaUslugiParams
	_, err = tx.Exec("DELETE FROM ZayavkaUslugiParams WHERE uslugi_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления параметров заявок: " + err.Error()})
		return
	}

	// 2. Удаляем связи заявка-услуга
	_, err = tx.Exec("DELETE FROM Zayavka_Uslugi WHERE uslugi_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления связей заявок: " + err.Error()})
		return
	}

	// 3. Удаляем параметры услуги
	_, err = tx.Exec("DELETE FROM UslugiParams WHERE usluga_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления параметров услуги: " + err.Error()})
		return
	}

	// 4. Наконец, удаляем саму услугу
	result, err := tx.Exec("DELETE FROM Uslugi WHERE id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Услуга не найдена"})
		return
	}

	// Фиксируем транзакцию
	err = tx.Commit()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка фиксации транзакции"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Услуга и все связанные данные удалены"})
}

// ============================================
// КАТЕГОРИИ (Kategorii)
// ============================================

func GetKategorii(c *gin.Context) {
	rows, err := db.DB.Query("SELECT id, naimenovanie FROM Kategoriya ORDER BY naimenovanie")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var list []models.Kategoriya
	for rows.Next() {
		var k models.Kategoriya
		rows.Scan(&k.ID, &k.Naimenovanie)
		list = append(list, k)
	}
	if list == nil {
		list = []models.Kategoriya{}
	}
	c.JSON(http.StatusOK, list)
}

func CreateKategoriya(c *gin.Context) {
	var k models.Kategoriya
	if err := c.ShouldBindJSON(&k); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if k.Naimenovanie == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Наименование категории обязательно"})
		return
	}
	if len(k.Naimenovanie) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Превышена длина наименования"})
		return
	}

	var id int
	err := db.DB.QueryRow(
		"INSERT INTO Kategoriya (naimenovanie) OUTPUT INSERTED.id VALUES (@p1)",
		k.Naimenovanie).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	k.ID = id
	c.JSON(http.StatusCreated, k)
}

// DeleteKategoriya - удаление категории со всеми услугами
// DeleteKategoriya - удаление категории со всеми услугами
func DeleteKategoriya(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	// Начинаем транзакцию
	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка начала транзакции"})
		return
	}

	// Получаем все услуги в этой категории
	rows, err := tx.Query("SELECT id FROM Uslugi WHERE kategoriya_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения услуг: " + err.Error()})
		return
	}

	var uslugiIDs []int
	for rows.Next() {
		var uid int
		rows.Scan(&uid)
		uslugiIDs = append(uslugiIDs, uid)
	}
	rows.Close()

	// Удаляем параметры заявок для каждой услуги
	for _, uid := range uslugiIDs {
		_, err = tx.Exec("DELETE FROM ZayavkaUslugiParams WHERE uslugi_id = @p1", uid)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления параметров заявок: " + err.Error()})
			return
		}
	}

	// Удаляем связи заявка-услуга
	for _, uid := range uslugiIDs {
		_, err = tx.Exec("DELETE FROM Zayavka_Uslugi WHERE uslugi_id = @p1", uid)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления связей заявок: " + err.Error()})
			return
		}
	}

	// Удаляем параметры услуг
	_, err = tx.Exec("DELETE FROM UslugiParams WHERE usluga_id IN (SELECT id FROM Uslugi WHERE kategoriya_id = @p1)", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления параметров услуг: " + err.Error()})
		return
	}

	// Удаляем услуги в этой категории
	_, err = tx.Exec("DELETE FROM Uslugi WHERE kategoriya_id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления услуг: " + err.Error()})
		return
	}

	// Затем удаляем категорию
	result, err := tx.Exec("DELETE FROM Kategoriya WHERE id = @p1", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Категория не найдена"})
		return
	}

	err = tx.Commit()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка фиксации транзакции"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Категория и все связанные данные удалены"})
}

// ============================================
// ОТЧЁТЫ (Reports)
// ============================================
func GetActsByOrder(c *gin.Context) {
	zayavkaId := c.Param("id")

	rows, err := db.DB.Query(`
		SELECT id, zayavka_id, act_number, act_date, file_path, file_name, created_at, created_by
		FROM Acts 
		WHERE zayavka_id = @p1 
		ORDER BY act_date DESC`, zayavkaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var acts []models.Act
	for rows.Next() {
		var a models.Act
		err := rows.Scan(&a.ID, &a.ZayavkaID, &a.ActNumber, &a.ActDate, &a.FilePath, &a.FileName, &a.CreatedAt, &a.CreatedBy)
		if err != nil {
			continue
		}
		acts = append(acts, a)
	}

	c.JSON(http.StatusOK, acts)
}

// GetReportsByOrder - получить отчёты по заказу
func GetReportsByOrder(c *gin.Context) {
	zayavkaId := c.Param("id")

	rows, err := db.DB.Query(`
		SELECT id, zayavka_id, report_number, report_type, file_path, file_name, created_at, created_by
		FROM OrderReports 
		WHERE zayavka_id = @p1 
		ORDER BY created_at DESC`, zayavkaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var reports []models.OrderReport
	for rows.Next() {
		var r models.OrderReport
		err := rows.Scan(&r.ID, &r.ZayavkaID, &r.ReportNumber, &r.ReportType, &r.FilePath, &r.FileName, &r.CreatedAt, &r.CreatedBy)
		if err != nil {
			continue
		}
		reports = append(reports, r)
	}

	c.JSON(http.StatusOK, reports)
}

// UploadAct - загрузить акт выполненных работ (для админов/менеджеров)
func UploadAct(c *gin.Context) {
	zayavkaId := c.Param("id")

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл не загружен"})
		return
	}

	actNumber := c.PostForm("act_number")
	if actNumber == "" {
		actNumber = "АКТ-" + time.Now().Format("20060102-150405")
	}

	uniqueFilename := time.Now().Format("20060102150405") + "_" + file.Filename
	filePath := "./uploads/acts/" + uniqueFilename

	// Создаём папку если нет
	os.MkdirAll("./uploads/acts", 0755)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения файла"})
		return
	}

	userID := getUserIDFromContext(c)

	var actId int
	err = db.DB.QueryRow(`
		INSERT INTO Acts (zayavka_id, act_number, file_path, file_name, created_by)
		OUTPUT INSERTED.id
		VALUES (@p1, @p2, @p3, @p4, @p5)`,
		zayavkaId, actNumber, filePath, file.Filename, userID).Scan(&actId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         actId,
		"act_number": actNumber,
		"file_name":  file.Filename,
		"message":    "Акт загружен",
	})
}

// UploadReport - загрузить отчёт (для админов/менеджеров)
func UploadReport(c *gin.Context) {
	zayavkaId := c.Param("id")

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл не загружен"})
		return
	}

	reportType := c.PostForm("report_type")
	if reportType == "" {
		reportType = "full"
	}

	reportNumber := c.PostForm("report_number")
	if reportNumber == "" {
		reportNumber = "ОТЧЁТ-" + time.Now().Format("20060102-150405")
	}

	uniqueFilename := time.Now().Format("20060102150405") + "_" + file.Filename
	filePath := "./uploads/reports/" + uniqueFilename

	os.MkdirAll("./uploads/reports", 0755)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения файла"})
		return
	}

	userID := getUserIDFromContext(c)

	var reportId int
	err = db.DB.QueryRow(`
		INSERT INTO OrderReports (zayavka_id, report_number, report_type, file_path, file_name, created_by)
		OUTPUT INSERTED.id
		VALUES (@p1, @p2, @p3, @p4, @p5, @p6)`,
		zayavkaId, reportNumber, reportType, filePath, file.Filename, userID).Scan(&reportId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":            reportId,
		"report_number": reportNumber,
		"file_name":     file.Filename,
		"message":       "Отчёт загружен",
	})
}

// GetPriceListReport - получить прайс-лист с ценами услуг и параметров
func GetPriceListReport(c *gin.Context) {
	// Получаем все категории с услугами и параметрами
	rows, err := db.DB.Query(`
		SELECT 
			k.id as category_id,
			k.naimenovanie as category_name,
			u.id as usluga_id,
			u.naimenovanie as usluga_name,
			u.opisanie as usluga_description,
			u.tsena as usluga_price,
			up.id as param_id,
			up.param_name,
			up.param_type,
			up.param_options,
			COALESCE(up.price, 0) as param_price,
			up.is_required
		FROM Kategoriya k
		LEFT JOIN Uslugi u ON k.id = u.kategoriya_id
		LEFT JOIN UslugiParams up ON u.id = up.usluga_id
		ORDER BY k.naimenovanie, u.naimenovanie, up.sort_order
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	// Структура для хранения данных
	type Param struct {
		ID         int     `json:"id"`
		Name       string  `json:"name"`
		Type       string  `json:"type"`
		Options    string  `json:"options"`
		Price      float64 `json:"price"`
		IsRequired bool    `json:"is_required"`
	}

	type Usluga struct {
		ID          int     `json:"id"`
		Name        string  `json:"name"`
		Description string  `json:"description"`
		Price       float64 `json:"price"`
		Params      []Param `json:"params"`
	}

	type Category struct {
		ID     int      `json:"id"`
		Name   string   `json:"name"`
		Uslugi []Usluga `json:"uslugi"`
	}

	categoriesMap := make(map[int]*Category)
	uslugiMap := make(map[int]*Usluga)

	for rows.Next() {
		var categoryID, uslugaID, paramID sql.NullInt64
		var categoryName, uslugaName, uslugaDescription, paramName, paramType, paramOptions sql.NullString
		var uslugaPrice, paramPrice sql.NullFloat64
		var isRequired sql.NullBool

		err := rows.Scan(
			&categoryID, &categoryName,
			&uslugaID, &uslugaName, &uslugaDescription, &uslugaPrice,
			&paramID, &paramName, &paramType, &paramOptions, &paramPrice, &isRequired,
		)
		if err != nil {
			continue
		}

		// Добавляем категорию
		if categoryID.Valid {
			if _, exists := categoriesMap[int(categoryID.Int64)]; !exists {
				categoriesMap[int(categoryID.Int64)] = &Category{
					ID:     int(categoryID.Int64),
					Name:   categoryName.String,
					Uslugi: []Usluga{},
				}
			}
		}

		// Добавляем услугу
		if uslugaID.Valid {
			if _, exists := uslugiMap[int(uslugaID.Int64)]; !exists {
				uslugiMap[int(uslugaID.Int64)] = &Usluga{
					ID:          int(uslugaID.Int64),
					Name:        uslugaName.String,
					Description: uslugaDescription.String,
					Price:       uslugaPrice.Float64,
					Params:      []Param{},
				}
			}

			// Добавляем параметр к услуге
			if paramID.Valid {
				param := Param{
					ID:         int(paramID.Int64),
					Name:       paramName.String,
					Type:       paramType.String,
					Options:    paramOptions.String,
					Price:      paramPrice.Float64,
					IsRequired: isRequired.Bool,
				}
				uslugiMap[int(uslugaID.Int64)].Params = append(uslugiMap[int(uslugaID.Int64)].Params, param)
			}
		}
	}

	// Собираем категории с услугами
	var result []Category
	for _, cat := range categoriesMap {
		for _, usl := range uslugiMap {
			// Проверяем, принадлежит ли услуга категории
			var belongsToCategory bool
			db.DB.QueryRow(`
				SELECT COUNT(*) FROM Uslugi WHERE id = @p1 AND kategoriya_id = @p2
			`, usl.ID, cat.ID).Scan(&belongsToCategory)
			if belongsToCategory {
				cat.Uslugi = append(cat.Uslugi, *usl)
			}
		}
		result = append(result, *cat)
	}

	c.JSON(http.StatusOK, gin.H{
		"categories":   result,
		"total_uslugi": len(uslugiMap),
		"generated_at": time.Now().Format("2006-01-02 15:04:05"),
	})
}

// GetOrderDetailsReport - получить детальный отчёт по заказу
func GetOrderDetailsReport(c *gin.Context) {
	zayavkaId := c.Param("id")

	// Получаем информацию о заказе и клиенте
	var zayavka models.Zayavka
	var polzovatel models.Polzovatel
	var adminName string
	var assignedManagerName string
	var zayavkaTsena float64
	var dataResheniya sql.NullTime
	var tz sql.NullString

	err := db.DB.QueryRow(`
		SELECT 
			z.id, z.nomer, z.status, z.data_podachi, z.data_resheniya,
			COALESCE(z.tsena, 0), COALESCE(z.tz, N''), COALESCE(z.srochnost, 'Не указана'),
			z.polzovatel_id,
			COALESCE(p.imya, a.imya, '') as imya,
			COALESCE(p.email, a.email, '') as email,
			COALESCE(p.messenger, '') as messenger,
			COALESCE(p.pozhelaniya, '') as pozhelaniya,
			COALESCE(adm.imya, '') as admin_name,
			COALESCE(m.imya, '') as manager_name
		FROM Zayavka z
		LEFT JOIN Polzovatel p ON z.polzovatel_id = p.id
		LEFT JOIN Admin a ON z.polzovatel_id = a.id
		LEFT JOIN Admin adm ON z.admin_id = adm.id
		LEFT JOIN Admin m ON z.assigned_manager_id = m.id
		WHERE z.id = @p1`, zayavkaId).Scan(
		&zayavka.ID, &zayavka.Nomer, &zayavka.Status, &zayavka.DataPodachi, &dataResheniya,
		&zayavkaTsena, &tz, &zayavka.Srochnost,
		&polzovatel.ID, &polzovatel.Imya, &polzovatel.Email, &polzovatel.Messenger, &polzovatel.Pozhelaniya,
		&adminName, &assignedManagerName)

	if dataResheniya.Valid {
		zayavka.DataResheniya = &dataResheniya.Time
	}
	if tz.Valid {
		zayavka.Tz = tz.String
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заказ не найден"})
		return
	}

	// Получаем услуги с параметрами
	type ParamDetail struct {
		Name  string  `json:"name"`
		Value string  `json:"value"`
		Price float64 `json:"price"`
	}

	type UslugaDetail struct {
		ID          int           `json:"id"`
		Name        string        `json:"name"`
		Description string        `json:"description"`
		Price       float64       `json:"price"`
		Params      []ParamDetail `json:"params"`
	}

	var uslugiList []UslugaDetail

	uslugiRows, err := db.DB.Query(`
		SELECT u.id, u.naimenovanie, COALESCE(u.opisanie, ''), COALESCE(u.tsena, 0)
		FROM Uslugi u
		INNER JOIN Zayavka_Uslugi zu ON u.id = zu.uslugi_id
		WHERE zu.zayavka_id = @p1`, zayavkaId)
	if err == nil {
		defer uslugiRows.Close()
		for uslugiRows.Next() {
			var usluga UslugaDetail
			err := uslugiRows.Scan(&usluga.ID, &usluga.Name, &usluga.Description, &usluga.Price)
			if err != nil {
				continue
			}

			// Получаем параметры для услуги
			paramRows, err := db.DB.Query(`
				SELECT up.param_name, zup.param_value, COALESCE(zup.param_price, 0)
				FROM ZayavkaUslugiParams zup
				JOIN UslugiParams up ON zup.param_id = up.id
				WHERE zup.zayavka_id = @p1 AND zup.uslugi_id = @p2`,
				zayavkaId, usluga.ID)
			if err == nil {
				for paramRows.Next() {
					var param ParamDetail
					paramRows.Scan(&param.Name, &param.Value, &param.Price)
					usluga.Params = append(usluga.Params, param)
				}
				paramRows.Close()
			}
			uslugiList = append(uslugiList, usluga)
		}
	}

	// Вычисляем сумму из услуг и параметров (справочная)
	calculatedSum := 0.0
	for _, u := range uslugiList {
		calculatedSum += u.Price
		for _, p := range u.Params {
			calculatedSum += p.Price
		}
	}

	// Итоговая цена: если администратор вручную задал цену (tsena > 0) — берём её,
	// иначе используем пересчитанную из услуг
	var finalTsena float64
	if zayavkaTsena > 0 {
		finalTsena = zayavkaTsena
	} else {
		finalTsena = calculatedSum
	}

	// Формируем ответ
	response := gin.H{
		"zayavka": gin.H{
			"id":             zayavka.ID,
			"nomer":          zayavka.Nomer,
			"status":         zayavka.Status,
			"data_podachi":   zayavka.DataPodachi,
			"data_resheniya": zayavka.DataResheniya,
			"tz":             zayavka.Tz,
			"srochnost":      zayavka.Srochnost,
			"tsena":          finalTsena,
		},
		"polzovatel": gin.H{
			"id":          polzovatel.ID,
			"imya":        polzovatel.Imya,
			"email":       polzovatel.Email,
			"messenger":   polzovatel.Messenger,
			"pozhelaniya": polzovatel.Pozhelaniya,
		},
		"admin_name":            adminName,
		"assigned_manager_name": assignedManagerName,
		"uslugi":                uslugiList,
		"total_sum":             finalTsena,
		"calculated_sum":        calculatedSum,
	}

	c.JSON(http.StatusOK, response)
}

func GetReport(c *gin.Context) {
	log.Println("=== GetReport called ===")

	// Получаем даты из запроса
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	log.Printf("Raw dates - from: %s, to: %s", dateFrom, dateTo)

	// Устанавливаем даты по умолчанию (сегодня и +6 месяцев)
	now := time.Now()
	if dateFrom == "" {
		dateFrom = now.Format("2006-01-02")
	}
	if dateTo == "" {
		dateTo = now.AddDate(0, 6, 0).Format("2006-01-02")
	}

	log.Printf("Using dates - from: %s, to: %s", dateFrom, dateTo)

	report := models.Report{
		ByStatus:    make(map[string]int),
		BySrochnost: make(map[string]int),
		DateFrom:    dateFrom,
		DateTo:      dateTo,
	}

	// 1. Всего заявок
	var totalZayavki int
	err := db.DB.QueryRow(`
		SELECT COUNT(*) FROM Zayavka 
		WHERE CAST(data_podachi AS DATE) BETWEEN @p1 AND @p2`,
		dateFrom, dateTo).Scan(&totalZayavki)
	if err != nil {
		log.Printf("Error counting total: %v", err)
	} else {
		report.TotalZayavki = totalZayavki
		log.Printf("Total zayavki: %d", totalZayavki)
	}

	// 2. По статусам
	rows, err := db.DB.Query(`
		SELECT status, COUNT(*) FROM Zayavka 
		WHERE CAST(data_podachi AS DATE) BETWEEN @p1 AND @p2 
		GROUP BY status`,
		dateFrom, dateTo)
	if err != nil {
		log.Printf("Error getting status stats: %v", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var status string
			var count int
			rows.Scan(&status, &count)
			report.ByStatus[status] = count
			log.Printf("Status: %s = %d", status, count)
		}
	}

	// 3. По срочности
	rowsSrochnost, err := db.DB.Query(`
		SELECT COALESCE(srochnost, 'Не указана'), COUNT(*) FROM Zayavka 
		WHERE CAST(data_podachi AS DATE) BETWEEN @p1 AND @p2 
		GROUP BY srochnost`,
		dateFrom, dateTo)
	if err != nil {
		log.Printf("Error getting srochnost stats: %v", err)
	} else {
		defer rowsSrochnost.Close()
		for rowsSrochnost.Next() {
			var srochnost string
			var count int
			rowsSrochnost.Scan(&srochnost, &count)
			report.BySrochnost[srochnost] = count
			log.Printf("Srochnost: %s = %d", srochnost, count)
		}
	}

	// 4. По месяцам
	rowsPeriod, err := db.DB.Query(`
		SELECT 
			CONVERT(varchar(7), data_podachi, 120) as period, 
			COUNT(*) as cnt
		FROM Zayavka
		WHERE CAST(data_podachi AS DATE) BETWEEN @p1 AND @p2
		GROUP BY CONVERT(varchar(7), data_podachi, 120)
		ORDER BY period`, dateFrom, dateTo)
	if err != nil {
		log.Printf("Error getting period stats: %v", err)
	} else {
		defer rowsPeriod.Close()
		for rowsPeriod.Next() {
			var s models.PeriodStat
			rowsPeriod.Scan(&s.Period, &s.Count)
			report.ByPeriod = append(report.ByPeriod, s)
			log.Printf("Period: %s = %d", s.Period, s.Count)
		}
	}

	// 5. Топ услуг
	rowsTop, err := db.DB.Query(`
		SELECT TOP 5 u.naimenovanie, COUNT(*) as cnt, COALESCE(SUM(COALESCE(u.tsena, 0)), 0) as total_sum
		FROM Zayavka_Uslugi zu
		JOIN Zayavka z ON zu.zayavka_id = z.id
		JOIN Uslugi u ON zu.uslugi_id = u.id
		WHERE CAST(z.data_podachi AS DATE) BETWEEN @p1 AND @p2
		GROUP BY u.naimenovanie
		ORDER BY cnt DESC`, dateFrom, dateTo)
	if err != nil {
		log.Printf("Error getting top uslugi: %v", err)
	} else {
		defer rowsTop.Close()
		for rowsTop.Next() {
			var s models.UslugiStat
			rowsTop.Scan(&s.Naimenovanie, &s.Count, &s.TotalSum)
			report.TopUslugi = append(report.TopUslugi, s)
			log.Printf("Top usluga: %s = %d, sum = %.2f", s.Naimenovanie, s.Count, s.TotalSum)
		}
	}

	// 6. Просроченные заявки
	var expiredCount int
	err = db.DB.QueryRow(`
		SELECT COUNT(*) FROM Zayavka
		WHERE status = N'В работе'
		AND DATEDIFF(day, data_podachi, GETDATE()) > 30`).Scan(&expiredCount)
	if err != nil {
		log.Printf("Error counting expired: %v", err)
	} else {
		report.ExpiredCount = expiredCount
	}

	log.Printf("Final report: total=%d, statuses=%d, srochnost=%d, periods=%d, top=%d",
		report.TotalZayavki, len(report.ByStatus), len(report.BySrochnost), len(report.ByPeriod), len(report.TopUslugi))

	c.JSON(http.StatusOK, report)
}

// GetPeriodOrdersReport — заказы за период с услугами и суммой
func GetPeriodOrdersReport(c *gin.Context) {
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	if dateFrom == "" {
		t := time.Now().AddDate(0, -1, 0)
		dateFrom = t.Format("2006-01-02")
	}
	if dateTo == "" {
		dateTo = time.Now().Format("2006-01-02")
	}

	type OrderItem struct {
		ID          int       `json:"id"`
		Nomer       string    `json:"nomer"`
		Status      string    `json:"status"`
		DataPodachi time.Time `json:"data_podachi"`
		ClientImya  string    `json:"client_imya"`
		ClientEmail string    `json:"client_email"`
		Tsena       float64   `json:"tsena"`
		Srochnost   string    `json:"srochnost"`
		Uslugi      []string  `json:"uslugi"`
	}

	rows, err := db.DB.Query(`
		SELECT z.id, z.nomer, z.status, z.data_podachi,
		       COALESCE(p.imya, '') as client_imya,
		       COALESCE(p.email, '') as client_email,
		       COALESCE(z.tsena, 0) as tsena,
		       COALESCE(z.srochnost, '')
		FROM Zayavka z
		LEFT JOIN Polzovatel p ON z.polzovatel_id = p.id
		WHERE CAST(z.data_podachi AS DATE) BETWEEN @p1 AND @p2
		ORDER BY z.data_podachi DESC`, dateFrom, dateTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	// Используем map для безопасного обновления, потом сохраняем порядок через orderedIDs
	ordersMap := map[int]*OrderItem{}
	var orderedIDs []int

	for rows.Next() {
		var o OrderItem
		if err := rows.Scan(&o.ID, &o.Nomer, &o.Status, &o.DataPodachi,
			&o.ClientImya, &o.ClientEmail, &o.Tsena, &o.Srochnost); err != nil {
			continue
		}
		o.Uslugi = []string{}
		ordersMap[o.ID] = &o
		orderedIDs = append(orderedIDs, o.ID)
	}

	if len(orderedIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"orders":    []interface{}{},
			"total":     0,
			"total_sum": 0,
			"date_from": dateFrom,
			"date_to":   dateTo,
		})
		return
	}

	// Подгружаем услуги одним запросом
	uRows, err := db.DB.Query(`
		SELECT zu.zayavka_id, u.naimenovanie
		FROM Zayavka_Uslugi zu
		JOIN Uslugi u ON zu.uslugi_id = u.id
		WHERE zu.zayavka_id IN (
			SELECT z.id FROM Zayavka z
			WHERE CAST(z.data_podachi AS DATE) BETWEEN @p1 AND @p2
		)`, dateFrom, dateTo)
	if err == nil {
		defer uRows.Close()
		for uRows.Next() {
			var zid int
			var name string
			if uRows.Scan(&zid, &name) == nil {
				if o, ok := ordersMap[zid]; ok {
					o.Uslugi = append(o.Uslugi, name)
				}
			}
		}
	}

	// Собираем финальный список в исходном порядке
	orders := make([]OrderItem, 0, len(orderedIDs))
	totalSum := 0.0
	for _, id := range orderedIDs {
		o := ordersMap[id]
		totalSum += o.Tsena
		orders = append(orders, *o)
	}

	c.JSON(http.StatusOK, gin.H{
		"orders":    orders,
		"total":     len(orders),
		"total_sum": totalSum,
		"date_from": dateFrom,
		"date_to":   dateTo,
	})
}

// GetStatusOrdersReport — заказы сгруппированные по статусу
func GetStatusOrdersReport(c *gin.Context) {
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	if dateFrom == "" {
		t := time.Now().AddDate(0, -1, 0)
		dateFrom = t.Format("2006-01-02")
	}
	if dateTo == "" {
		dateTo = time.Now().Format("2006-01-02")
	}

	type OrderItem struct {
		ID          int       `json:"id"`
		Nomer       string    `json:"nomer"`
		Status      string    `json:"status"`
		DataPodachi time.Time `json:"data_podachi"`
		ClientImya  string    `json:"client_imya"`
		ClientEmail string    `json:"client_email"`
		Tsena       float64   `json:"tsena"`
		Srochnost   string    `json:"srochnost"`
		Uslugi      []string  `json:"uslugi"`
	}

	rows, err := db.DB.Query(`
		SELECT z.id, z.nomer, z.status, z.data_podachi,
		       COALESCE(p.imya, '') as client_imya,
		       COALESCE(p.email, '') as client_email,
		       COALESCE(z.tsena, 0) as tsena,
		       COALESCE(z.srochnost, '')
		FROM Zayavka z
		LEFT JOIN Polzovatel p ON z.polzovatel_id = p.id
		WHERE CAST(z.data_podachi AS DATE) BETWEEN @p1 AND @p2
		ORDER BY z.status, z.data_podachi DESC`, dateFrom, dateTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	ordersMap := map[int]*OrderItem{}
	var orderedIDs []int

	for rows.Next() {
		var o OrderItem
		if err := rows.Scan(&o.ID, &o.Nomer, &o.Status, &o.DataPodachi,
			&o.ClientImya, &o.ClientEmail, &o.Tsena, &o.Srochnost); err != nil {
			continue
		}
		o.Uslugi = []string{}
		ordersMap[o.ID] = &o
		orderedIDs = append(orderedIDs, o.ID)
	}

	if len(orderedIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"orders":    []interface{}{},
			"by_status": map[string]interface{}{},
			"total":     0,
			"date_from": dateFrom,
			"date_to":   dateTo,
		})
		return
	}

	// Подгружаем услуги одним запросом
	uRows, err := db.DB.Query(`
		SELECT zu.zayavka_id, u.naimenovanie
		FROM Zayavka_Uslugi zu
		JOIN Uslugi u ON zu.uslugi_id = u.id
		WHERE zu.zayavka_id IN (
			SELECT z.id FROM Zayavka z
			WHERE CAST(z.data_podachi AS DATE) BETWEEN @p1 AND @p2
		)`, dateFrom, dateTo)
	if err == nil {
		defer uRows.Close()
		for uRows.Next() {
			var zid int
			var name string
			if uRows.Scan(&zid, &name) == nil {
				if o, ok := ordersMap[zid]; ok {
					o.Uslugi = append(o.Uslugi, name)
				}
			}
		}
	}

	// Собираем финальный список и группируем по статусу
	orders := make([]OrderItem, 0, len(orderedIDs))
	byStatus := map[string][]OrderItem{
		"Новая": {}, "В работе": {}, "Завершена": {}, "Отклонена": {},
	}
	for _, id := range orderedIDs {
		o := *ordersMap[id]
		orders = append(orders, o)
		if _, ok := byStatus[o.Status]; ok {
			byStatus[o.Status] = append(byStatus[o.Status], o)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"orders":    orders,
		"by_status": byStatus,
		"total":     len(orders),
		"date_from": dateFrom,
		"date_to":   dateTo,
	})
}
