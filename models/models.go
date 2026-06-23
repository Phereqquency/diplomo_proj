package models

import "time"

type Kategoriya struct {
	ID           int    `json:"id"`
	Naimenovanie string `json:"naimenovanie" binding:"required,min=1,max=100"`
}

type Uslugi struct {
	ID           int                  `json:"id"`
	Naimenovanie string               `json:"naimenovanie" binding:"required,min=1,max=200"`
	Opisanie     string               `json:"opisanie" binding:"max=500"`
	Kartinka     string               `json:"kartinka" binding:"max=500"`
	KategoriyaID int                  `json:"kategoriya_id" binding:"required,min=1"`
	Kategoriya   string               `json:"kategoriya,omitempty"`
	Tsena        float64              `json:"tsena" binding:"required,min=0"`
	Params       []ZayavkaUslugiParam `json:"params,omitempty"`
}

type Polzovatel struct {
	ID          int    `json:"id"`
	Imya        string `json:"imya" binding:"required,min=2,max=100"`
	Email       string `json:"email" binding:"required,email,max=100"`
	Messenger   string `json:"messenger" binding:"max=100"`
	Pozhelaniya string `json:"pozhelaniya" binding:"max=500"`
}

type Admin struct {
	ID                int        `json:"id"`
	Imya              string     `json:"imya"`
	Email             string     `json:"email"`
	PasswordHash      string     `json:"-"`
	IndividualnyToken string     `json:"individualy_token,omitempty"`
	Role              string     `json:"role"`
	IsBlocked         bool       `json:"is_blocked"`
	BlockedAt         *time.Time `json:"blocked_at,omitempty"`
	BlockedReason     string     `json:"blocked_reason,omitempty"`
}

// Для списка пользователей с информацией о блокировке
type AdminWithBlockInfo struct {
	ID            int        `json:"id"`
	Imya          string     `json:"imya"`
	Email         string     `json:"email"`
	Role          string     `json:"role"`
	IsBlocked     bool       `json:"is_blocked"`
	BlockedAt     *time.Time `json:"blocked_at,omitempty"`
	BlockedReason string     `json:"blocked_reason,omitempty"`
}

type RegisterRequest struct {
	Imya     string `json:"imya" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"required,email,max=100"`
	Password string `json:"password" binding:"required,min=6,max=255"`
}

type UpdateRoleRequest struct {
	Role string `json:"role" binding:"required,oneof=admin user manager"`
}

type UpdateUserRequest struct {
	Imya        string `json:"imya"`
	Email       string `json:"email"`
	Messenger   string `json:"messenger"`
	Pozhelaniya string `json:"pozhelaniya"`
}

