package main

import (
	"client-management/db"
	"client-management/handlers"
	"client-management/middleware"
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	loc, err := time.LoadLocation("Europe/Minsk")
	if err != nil {
		loc = time.FixedZone("MSK", 3*60*60)
	}
	time.Local = loc

	// Подключение к базе данных
	db.Connect()

	r := gin.Default()

	// CORS настройки
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Публичные маршруты (без авторизации)
	r.POST("/api/login", handlers.Login)
	r.POST("/api/register", handlers.Register)
	r.GET("/api/welcome", handlers.GetWelcomePage)
	r.GET("/api/acts/:actId/download", handlers.GetActHTML)
	r.GET("/api/uslugi", handlers.GetUslugi)                  // ← Добавить
	r.GET("/api/kategorii", handlers.GetKategorii)            // ← Добавить
	r.GET("/api/uslugi/:id/params", handlers.GetUslugiParams) // ← Добавить (для параметров услуг)

	// Защищенные маршруты (требуют авторизации)
	auth := r.Group("/api")
	auth.Use(middleware.AuthMiddleware())
	{
		// Пользовательские маршруты (доступны всем авторизованным)
		auth.GET("/zayavki/:id", handlers.GetZayavkaForUser) // ← ДОБАВИТЬ
		auth.GET("/my/zayavki", handlers.GetMyZayavki)
		auth.POST("/zayavki", handlers.CreateZayavka)
		auth.GET("/zayavki/:id/messages", handlers.GetOrderMessages)
		auth.GET("/zayavki/:id/files", handlers.GetOrderFiles)
		auth.GET("/zayavki/:id/versions", handlers.GetTzVersions)
		auth.POST("/zayavki/:id/messages", handlers.SendOrderMessage)
		auth.POST("/zayavki/:id/files", handlers.UploadFile)
		auth.GET("/download/:fileId", handlers.DownloadFile)
		auth.GET("/my/profile", handlers.GetMyProfile)
		auth.PUT("/my/profile", handlers.UpdateMyProfile)
		auth.GET("/zayavki/:id/acts", handlers.GetActsForUser) // Только для пользователей
		auth.GET("/acts/:actId", handlers.GetAct)              // Добавить эту строку - используем ту же функцию GetAct

		// Админ и Manager маршруты (работа с заявками)
		// Админ и Manager маршруты (работа с заявками)
		adminManager := auth.Group("/")
		adminManager.Use(middleware.RequireAdminOrManager())
		{
			adminManager.GET("/admin/zayavki", handlers.GetZayavki)
			adminManager.GET("/admin/zayavki/:id", handlers.GetZayavka)
			adminManager.PUT("/admin/zayavki/:id/status", handlers.UpdateZayavkaStatus)
			adminManager.PUT("/admin/zayavki/:id/tsena", handlers.UpdateZayavkaTsena)
			adminManager.DELETE("/admin/zayavki/:id", handlers.DeleteZayavka)

			// Версии ТЗ
			adminManager.POST("/zayavki/:id/versions", handlers.CreateTzVersion)

			// Файлы (загрузка доступна всем авторизованным через auth группу выше)
			// adminManager.POST("/zayavki/:id/files", handlers.UploadFile) -- перенесено в auth

			// Акты - ДЛЯ АДМИНОВ И МЕНЕДЖЕРОВ
			adminManager.GET("/admin/zayavki/:id/acts", handlers.GetActs)
			adminManager.POST("/admin/zayavki/:id/acts", handlers.CreateActFromOrder)
			adminManager.GET("/admin/acts/:actId", handlers.GetAct)
			adminManager.PUT("/admin/acts/:actId/status", handlers.UpdateActStatus) // ← ДОБАВИТЬ
			adminManager.DELETE("/acts/:actId", handlers.DeleteAct)                 // ← ДОБАВИТЬ ЭТУ СТРОКУ
		}

		// Только админ маршруты
		adminOnly := auth.Group("/admin")
		adminOnly.Use(middleware.RequireAdmin())
		{
			// Управление пользователями
			adminOnly.GET("/polzovateli", handlers.GetPolzovateli)
			adminOnly.GET("/polzovateli/:id", handlers.GetPolzovatel)
			adminOnly.PUT("/polzovateli/:id", handlers.UpdatePolzovatel)
			adminOnly.DELETE("/polzovateli/:id", handlers.DeletePolzovatel)
			adminOnly.GET("/managers", handlers.GetManagers)
			adminOnly.POST("/zayavki/:id/assign-manager", handlers.AssignManagerToZayavka)

			// Управление администраторами
			adminOnly.GET("/admins", handlers.GetAdmins)
			adminOnly.PUT("/admins/:id/role", handlers.UpdateAdminRole)

			// Блокировка/разблокировка пользователей
			adminOnly.POST("/admins/:id/block", handlers.BlockUser)
			adminOnly.POST("/admins/:id/unblock", handlers.UnblockUser)

			// Управление услугами
			adminOnly.POST("/uslugi", handlers.CreateUslugi)
			adminOnly.PUT("/uslugi/:id", handlers.UpdateUslugi)
			adminOnly.DELETE("/uslugi/:id", handlers.DeleteUslugi)

			// Управление параметрами услуг
			adminOnly.POST("/uslugi-params", handlers.CreateUslugiParam)
			adminOnly.PUT("/uslugi-params/:id", handlers.UpdateUslugiParam)
			adminOnly.DELETE("/uslugi-params/:id", handlers.DeleteUslugiParam)

			// Управление категориями
			adminOnly.POST("/kategorii", handlers.CreateKategoriya)
			adminOnly.DELETE("/kategorii/:id", handlers.DeleteKategoriya)

			// Управление главной страницей
			adminOnly.PUT("/welcome", handlers.UpdateWelcomePage)

			// Отчёты
			adminOnly.GET("/reports", handlers.GetReport)
			adminOnly.GET("/reports/price-list", handlers.GetPriceListReport)
			adminOnly.GET("/reports/order-details/:id", handlers.GetOrderDetailsReport)
			adminOnly.GET("/reports/period-orders", handlers.GetPeriodOrdersReport)
			adminOnly.GET("/reports/status-orders", handlers.GetStatusOrdersReport)
		}
	}

	log.Println("Сервер запущен на :8080")
	r.Run(":8080")
}
