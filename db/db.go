package db

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/denisenkom/go-mssqldb"
)

var DB *sql.DB

func Connect() {
	connString := "sqlserver://localhost?database=SARP&connection+timeout=30&trusted_connection=yes"

	var err error
	DB, err = sql.Open("sqlserver", connString)
	if err != nil {
		log.Fatalf("Ошибка подключения к БД: %v", err)
	}
	_, err = DB.Exec("SET TIMEZONE TO 'Europe/Minsk'")
	if err != nil {
		log.Println("Предупреждение: не удалось установить часовой пояс:", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatalf("БД недоступна: %v", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	log.Println("Подключение к SQL Server успешно")
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