type AdminRole struct {
	ID        int    `json:"id"`
	Imya      string `json:"imya"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	IsBlocked bool   `json:"is_blocked"`
}

type Zayavka struct {
	ID                   int                       `json:"id"`
	Nomer                string                    `json:"nomer"`
	Status               string                    `json:"status"`
	DataPodachi          time.Time                 `json:"data_podachi"`
	DataResheniya        *time.Time                `json:"data_resheniya"`
	PolzovatelID         int                       `json:"polzovatel_id"`
	AdminID              *int                      `json:"admin_id"`
	Tsena                *float64                  `json:"tsena"`
	Tz                   string                    `json:"tz"`
	Srochnost            string                    `json:"srochnost"` // new field
	Polzovatel           *Polzovatel               `json:"polzovatel,omitempty"`
	Admin                *Admin                    `json:"admin,omitempty"`
	Uslugi               []ZayavkaUslugaWithParams `json:"uslugi,omitempty"`
	AssignedManagerID    *int                      `json:"assigned_manager_id"`              // ДОБАВИТЬ
	AssignedManager      *Admin                    `json:"assigned_manager,omitempty"`       // ДОБАВИТЬ
	AssignedManagerName  string                    `json:"assigned_manager_name,omitempty"`  // Добавить
	AssignedManagerEmail string                    `json:"assigned_manager_email,omitempty"` // Добавить
}

type ZayavkaCreate struct {
	UslugiIDs []int  `json:"uslugi_ids"`
	Tz        string `json:"tz"`
	Srochnost string `json:"srochnost"` // new field
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	Admin Admin  `json:"admin"`
}

type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

type UpdateTsenaRequest struct {
	Tsena float64 `json:"tsena" binding:"required,min=0"`
}

type ReportFilters struct {
	DateFrom string `json:"date_from"`
	DateTo   string `json:"date_to"`
	Status   string `json:"status"`
}

type Report struct {
	TotalZayavki int            `json:"total_zayavki"`
	ByStatus     map[string]int `json:"by_status"`
	BySrochnost  map[string]int `json:"by_srochnost"`
	ByPeriod     []PeriodStat   `json:"by_period"`
	TopUslugi    []UslugiStat   `json:"top_uslugi"`
	ExpiredCount int            `json:"expired_count"`
	DateFrom     string         `json:"date_from"`
	DateTo       string         `json:"date_to"`
}

type PeriodStat struct {
	Period string `json:"period"`
	Count  int    `json:"count"`
}

type UslugiStat struct {
	Naimenovanie string  `json:"naimenovanie"`
	Count        int     `json:"count"`
	TotalSum     float64 `json:"total_sum"`
}

// Block type constants
const (
	BlockTypeHero     = "hero"
	BlockTypeFeatures = "features"
	BlockTypeCTA      = "cta"
	BlockTypeFooter   = "footer"
	BlockTypeText     = "text"
	BlockTypeHtml     = "html"
	BlockTypeServices = "services"
)

// WelcomePage represents the stored database record (content as JSON string)
type WelcomePage struct {
	ID        int    `json:"id"`
	Content   string `json:"content"`
	UpdatedAt string `json:"updated_at"`
	UpdatedBy *int   `json:"updated_by,omitempty"`
}

// WelcomePageBlock represents a block in the page builder
type WelcomePageBlock struct {
	Type  string                 `json:"type"`
	Props map[string]interface{} `json:"props"`
	ID    string                 `json:"id,omitempty"`
}

// WelcomePageUpdate is the DTO for updating page content
type WelcomePageUpdate struct {
	Content []WelcomePageBlock `json:"content" binding:"required"`
}

type HeroBlockProps struct {
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Image    string `json:"image"`
	Text     string `json:"text"`
}

type FeaturesBlockProps struct {
	Title string        `json:"title"`
	Items []FeatureItem `json:"items"`
}

type FeatureItem struct {
	Icon  string `json:"icon"`
	Title string `json:"title"`
	Text  string `json:"text"`
}

// Act - акт выполненных работ
type Act struct {
	ID        int       `json:"id"`
	ZayavkaID int       `json:"zayavka_id"`
	ActNumber string    `json:"act_number"`
	ActDate   time.Time `json:"act_date"`
	FilePath  string    `json:"file_path"`
	FileName  string    `json:"file_name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	CreatedBy int       `json:"created_by"`
}

// ActItem - позиция акта
type ActItem struct {
	ID         int     `json:"id"`
	ActID      int     `json:"act_id"`
	UslugaName string  `json:"usluga_name"`
	Opisanie   string  `json:"opisanie"`
	Quantity   int     `json:"quantity"`
	Price      float64 `json:"price"`
	Total      float64 `json:"total"`
}

// CreateActRequest - запрос на создание акта
type CreateActRequest struct {
	ZayavkaID int    `json:"zayavka_id"`
	ActNumber string `json:"act_number"`
}

// OrderReport - отчёт по заказу
type OrderReport struct {
	ID           int       `json:"id"`
	ZayavkaID    int       `json:"zayavka_id"`
	ReportNumber string    `json:"report_number"`
	ReportType   string    `json:"report_type"`
	FilePath     string    `json:"file_path"`
	FileName     string    `json:"file_name"`
	CreatedAt    time.Time `json:"created_at"`
	CreatedBy    int       `json:"created_by"`
}
type CtaBlockProps struct {
	Text string `json:"text"`
	Link string `json:"link"`
}

type FooterBlockProps struct {
	Text string `json:"text"`
}

type TextBlockProps struct {
	Content string `json:"content"`
}

type HtmlBlockProps struct {
	Html string `json:"html"`
}

type ServicesBlockProps struct {
	Title string `json:"title"`
}

// TzVersion - версия технического задания
type TzVersion struct {
	ID            int       `json:"id"`
	ZayavkaID     int       `json:"zayavka_id"`
	VersionNumber int       `json:"version_number"`
	Content       string    `json:"content"`
	CreatedAt     time.Time `json:"created_at"`
	CreatedBy     int       `json:"created_by"`
	Comment       string    `json:"comment"`
}

