package handlers

import (
	"client-management/db"
	"client-management/models"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

const uploadDir = "./uploads"

func init() {
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		panic(err)
	}
}

// Получить все версии ТЗ для заказа
func GetTzVersions(c *gin.Context) {
	zayavkaId := c.Param("id")

	rows, err := db.DB.Query(`
		SELECT id, zayavka_id, version_number, content, created_at, created_by, COALESCE(comment, '')
		FROM TzVersions 
		WHERE zayavka_id = @p1 
		ORDER BY version_number DESC`,
		zayavkaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var versions []models.TzVersion
	for rows.Next() {
		var v models.TzVersion
		err := rows.Scan(&v.ID, &v.ZayavkaID, &v.VersionNumber, &v.Content, &v.CreatedAt, &v.CreatedBy, &v.Comment)
		if err != nil {
			continue
		}
		versions = append(versions, v)
	}

	c.JSON(http.StatusOK, versions)
}

// Создать новую версию ТЗ
func CreateTzVersion(c *gin.Context) {
	zayavkaId := c.Param("id")

	var req models.CreateTzVersionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var maxVersion int
	db.DB.QueryRow(`
		SELECT COALESCE(MAX(version_number), 0) FROM TzVersions WHERE zayavka_id = @p1`,
		zayavkaId).Scan(&maxVersion)

	newVersion := maxVersion + 1
	userID := getUserIDFromContext(c)

	var versionId int
	err := db.DB.QueryRow(`
		INSERT INTO TzVersions (zayavka_id, version_number, content, created_by, comment)
		OUTPUT INSERTED.id
		VALUES (@p1, @p2, @p3, @p4, @p5)`,
		zayavkaId, newVersion, req.Content, userID, req.Comment).Scan(&versionId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":             versionId,
		"version_number": newVersion,
		"message":        "Версия ТЗ создана",
	})
}

// Загрузить файл
func UploadFile(c *gin.Context) {
	zayavkaId := c.Param("id")

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл не загружен"})
		return
	}

	uniqueFilename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), file.Filename)
	filePath := filepath.Join(uploadDir, uniqueFilename)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения файла"})
		return
	}

	fileType := "image"
	fileExt := filepath.Ext(file.Filename)
	if fileExt == ".psd" {
		fileType = "psd"
	} else if fileExt == ".fig" {
		fileType = "figma"
	} else if fileExt == ".pdf" {
		fileType = "pdf"
	} else if fileExt == ".zip" {
		fileType = "archive"
	}

	userID := getUserIDFromContext(c)

	var fileId int
	err = db.DB.QueryRow(`
		INSERT INTO OrderFiles (zayavka_id, file_name, file_path, file_type, file_size, uploaded_by)
		OUTPUT INSERTED.id
		VALUES (@p1, @p2, @p3, @p4, @p5, @p6)`,
		zayavkaId, file.Filename, filePath, fileType, file.Size, userID).Scan(&fileId)
	if err != nil {
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":        fileId,
		"file_name": file.Filename,
		"file_path": "/api/uploads/" + uniqueFilename,
		"file_size": file.Size,
		"file_type": fileType,
	})
}

// Получить все файлы заказа
func GetOrderFiles(c *gin.Context) {
	zayavkaId := c.Param("id")

	rows, err := db.DB.Query(`
		SELECT id, file_name, file_path, file_type, file_size, uploaded_at, uploaded_by, COALESCE(description, '')
		FROM OrderFiles 
		WHERE zayavka_id = @p1 
		ORDER BY uploaded_at DESC`,
		zayavkaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var files []models.OrderFile
	for rows.Next() {
		var f models.OrderFile
		rows.Scan(&f.ID, &f.FileName, &f.FilePath, &f.FileType, &f.FileSize, &f.UploadedAt, &f.UploadedBy, &f.Description)
		files = append(files, f)
	}

	c.JSON(http.StatusOK, files)
}

// Получить сообщения чата
func GetOrderMessages(c *gin.Context) {
	zayavkaId := c.Param("id")

	fmt.Println("GetOrderMessages called for order:", zayavkaId)

	rows, err := db.DB.Query(`
		SELECT id, zayavka_id, sender_id, message, created_at, is_read, COALESCE(file_id, 0)
		FROM OrderMessages 
		WHERE zayavka_id = @p1 
		ORDER BY created_at ASC`,
		zayavkaId)
	if err != nil {
		fmt.Println("Query error:", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var messages []models.OrderMessageFull
	for rows.Next() {
		var m models.OrderMessageFull
		var fileId int

		err := rows.Scan(&m.ID, &m.ZayavkaID, &m.SenderID, &m.Message, &m.CreatedAt, &m.IsRead, &fileId)
		if err != nil {
			fmt.Println("Scan error:", err.Error())
			continue
		}

		m.FileID = fileId
		messages = append(messages, m)
	}

	fmt.Printf("Returning %d messages\n", len(messages))
	c.JSON(http.StatusOK, messages)
}

// Отправить сообщение в чат
func SendOrderMessage(c *gin.Context) {
	zayavkaId := c.Param("id")

	fmt.Println("SendOrderMessage called for order:", zayavkaId)

	var req models.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Сообщение не может быть пустым"})
		return
	}

	userID := getUserIDFromContext(c)
	fmt.Println("UserID:", userID)

	var fileId interface{} = nil
	if req.FileID > 0 {
		fileId = req.FileID
		fmt.Println("FileID:", req.FileID)
	}

	var messageId int
	err := db.DB.QueryRow(`
		INSERT INTO OrderMessages (zayavka_id, sender_id, message, file_id, created_at, is_read)
		OUTPUT INSERTED.id
		VALUES (@p1, @p2, @p3, @p4, DATEADD(hour, 3, GETUTCDATE()), 0)`,
		zayavkaId, userID, req.Message, fileId).Scan(&messageId)
	if err != nil {
		fmt.Println("Insert error:", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	fmt.Println("Message inserted, ID:", messageId)

	c.JSON(http.StatusCreated, gin.H{
		"id":         messageId,
		"message":    req.Message,
		"created_at": time.Now(),
		"file_id":    req.FileID,
	})
}

// Скачать файл
func DownloadFile(c *gin.Context) {
	fileId := c.Param("fileId")

	var filePath, fileName string
	err := db.DB.QueryRow(`SELECT file_path, file_name FROM OrderFiles WHERE id = @p1`, fileId).Scan(&filePath, &fileName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Файл не найден"})
		return
	}

	c.FileAttachment(filePath, fileName)
}
