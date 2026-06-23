-- ============================================
-- Обновленная схема базы данных SARP
-- Добавлено: 2026-04-29
-- Изменения:
-- 1. Добавлена таблица токенов для управления сессиями
-- 2. Расширена таблица Admin (убрано individualny_token, добавлены новые поля)
-- 3. Добавлены индексы для производительности
-- ============================================

-- =====================================================
-- Таблица пользователей (клиенты)
-- =====================================================
CREATE TABLE Polzovatel (
    id INT IDENTITY(1,1) PRIMARY KEY,
    imya NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) NOT NULL,
    messenger NVARCHAR(100) NULL DEFAULT '',
    pozhelaniya NVARCHAR(500) NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE()
);

CREATE UNIQUE INDEX idx_polzovatel_email ON Polzovatel(email);
CREATE INDEX idx_polzovatel_imya ON Polzovatel(imya);

-- =====================================================
-- Таблица администраторов / менеджеров
-- =====================================================
CREATE TABLE Admin (
    id INT IDENTITY(1,1) PRIMARY KEY,
    imya NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    rolya NVARCHAR(50) NOT NULL DEFAULT 'user',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),
    last_login DATETIME NULL,
    is_active BIT NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX idx_admin_email ON Admin(email);
CREATE INDEX idx_admin_rolya ON Admin(rolya);

-- =====================================================
-- Таблица JWT токенов (для управления сессиями)
-- =====================================================
CREATE TABLE AdminTokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    admin_id INT NOT NULL,
    token_hash NVARCHAR(255) NOT NULL,
    token_text NVARCHAR(500) NULL,
    ip_address NVARCHAR(45) NULL,
    user_agent NVARCHAR(500) NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    revoked_at DATETIME NULL,
    is_revoked BIT NOT NULL DEFAULT 0,
    FOREIGN KEY (admin_id) REFERENCES Admin(id) ON DELETE CASCADE
);

CREATE INDEX idx_admin_tokens_admin ON AdminTokens(admin_id);
CREATE INDEX idx_admin_tokens_expires ON AdminTokens(expires_at);
CREATE INDEX idx_admin_tokens_revoked ON AdminTokens(is_revoked);
CREATE INDEX idx_admin_tokens_hash ON AdminTokens(token_hash);

-- =====================================================
-- Таблица категорий
-- =====================================================
CREATE TABLE Kategoriya (
    id INT IDENTITY(1,1) PRIMARY KEY,
    naimenovanie NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),
    is_active BIT NOT NULL DEFAULT 1
);

CREATE INDEX idx_kategoriya_active ON Kategoriya(is_active);

-- =====================================================
-- Таблица услуг
-- =====================================================
CREATE TABLE Uslugi (
    id INT IDENTITY(1,1) PRIMARY KEY,
    naimenovanie NVARCHAR(200) NOT NULL,
    opisanie NVARCHAR(500) NULL DEFAULT '',
    kartinka NVARCHAR(500) NULL DEFAULT '',
    kategoriya_id INT NOT NULL,
    tsen MONEY NOT NULL DEFAULT 0,
    min_summa MONEY NULL DEFAULT 0,
    max_summa MONEY NULL DEFAULT 0,
    srok_vipolneniya INT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (kategoriya_id) REFERENCES Kategoriya(id) ON DELETE RESTRICT
);

CREATE INDEX idx_uslugi_kategoriya ON Uslugi(kategoriya_id);
CREATE INDEX idx_uslugi_active ON Uslugi(is_active);
CREATE INDEX idx_uslugi_cena ON Uslugi(tsen);
CREATE INDEX idx_uslugi_naimenovanie ON Uslugi(naimenovanie);

-- =====================================================
-- Таблица заявок
-- =====================================================
CREATE TABLE Zayavka (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nomer NVARCHAR(50) NOT NULL UNIQUE,
    status NVARCHAR(50) NOT NULL DEFAULT N'Новая',
    data_podachi DATETIME NOT NULL DEFAULT GETDATE(),
    data_resheniya DATETIME NULL,
    polzovatel_id INT NOT NULL,
    admin_id INT NULL,
    tsen MONEY NULL,
    tz NVARCHAR(500) NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (polzovatel_id) REFERENCES Polzovatel(id) ON DELETE RESTRICT,
    FOREIGN KEY (admin_id) REFERENCES Admin(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_zayavka_nomer ON Zayavka(nomer);
CREATE INDEX idx_zayavka_status ON Zayavka(status);
CREATE INDEX idx_zayavka_polzovatel ON Zayavka(polzovatel_id);
CREATE INDEX idx_zayavka_admin ON Zayavka(admin_id);
CREATE INDEX idx_zayavka_data ON Zayavka(data_podachi);
CREATE INDEX idx_zayavka_cena ON Zayavka(tsen);

-- =====================================================
-- Таблица связей заявок и услуг
-- =====================================================
CREATE TABLE Zayavka_Uslugi (
    id INT IDENTITY(1,1) PRIMARY KEY,
    zayavka_id INT NOT NULL,
    uslugi_id INT NOT NULL,
    kolichestvo INT NOT NULL DEFAULT 1,
    cena_za_ed MONEY NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (zayavka_id) REFERENCES Zayavka(id) ON DELETE CASCADE,
    FOREIGN KEY (uslugi_id) REFERENCES Uslugi(id) ON DELETE RESTRICT,
    UNIQUE(zayavka_id, uslugi_id)
);

CREATE INDEX idx_zu_zayavka ON Zayavka_Uslugi(zayavka_id);
CREATE INDEX idx_zu_uslugi ON Zayavka_Uslugi(uslugi_id);

-- =====================================================
-- Таблица истории статусов
-- =====================================================
CREATE TABLE Zayavka_Status_History (
    id INT IDENTITY(1,1) PRIMARY KEY,
    zayavka_id INT NOT NULL,
    old_status NVARCHAR(50) NULL,
    new_status NVARCHAR(50) NOT NULL,
    admin_id INT NOT NULL,
    comment NVARCHAR(500) NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (zayavka_id) REFERENCES Zayavka(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES Admin(id) ON DELETE RESTRICT
);

CREATE INDEX idx_status_history_zayavka ON Zayavka_Status_History(zayavka_id);
CREATE INDEX idx_status_history_admin ON Zayavka_Status_History(admin_id);