// OrderFile - файл заказа
type OrderFile struct {
	ID          int       `json:"id"`
	ZayavkaID   int       `json:"zayavka_id"`
	FileName    string    `json:"file_name"`
	FilePath    string    `json:"file_path"`
	FileType    string    `json:"file_type"`
	FileSize    int64     `json:"file_size"`
	UploadedAt  time.Time `json:"uploaded_at"`
	UploadedBy  int       `json:"uploaded_by"`
	Description string    `json:"description"`
}

// OrderMessage - сообщение чата
type OrderMessage struct {
	ID        int       `json:"id"`
	ZayavkaID int       `json:"zayavka_id"`
	SenderID  int       `json:"sender_id"`
	Message   string    `json:"message"`
	FileID    *int      `json:"file_id"`
	CreatedAt time.Time `json:"created_at"`
	IsRead    bool      `json:"is_read"`
}

// OrderMessageFull - сообщение с данными файла
type OrderMessageFull struct {
	ID        int       `json:"id"`
	ZayavkaID int       `json:"zayavka_id"`
	SenderID  int       `json:"sender_id"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
	IsRead    bool      `json:"is_read"`
	FileID    int       `json:"file_id,omitempty"`
	FileName  string    `json:"file_name,omitempty"`
	FilePath  string    `json:"file_path,omitempty"`
}

// CreateTzVersionRequest - запрос на создание версии ТЗ
type CreateTzVersionRequest struct {
	Content string `json:"content" binding:"required"`
	Comment string `json:"comment"`
}

// SendMessageRequest - запрос на отправку сообщения
type SendMessageRequest struct {
	Message string `json:"message" binding:"required"`
	FileID  int    `json:"file_id"`
}

// UslugiParam - параметр услуги
type UslugiParam struct {
	ID           int     `json:"id"`
	UslugaID     int     `json:"usluga_id"`
	ParamName    string  `json:"param_name"`
	ParamType    string  `json:"param_type"`
	ParamOptions string  `json:"param_options"`
	IsRequired   bool    `json:"is_required"`
	SortOrder    int     `json:"sort_order"`
	Price        float64 `json:"price"` // Добавлено поле цены
}

// ZayavkaUslugiParam - значение параметра для заказа (добавляем цену)
type ZayavkaUslugiParam struct {
	ID         int     `json:"id"`
	ZayavkaID  int     `json:"zayavka_id"`
	UslugiID   int     `json:"uslugi_id"`
	ParamID    int     `json:"param_id"`
	ParamName  string  `json:"param_name"` // Название параметра
	ParamValue string  `json:"param_value"`
	ParamPrice float64 `json:"param_price"`
}
type PolzovatelWithBlockInfo struct {
	ID            int    `json:"id"`
	Imya          string `json:"imya"`
	Email         string `json:"email"`
	Messenger     string `json:"messenger"`
	Pozhelaniya   string `json:"pozhelaniya"`
	Role          string `json:"role"`
	IsBlocked     bool   `json:"is_blocked"`
	BlockedReason string `json:"blocked_reason"`
}

// UslugaWithParams - услуга с параметрами
type UslugaWithParams struct {
	Uslugi
	Params []UslugiParam `json:"params"`
}

// CreateZayavkaRequest - расширенный запрос создания заказа
type CreateZayavkaRequest struct {
	UslugiIDs []int                     `json:"uslugi_ids"`
	Tz        string                    `json:"tz"`
	Srochnost string                    `json:"srochnost"`
	Params    map[int]map[string]string `json:"params"` // usluga_id -> {param_id: value}
}

// ZayavkaUslugiWithParams - услуга в заказе с параметрами
type ZayavkaUslugiWithParams struct {
	Uslugi
	Params []ZayavkaUslugiParam `json:"params"`
}
type ZayavkaUslugaWithParams struct {
	ID           int                  `json:"id"`
	Naimenovanie string               `json:"naimenovanie"`
	Opisanie     string               `json:"opisanie"`
	Kartinka     string               `json:"kartinka"`
	KategoriyaID int                  `json:"kategoriya_id"`
	Kategoriya   string               `json:"kategoriya"`
	Tsena        float64              `json:"tsena"`
	Params       []ZayavkaUslugiParam `json:"params"`
}
