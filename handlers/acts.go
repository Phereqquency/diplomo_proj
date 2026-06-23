package handlers

import (
	"client-management/db"
	"client-management/models"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// CreateActFromOrder - создать акт на основе заказа
func CreateActFromOrder(c *gin.Context) {
	zayavkaId := c.Param("id")

	// Получаем заказ — включая согласованную цену z.tsena
	var orderExists int
	var zayavkaTsena sql.NullFloat64
	err := db.DB.QueryRow(
		"SELECT COUNT(*), MAX(tsena) FROM Zayavka WHERE id = @p1", zayavkaId,
	).Scan(&orderExists, &zayavkaTsena)
	if err != nil || orderExists == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заказ не найден"})
		return
	}

	// Получаем услуги заказа с ценами из справочника
	type uslugaRow struct {
		id       int
		name     string
		opisanie string
		price    float64
	}
	uslugiRows, err := db.DB.Query(`
		SELECT u.id, u.naimenovanie, COALESCE(u.opisanie, ''), COALESCE(u.tsena, 0)
		FROM Uslugi u
		INNER JOIN Zayavka_Uslugi zu ON u.id = zu.uslugi_id
		WHERE zu.zayavka_id = @p1`, zayavkaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var uslugi []uslugaRow
	for uslugiRows.Next() {
		var u uslugaRow
		uslugiRows.Scan(&u.id, &u.name, &u.opisanie, &u.price)
		uslugi = append(uslugi, u)
	}
	uslugiRows.Close()

	// Для каждой услуги считаем сумму параметров и собираем их текст
	type itemToInsert struct {
		name     string
		opisanie string // параметры услуги
		price    float64
	}
	var items []itemToInsert
	var calculatedTotal float64

	for _, u := range uslugi {
		// Получаем параметры с ценами
		paramRows, err := db.DB.Query(`
			SELECT up.param_name, zup.param_value, COALESCE(zup.param_price, 0)
			FROM ZayavkaUslugiParams zup
			JOIN UslugiParams up ON zup.param_id = up.id
			WHERE zup.zayavka_id = @p1 AND zup.uslugi_id = @p2`,
			zayavkaId, u.id)

		var paramsSum float64
		var paramParts []string
		if err == nil {
			for paramRows.Next() {
				var pName, pValue string
				var pPrice float64
				paramRows.Scan(&pName, &pValue, &pPrice)
				paramsSum += pPrice
				if pPrice > 0 {
					paramParts = append(paramParts, fmt.Sprintf("%s: %s (+%.2f BYN)", pName, pValue, pPrice))
				} else {
					paramParts = append(paramParts, fmt.Sprintf("%s: %s", pName, pValue))
				}
			}
			paramRows.Close()
		}

		opisanie := u.opisanie
		if len(paramParts) > 0 {
			if opisanie != "" {
				opisanie += "; "
			}
			opisanie += strings.Join(paramParts, "; ")
		}

		totalPrice := u.price + paramsSum
		calculatedTotal += totalPrice
		items = append(items, itemToInsert{
			name:     u.name,
			opisanie: opisanie,
			price:    totalPrice,
		})
	}

	// Если администратор задал итоговую цену — используем её
	// Распределяем разницу пропорционально или добавляем отдельной строкой
	finalTotal := calculatedTotal
	if zayavkaTsena.Valid && zayavkaTsena.Float64 > 0 {
		finalTotal = zayavkaTsena.Float64
	}

	// Генерируем номер акта
	actNumber := fmt.Sprintf("Акт № %d-%s", time.Now().UnixNano()%10000, time.Now().Format("2006"))

	// Создаём акт
	userID := getUserIDFromContext(c)
	var actId int
	err = db.DB.QueryRow(`
		INSERT INTO Acts (zayavka_id, act_number, act_date, created_by, status)
		OUTPUT INSERTED.id
		VALUES (@p1, @p2, DATEADD(hour, 3, GETUTCDATE()), @p3, 'черновик')`,
		zayavkaId, actNumber, userID).Scan(&actId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания акта: " + err.Error()})
		return
	}

	// Добавляем позиции акта
	for _, item := range items {
		_, err = db.DB.Exec(`
			INSERT INTO ActItems (act_id, usluga_name, opisanie, quantity, price, total)
			VALUES (@p1, @p2, @p3, 1, @p4, @p4)`,
			actId, item.name, item.opisanie, item.price)
		if err != nil {
			log.Printf("Warning: failed to insert act item: %v", err)
		}
	}

	// Если итоговая цена отличается от суммы позиций — добавляем корректирующую строку
	if zayavkaTsena.Valid && zayavkaTsena.Float64 > 0 && abs64(finalTotal-calculatedTotal) > 0.01 {
		diff := finalTotal - calculatedTotal
		label := "Корректировка цены (согласовано)"
		if diff < 0 {
			label = "Скидка (согласовано)"
		}
		db.DB.Exec(`
			INSERT INTO ActItems (act_id, usluga_name, opisanie, quantity, price, total)
			VALUES (@p1, @p2, @p3, 1, @p4, @p4)`,
			actId, label, "", diff)
	}

	// Сообщение в чат
	db.DB.Exec(`
		INSERT INTO OrderMessages (zayavka_id, sender_id, message, created_at, is_read)
		VALUES (@p1, @p2, @p3, GETDATE(), 0)`,
		zayavkaId, userID, fmt.Sprintf("📄 Создан акт: %s", actNumber))

	c.JSON(http.StatusCreated, gin.H{
		"id":         actId,
		"act_number": actNumber,
		"message":    "Акт успешно создан",
	})
}

func abs64(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

func GetActs(c *gin.Context) {
	zayavkaId := c.Param("id")
	log.Printf("GetActs called for zayavkaId: %s", zayavkaId)

	rows, err := db.DB.Query(`
        SELECT id, act_number, act_date, status, file_name, created_at
        FROM Acts
        WHERE zayavka_id = @p1
        ORDER BY id DESC`, zayavkaId)
	if err != nil {
		log.Printf("Error querying acts: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var acts []models.Act
	for rows.Next() {
		var a models.Act
		var fileName sql.NullString
		if err := rows.Scan(&a.ID, &a.ActNumber, &a.ActDate, &a.Status, &fileName, &a.CreatedAt); err != nil {
			continue
		}
		if fileName.Valid {
			a.FileName = fileName.String
		}
		acts = append(acts, a)
	}
	if acts == nil {
		acts = []models.Act{}
	}
	c.JSON(http.StatusOK, acts)
}

// GetAct - получить полную информацию об акте
func GetAct(c *gin.Context) {
	actId := c.Param("actId")

	var act models.Act
	var zayavkaId int
	err := db.DB.QueryRow(`
		SELECT id, zayavka_id, act_number, act_date, status, created_at
		FROM Acts WHERE id = @p1`, actId).Scan(
		&act.ID, &zayavkaId, &act.ActNumber, &act.ActDate, &act.Status, &act.CreatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Акт не найден"})
		return
	}

	// Позиции акта (уже содержат правильные цены включая параметры и корректировку)
	rows, err := db.DB.Query(`
		SELECT id, usluga_name, opisanie, quantity, price, total
		FROM ActItems WHERE act_id = @p1`, actId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var items []models.ActItem
	var totalSum float64
	for rows.Next() {
		var item models.ActItem
		rows.Scan(&item.ID, &item.UslugaName, &item.Opisanie, &item.Quantity, &item.Price, &item.Total)
		items = append(items, item)
		totalSum += item.Total
	}

	// Информация о заказе и клиенте (LEFT JOIN чтобы не падать если нет Polzovatel)
	var zayavka models.Zayavka
	var polzovatel models.Polzovatel
	db.DB.QueryRow(`
		SELECT z.nomer, z.data_podachi,
		       COALESCE(p.imya, a.imya, ''), COALESCE(p.email, a.email, ''), COALESCE(p.messenger, '')
		FROM Zayavka z
		LEFT JOIN Polzovatel p ON z.polzovatel_id = p.id
		LEFT JOIN Admin a ON z.polzovatel_id = a.id
		WHERE z.id = @p1`, zayavkaId).Scan(
		&zayavka.Nomer, &zayavka.DataPodachi,
		&polzovatel.Imya, &polzovatel.Email, &polzovatel.Messenger)

	// Услуги с параметрами (для отображения состава)
	type UslugaInfo struct {
		Name   string
		Price  float64
		Params string
	}
	var uslugiList []UslugaInfo

	uslugiRows, err := db.DB.Query(`
		SELECT u.id, u.naimenovanie, COALESCE(u.tsena, 0)
		FROM Uslugi u
		INNER JOIN Zayavka_Uslugi zu ON u.id = zu.uslugi_id
		WHERE zu.zayavka_id = @p1`, zayavkaId)
	if err == nil {
		defer uslugiRows.Close()
		for uslugiRows.Next() {
			var uslugaId int
			var name string
			var basePrice float64
			uslugiRows.Scan(&uslugaId, &name, &basePrice)

			// Параметры с ценами
			paramRows, err := db.DB.Query(`
				SELECT up.param_name, zup.param_value, COALESCE(zup.param_price, 0)
				FROM ZayavkaUslugiParams zup
				JOIN UslugiParams up ON zup.param_id = up.id
				WHERE zup.zayavka_id = @p1 AND zup.uslugi_id = @p2`,
				zayavkaId, uslugaId)
			if err == nil {
				var params []string
				var paramsSum float64
				for paramRows.Next() {
					var pName, pValue string
					var pPrice float64
					paramRows.Scan(&pName, &pValue, &pPrice)
					if pPrice > 0 {
						params = append(params, fmt.Sprintf("%s: %s (+%.2f BYN)", pName, pValue, pPrice))
					} else {
						params = append(params, fmt.Sprintf("%s: %s", pName, pValue))
					}
					paramsSum += pPrice
				}
				paramRows.Close()

				totalPrice := basePrice + paramsSum
				paramsText := ""
				if len(params) > 0 {
					paramsText = strings.Join(params, "; ")
				}
				uslugiList = append(uslugiList, UslugaInfo{Name: name, Price: totalPrice, Params: paramsText})
			}
		}
	}

	months := map[string]string{
		"January": "января", "February": "февраля", "March": "марта", "April": "апреля",
		"May": "мая", "June": "июня", "July": "июля", "August": "августа",
		"September": "сентября", "October": "октября", "November": "ноября", "December": "декабря",
	}

	c.JSON(http.StatusOK, gin.H{
		"act": gin.H{
			"id":         act.ID,
			"act_number": act.ActNumber,
			"act_date":   act.ActDate,
			"status":     act.Status,
		},
		"zayavka": gin.H{
			"nomer":        zayavka.Nomer,
			"data_podachi": zayavka.DataPodachi,
		},
		"polzovatel":  polzovatel,
		"items":       items,
		"uslugi":      uslugiList,
		"total_sum":   totalSum,
		"act_month":   months[act.ActDate.Month().String()],
		"order_month": months[zayavka.DataPodachi.Month().String()],
		"act_day":     act.ActDate.Day(),
		"act_year":    act.ActDate.Year(),
		"order_day":   zayavka.DataPodachi.Day(),
		"order_year":  zayavka.DataPodachi.Year(),
	})
}

// UpdateActStatus - обновить статус акта
func UpdateActStatus(c *gin.Context) {
	actId := c.Param("actId")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Проверяем текущий статус — подписанный акт нельзя изменить
	var currentStatus string
	err := db.DB.QueryRow("SELECT status FROM Acts WHERE id = @p1", actId).Scan(&currentStatus)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Акт не найден"})
		return
	}
	if currentStatus == "подписан" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Подписанный акт нельзя изменить"})
		return
	}

	_, err = db.DB.Exec("UPDATE Acts SET status = @p1 WHERE id = @p2", req.Status, actId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Статус акта обновлен"})
}

// DeleteAct - удалить акт
func DeleteAct(c *gin.Context) {
	actId := c.Param("actId")

	var currentStatus string
	err := db.DB.QueryRow("SELECT status FROM Acts WHERE id = @p1", actId).Scan(&currentStatus)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Акт не найден"})
		return
	}
	if currentStatus == "подписан" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Подписанный акт нельзя удалить"})
		return
	}

	_, err = db.DB.Exec("DELETE FROM ActItems WHERE act_id = @p1", actId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	_, err = db.DB.Exec("DELETE FROM Acts WHERE id = @p1", actId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Акт удален"})
}

// GetActsForUser - получить акты заказа для пользователя
func GetActsForUser(c *gin.Context) {
	zayavkaId := c.Param("id")
	userID := getUserIDFromContext(c)

	var polzovatelID int
	err := db.DB.QueryRow("SELECT polzovatel_id FROM Zayavka WHERE id = @p1", zayavkaId).Scan(&polzovatelID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заказ не найден"})
		return
	}

	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	if roleStr != "admin" && roleStr != "manager" && polzovatelID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к актам этого заказа"})
		return
	}

	rows, err := db.DB.Query(`
		SELECT id, act_number, act_date, status, file_name, created_at
		FROM Acts WHERE zayavka_id = @p1 ORDER BY id DESC`, zayavkaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var acts []models.Act
	for rows.Next() {
		var a models.Act
		var fileName sql.NullString
		if err := rows.Scan(&a.ID, &a.ActNumber, &a.ActDate, &a.Status, &fileName, &a.CreatedAt); err != nil {
			continue
		}
		if fileName.Valid {
			a.FileName = fileName.String
		}
		acts = append(acts, a)
	}
	if acts == nil {
		acts = []models.Act{}
	}
	c.JSON(http.StatusOK, acts)
}

// GetActHTML - получить HTML версию акта для скачивания
func GetActHTML(c *gin.Context) {
	actId := c.Param("actId")

	var act models.Act
	var zayavkaId int
	err := db.DB.QueryRow(`
		SELECT id, zayavka_id, act_number, act_date, status, created_at
		FROM Acts WHERE id = @p1`, actId).Scan(
		&act.ID, &zayavkaId, &act.ActNumber, &act.ActDate, &act.Status, &act.CreatedAt)
	if err != nil {
		c.String(http.StatusNotFound, "Акт не найден")
		return
	}

	// Позиции акта (уже правильные)
	rows, err := db.DB.Query(`
		SELECT usluga_name, opisanie, quantity, price, total
		FROM ActItems WHERE act_id = @p1`, actId)
	if err != nil {
		c.String(http.StatusInternalServerError, "Ошибка загрузки позиций")
		return
	}
	defer rows.Close()

	var items []models.ActItem
	var totalSum float64
	for rows.Next() {
		var item models.ActItem
		rows.Scan(&item.UslugaName, &item.Opisanie, &item.Quantity, &item.Price, &item.Total)
		items = append(items, item)
		totalSum += item.Total
	}

	// Информация о заказе и клиенте (LEFT JOIN — без падения)
	var zayavkaNomer string
	var polzovatelImya, polzovatelEmail, polzovatelMessenger string
	var zayavkaCreated time.Time
	db.DB.QueryRow(`
		SELECT z.nomer, z.data_podachi,
		       COALESCE(p.imya, a.imya, ''), COALESCE(p.email, a.email, ''), COALESCE(p.messenger, '')
		FROM Zayavka z
		LEFT JOIN Polzovatel p ON z.polzovatel_id = p.id
		LEFT JOIN Admin a ON z.polzovatel_id = a.id
		WHERE z.id = @p1`, zayavkaId).Scan(
		&zayavkaNomer, &zayavkaCreated,
		&polzovatelImya, &polzovatelEmail, &polzovatelMessenger)

	months := map[string]string{
		"January": "января", "February": "февраля", "March": "марта", "April": "апреля",
		"May": "мая", "June": "июня", "July": "июля", "August": "августа",
		"September": "сентября", "October": "октября", "November": "ноября", "December": "декабря",
	}
	actMonth := months[act.ActDate.Month().String()]
	orderMonth := months[zayavkaCreated.Month().String()]

	var htmlBuilder strings.Builder
	htmlBuilder.WriteString(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>АКТ № ` + act.ActNumber + `</title>
    <style>
        body { font-family: 'Times New Roman', Times, serif; margin: 50px; font-size: 14px; }
        .header { text-align: center; margin-bottom: 30px; }
        .act-number { font-size: 18px; font-weight: bold; margin: 10px 0; }
        .date { text-align: right; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; text-align: center; }
        .text-right { text-align: right; }
        .total-row { font-weight: bold; background-color: #f9f9f9; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
        .signature-box { width: 45%; }
        .signature-line { margin-top: 40px; border-top: 1px solid #000; width: 80%; }
        .footer-text { margin-top: 30px; font-size: 12px; text-align: center; }
        .correction-row td { color: #555; font-style: italic; }
        .params-text { font-size: 12px; color: #555; font-style: italic; }
    </style>
</head>
<body>
    <div class="header">
        <div class="act-number">АКТ № ` + act.ActNumber + `</div>
        <div>приема-передачи выполненных работ (оказанных услуг)</div>
        <div>по Заказу № ` + zayavkaNomer + ` от ` + fmt.Sprintf("%d %s %d", zayavkaCreated.Day(), orderMonth, zayavkaCreated.Year()) + ` г.</div>
    </div>

    <div class="date">
        <div>г. Минск</div>
        <div>«` + fmt.Sprintf("%d", act.ActDate.Day()) + `» ` + actMonth + ` ` + fmt.Sprintf("%d", act.ActDate.Year()) + ` г.</div>
    </div>

    <p><strong>Исполнитель:</strong> ООО "САРП"</p>
    <p><strong>Заказчик:</strong> ` + polzovatelImya + ` (` + polzovatelEmail + `)</p>
    <p><strong>Мессенджер заказчика:</strong> ` + polzovatelMessenger + `</p>

    <h3>Перечень оказанных услуг:</h3>
    <table>
        <thead>
            <tr>
                <th width="5%">№</th>
                <th width="55%">Наименование работ, услуг</th>
                <th width="10%">Кол-во</th>
                <th width="15%">Цена, BYN</th>
                <th width="15%">Сумма, BYN</th>
            </tr>
        </thead>
        <tbody>`)

	for i, item := range items {
		rowClass := ""
		if item.UslugaName == "Корректировка цены (согласовано)" || item.UslugaName == "Скидка (согласовано)" {
			rowClass = ` class="correction-row"`
		}
		nameCell := item.UslugaName
		if item.Opisanie != "" {
			nameCell += fmt.Sprintf(`<br><span class="params-text">%s</span>`, item.Opisanie)
		}
		htmlBuilder.WriteString(fmt.Sprintf(`
            <tr%s>
                <td class="text-right">%d</td>
                <td>%s</td>
                <td class="text-right">%d</td>
                <td class="text-right">%.2f</td>
                <td class="text-right">%.2f</td>
            </tr>`, rowClass, i+1, nameCell, item.Quantity, item.Price, item.Total))
	}

	htmlBuilder.WriteString(fmt.Sprintf(`
            <tr class="total-row">
                <td colspan="4" class="text-right"><strong>Итого:</strong></td>
                <td class="text-right"><strong>%.2f BYN</strong></td>
            </tr>
        </tbody>
    </table>

    <p><strong>Всего оказано услуг на сумму: %.2f рублей.</strong></p>

    <div class="signatures">
        <div class="signature-box">
            <p><strong>Исполнитель:</strong></p>
            <div class="signature-line"></div>
            <p>_________________ /__________/</p>
            <p>М.П.</p>
        </div>
        <div class="signature-box">
            <p><strong>Заказчик:</strong></p>
            <div class="signature-line"></div>
            <p>_________________ /__________/</p>
        </div>
    </div>

    <div class="footer-text">
        Акт составлен в двух экземплярах: по одному для каждой стороны.
    </div>
</body>
</html>`, totalSum, totalSum))

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=act_%s.html", act.ActNumber))
	c.String(http.StatusOK, htmlBuilder.String())
}
