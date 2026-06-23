-- ============================================
-- Скрипт миграции базы данных SARP
-- Обновление существующей базы данных
-- Добавлено: 2026-04-29
-- ============================================

-- ============================================
-- ЭТАП 1: Добавление новых колонок
-- ============================================

PRINT 'ЭТАП 1: Добавление новых колонок...'

-- Таблица Admin
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Admin') AND name = 'rolya')
BEGIN
    ALTER TABLE Admin ADD rolya NVARCHAR(50) NOT NULL DEFAULT 'user'
    PRINT '  - Добавлено поле: Admin.rolya'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Admin') AND name = 'last_login')
BEGIN
    ALTER TABLE Admin ADD last_login DATETIME NULL
    PRINT '  - Добавлено поле: Admin.last_login'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Admin') AND name = 'is_active')
BEGIN
    ALTER TABLE Admin ADD is_active BIT NOT NULL DEFAULT 1
    PRINT '  - Добавлено поле: Admin.is_active'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Admin') AND name = 'created_at')
BEGIN
    ALTER TABLE Admin ADD created_at DATETIME NOT NULL DEFAULT GETDATE()
    PRINT '  - Добавлено поле: Admin.created_at'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Admin') AND name = 'updated_at')
BEGIN
    ALTER TABLE Admin ADD updated_at DATETIME NOT NULL DEFAULT GETDATE()
    PRINT '  - Добавлено поле: Admin.updated_at'
END

-- Удаляем old individualny_token если есть
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Admin') AND name = 'individualny_token')
BEGIN
    -- Сохраняем данные перед удалением
    IF OBJECT_ID('tempdb..#old_tokens') IS NOT NULL DROP TABLE #old_tokens
    SELECT admin_id = id, token = individualny_token
    INTO #old_tokens
    FROM Admin
    WHERE individualny_token != '' AND individualny_token IS NOT NULL

    PRINT '  - Удалено поле: Admin.individualny_token (данные сохранены во временную таблицу)'
END

-- Таблица Polzovatel
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Polzovatel') AND name = 'created_at')
BEGIN
    ALTER TABLE Polzovatel ADD created_at DATETIME NOT NULL DEFAULT GETDATE()
    PRINT '  - Добавлено поле: Polzovatel.created_at'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Polzovatel') AND name = 'updated_at')
BEGIN
    ALTER TABLE Polzovatel ADD updated_at DATETIME NOT NULL DEFAULT GETDATE()
    PRINT '  - Добавлено поле: Polzovatel.updated_at'
END

-- Таблица Kategoriya
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Kategoriya') AND name = 'description')
BEGIN
    ALTER TABLE Kategoriya ADD description NVARCHAR(500) NULL
    PRINT '  - Добавлено поле: Kategoriya.description'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Kategoriya') AND name = 'created_at')
BEGIN
    ALTER TABLE Kategoriya ADD created_at DATETIME NOT NULL DEFAULT GETDATE()
    PRINT '  - Добавлено поле: Kategoriya.created_at'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Kategoriya') AND name = 'updated_at')
BEGIN
    ALTER TABLE Kategoriya ADD updated_at DATETIME NOT NULL DEFAULT GETDATE()
    PRINT '  - Добавлено поле: Kategoriya.updated_at'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Kategoriya') AND name = 'is_active')
BEGIN
    ALTER TABLE Kategoriya ADD is_active BIT NOT NULL DEFAULT 1
    PRINT '  - Добавлено поле: Kategoriya.is_active'
END

-- Таблица Uslugi
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Uslugi') AND name = 'min_summa')
BEGIN
    ALTER TABLE Uslugi ADD min_summa MONEY NULL DEFAULT 0
    PRINT '  - Добавлено поле: Uslugi.min_summa'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Uslugi') AND name = 'max_summa')
BEGIN
    ALTER TABLE Uslugi ADD max_summa MONEY NULL DEFAULT 0
    PRINT '  - Добавлено поле: Uslugi.max_summa'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Uslugi') AND name = 'srok_vipolneniya')
BEGIN
    ALTER TABLE Uslugi ADD srok_vipolneniya INT NULL
    PRINT '  - Добавлено поле: Uslugi.srok_vipolneniya'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Uslugi') AND name = 'is_active')
BEGIN
    ALTER TABLE Uslugi ADD is_active BIT NOT NULL DEFAULT 1
    PRINT '  - Добавлено поле: Uslugi.is_active'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Uslugi') AND name = 'created_at')
BEGIN
    ALTER TABLE Uslugi ADD created_at DATETIME NOT NULL DEFAULT GETDATE()
    PRINT '  - Добавлено поле: Uslugi.created_at'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Uslagi') AND name = 'updated_at')
BEGIN
    ALTER TABLE Uslugi ADD updated_at DATETIME NOT NULL DEFAULT GETDATE()
    PRINT '  - Добавлено поле: Uslugi.updated_at'
END

-- Таблица Zayavka
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Zayavka') AND name = 'created_at')
BEGIN
    ALTER TABLE Zayavka ADD created_at DATETIME NOT NULL DEFAULT GETDATE()
    PRINT '  - Добавлено поле: Zayavka.created_at'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Zayavka') AND name = 'updated_at')
BEGIN
    ALTER TABLE Zayavka ADD updated_at DATETIME NOT NULL DEFAULT GETDATE()
    PRINT '  - Добавлено поле: Zayavka.updated_at'
END

-- Таблица Zayavka_Uslugi
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Zayavka_Uslugi') AND name = 'kolichestvo')
BEGIN
    ALTER TABLE Zayavka_Uslugi ADD kolichestvo INT NOT NULL DEFAULT 1
    PRINT '  - Добавлено поле: Zayavka_Uslugi.kolichestvo'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Zayavka_Uslugi') AND name = 'cena_za_ed')
BEGIN
    ALTER TABLE Zayavka_Uslugi ADD cena_za_ed MONEY NULL
    PRINT '  - Добавлено поле: Zayavka_Uslugi.cena_za_ed'
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Zayavka_Uslugi') AND name = 'created_at')
BEGIN
    ALTER TABLE Zayavka_Uslugi ADD created_at DATETIME NOT NULL DEFAULT GETDATE()
    PRINT '  - Добавлено поле: Zayavka_Uslugi.created_at'
END

PRINT 'ЭТАП 1 завершен успешно!'
PRINT ''

-- ============================================
-- ЭТАП 2: Создание новых таблиц
-- ============================================

PRINT 'ЭТАП 2: Создание новых таблиц...'

-- Таблица AdminTokens
IF OBJECT_ID('AdminTokens', 'U') IS NULL
BEGIN
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
    )
    PRINT '  - Создана таблица: AdminTokens'

    -- Создание индексов
    CREATE INDEX idx_admin_tokens_admin ON AdminTokens(admin_id)
    CREATE INDEX idx_admin_tokens_expires ON AdminTokens(expires_at)
    CREATE INDEX idx_admin_tokens_revoked ON AdminTokens(is_revoked)
    CREATE INDEX idx_admin_tokens_hash ON AdminTokens(token_hash)
    PRINT '  - Созданы индексы для AdminTokens'
END

-- Таблица Zayavka_Status_History
IF OBJECT_ID('Zayavka_Status_History', 'U') IS NULL
BEGIN
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
    )
    PRINT '  - Создана таблица: Zayavka_Status_History'

    CREATE INDEX idx_status_history_zayavka ON Zayavka_Status_History(zayavka_id)
    CREATE INDEX idx_status_history_admin ON Zayavka_Status_History(admin_id)
    PRINT '  - Созданы индексы для Zayavka_Status_History'
END

PRINT 'ЭТАП 2 завершен успешно!'
PRINT ''

-- ============================================
-- ЭТАП 3: Создание индексов
-- ============================================

PRINT 'ЭТАП 3: Создание индексов...'

-- Индексы для Polzovatel
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_polzovatel_email' AND object_id = OBJECT_ID('Polzovatel'))
BEGIN
    CREATE UNIQUE INDEX idx_polzovatel_email ON Polzovatel(email)
    PRINT '  - Создан индекс: idx_polzovatel_email'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_polzovatel_imya' AND object_id = OBJECT_ID('Polzovatel'))
BEGIN
    CREATE INDEX idx_polzovatel_imya ON Polzovatel(imya)
    PRINT '  - Создан индекс: idx_polzovatel_imya'
END

-- Индексы для Admin
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_admin_email' AND object_id = OBJECT_ID('Admin'))
BEGIN
    CREATE UNIQUE INDEX idx_admin_email ON Admin(email)
    PRINT '  - Создан индекс: idx_admin_email'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_admin_rolya' AND object_id = OBJECT_ID('Admin'))
BEGIN
    CREATE INDEX idx_admin_rolya ON Admin(rolya)
    PRINT '  - Создан индекс: idx_admin_rolya'
END

-- Индексы для Kategoriya
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_kategoriya_active' AND object_id = OBJECT_ID('Kategoriya'))
BEGIN
    CREATE INDEX idx_kategoriya_active ON Kategoriya(is_active)
    PRINT '  - Создан индекс: idx_kategoriya_active'
END

-- Индексы для Uslugi
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_uslugi_kategoriya' AND object_id = OBJECT_ID('Uslugi'))
BEGIN
    CREATE INDEX idx_uslugi_kategoriya ON Uslugi(kategoriya_id)
    PRINT '  - Создан индекс: idx_uslugi_kategoriya'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_uslugi_active' AND object_id = OBJECT_ID('Uslugi'))
BEGIN
    CREATE INDEX idx_uslugi_active ON Uslugi(is_active)
    PRINT '  - Создан индекс: idx_uslugi_active'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_uslugi_cena' AND object_id = OBJECT_ID('Uslugi'))
BEGIN
    CREATE INDEX idx_uslugi_cena ON Uslugi(tsen)
    PRINT '  - Создан индекс: idx_uslugi_cena'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_uslugi_naimenovanie' AND object_id = OBJECT_ID('Uslugi'))
BEGIN
    CREATE INDEX idx_uslugi_naimenovanie ON Uslugi(naimenovanie)
    PRINT '  - Создан индекс: idx_uslugi_naimenovanie'
END

-- Индексы для Zayavka
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_zayavka_status' AND object_id = OBJECT_ID('Zayavka'))
BEGIN
    CREATE INDEX idx_zayavka_status ON Zayavka(status)
    PRINT '  - Создан индекс: idx_zayavka_status'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_zayavka_polzovatel' AND object_id = OBJECT_ID('Zayavka'))
BEGIN
    CREATE INDEX idx_zayavka_polzovatel ON Zayavka(polzovatel_id)
    PRINT '  - Создан индекс: idx_zayavka_polzovatel'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_zayavka_admin' AND object_id = OBJECT_ID('Zayavka'))
BEGIN
    CREATE INDEX idx_zayavka_admin ON Zayavka(admin_id)
    PRINT '  - Создан индекс: idx_zayavka_admin'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_zayavka_data' AND object_id = OBJECT_ID('Zayavka'))
BEGIN
    CREATE INDEX idx_zayavka_data ON Zayavka(data_podachi)
    PRINT '  - Создан индекс: idx_zayavka_data'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_zayavka_cena' AND object_id = OBJECT_ID('Zayavka'))
BEGIN
    CREATE INDEX idx_zayavka_cena ON Zayavka(tsen)
    PRINT '  - Создан индекс: idx_zayavka_cena'
END

-- Индексы для Zayavka_Uslugi
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_zu_zayavka' AND object_id = OBJECT_ID('Zayavka_Uslugi'))
BEGIN
    CREATE INDEX idx_zu_zayavka ON Zayavka_Uslugi(zayavka_id)
    PRINT '  - Создан индекс: idx_zu_zayavka'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_zu_uslugi' AND object_id = OBJECT_ID('Zayavka_Uslugi'))
BEGIN
    CREATE INDEX idx_zu_uslugi ON Zayavka_Uslugi(uslugi_id)
    PRINT '  - Создан индекс: idx_zu_uslugi'
END

PRINT 'ЭТАП 3 завершен успешно!'
PRINT ''

-- ============================================
-- ЭТАП 4: Хранимые процедуры
-- ============================================

PRINT 'ЭТАП 4: Создание хранимых процедур...'

-- sp_CreateZayavka
IF OBJECT_ID('sp_CreateZayavka', 'P') IS NOT NULL
    DROP PROCEDURE sp_CreateZayavka
GO

CREATE PROCEDURE sp_CreateZayavka
    @polzovatel_id INT,
    @uslugi_ids NVARCHAR(MAX),
    @tz NVARCHAR(500),
    @nomer NVARCHAR(50) OUTPUT,
    @zayavka_id INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @year INT = YEAR(GETDATE())
    DECLARE @counter INT = ISNULL((SELECT MAX(CAST(SUBSTRING(nomer, CHARINDEX('-', nomer, CHARINDEX('-', nomer) + 1) + 1, LEN(nomer)) AS INT)) 
                                   FROM Zayavka 
                                   WHERE nomer LIKE 'ZAY-' + CAST(@year AS NVARCHAR(4)) + '-%'), 0) + 1
    
    SET @nomer = 'ZAY-' + CAST(@year AS NVARCHAR(4)) + '-' + RIGHT('0000' + CAST(@counter AS NVARCHAR(4)), 4)
    
    INSERT INTO Zayavka (nomer, status, data_podachi, polzovatel_id, tz)
    VALUES (@nomer, N'Новая', GETDATE(), @polzovatel_id, @tz)
    
    SET @zayavka_id = SCOPE_IDENTITY()
    
    INSERT INTO Zayavka_Uslugi (zayavka_id, uslugi_id, cena_za_ed)
    SELECT @zayavka_id, value, u.tsena
    FROM OPENJSON(@uslugi_ids)
    JOIN Uslugi u ON u.id = CAST(value AS INT)
END
GO
PRINT '  - Создана процедура: sp_CreateZayavka'

-- sp_UpdateZayavkaStatus
IF OBJECT_ID('sp_UpdateZayavkaStatus', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateZayavkaStatus
GO

CREATE PROCEDURE sp_UpdateZayavkaStatus
    @zayavka_id INT,
    @status NVARCHAR(50),
    @admin_id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @old_status NVARCHAR(50)
    SELECT @old_status = status FROM Zayavka WHERE id = @zayavka_id
    
    UPDATE Zayavka 
    SET status = @status, 
        admin_id = @admin_id,
        data_resheniya = CASE WHEN @status IN (N'Завершена', N'Отклонена') THEN GETDATE() ELSE data_resheniya END,
        updated_at = GETDATE()
    WHERE id = @zayavka_id
    
    IF @old_status != @status
    BEGIN
        INSERT INTO Zayavka_Status_History (zayavka_id, old_status, new_status, admin_id)
        VALUES (@zayavka_id, @old_status, @status, @admin_id)
    END
END
GO
PRINT '  - Создана процедура: sp_UpdateZayavkaStatus'

-- sp_UpdateZayavkaTsena
IF OBJECT_ID('sp_UpdateZayavkaTsena', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateZayavkaTsena
GO

CREATE PROCEDURE sp_UpdateZayavkaTsena
    @zayavka_id INT,
    @tsena MONEY
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE Zayavka 
    SET tsen = @tsena,
        updated_at = GETDATE()
    WHERE id = @zayavka_id
END
GO
PRINT '  - Создана процедура: sp_UpdateZayavkaTsena'

PRINT 'ЭТАП 4 завершен успешно!'
PRINT ''

-- ============================================
-- ЭТАП 5: Триггеры
-- ============================================

PRINT 'ЭТАП 5: Создание триггеров...'

-- trg_Polzovatel_Update
IF OBJECT_ID('trg_Polzovatel_Update', 'TR') IS NOT NULL
    DROP TRIGGER trg_Polzovatel_Update
GO
CREATE TRIGGER trg_Polzovatel_Update ON Polzovatel AFTER UPDATE AS
BEGIN
    UPDATE Polzovatel SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted)
END
GO
PRINT '  - Создан триггер: trg_Polzovatel_Update'

-- trg_Admin_Update
IF OBJECT_ID('trg_Admin_Update', 'TR') IS NOT NULL
    DROP TRIGGER trg_Admin_Update
GO
CREATE TRIGGER trg_Admin_Update ON Admin AFTER UPDATE AS
BEGIN
    UPDATE Admin SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted)
END
GO
PRINT '  - Создан триггер: trg_Admin_Update'

-- trg_Uslugi_Update
IF OBJECT_ID('trg_Uslugi_Update', 'TR') IS NOT NULL
    DROP TRIGGER trg_Uslugi_Update
GO
CREATE TRIGGER trg_Uslugi_Update ON Uslugi AFTER UPDATE AS
BEGIN
    UPDATE Uslugi SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted)
END
GO
PRINT '  - Создан триггер: trg_Uslugi_Update'

-- trg_Kategoriya_Update
IF OBJECT_ID('trg_Kategoriya_Update', 'TR') IS NOT NULL
    DROP TRIGGER trg_Kategoriya_Update
GO
CREATE TRIGGER trg_Kategoriya_Update ON Kategoriya AFTER UPDATE AS
BEGIN
    UPDATE Kategoriya SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted)
END
GO
PRINT '  - Создан триггер: trg_Kategoriya_Update'

-- trg_Zayavka_Update
IF OBJECT_ID('trg_Zayavka_Update', 'TR') IS NOT NULL
    DROP TRIGGER trg_Zayavka_Update
GO
CREATE TRIGGER trg_Zayavka_Update ON Zayavka AFTER UPDATE AS
BEGIN
    UPDATE Zayavka SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted)
END
GO
PRINT '  - Создан триггер: trg_Zayavka_Update'

PRINT 'ЭТАП 5 завершен успешно!'
PRINT ''

-- ============================================
-- ЭТАП 6: Представление
-- ============================================

PRINT 'ЭТАП 6: Создание представления...'

IF OBJECT_ID('v_Zayavka_Details', 'V') IS NOT NULL
    DROP VIEW v_Zayavka_Details
GO

CREATE VIEW v_Zayavka_Details AS
SELECT 
    z.id,
    z.nomer,
    z.status,
    z.data_podachi,
    z.data_resheniya,
    z.polzovatel_id,
    p.imya as polzovatel_imya,
    p.email as polzovatel_email,
    p.messenger as polzovatel_messenger,
    z.admin_id,
    a.imya as admin_imya,
    z.tsen,
    z.tz,
    STRING_AGG(u.naimenovanie, ', ') as uslugi_list,
    COUNT(DISTINCT u.id) as uslugi_count,
    SUM(u.tsena) as uslugi_sum
FROM Zayavka z
JOIN Polzovatel p ON z.polzovatel_id = p.id
LEFT JOIN Admin a ON z.admin_id = a.id
LEFT JOIN Zayavka_Uslugi zu ON z.id = zu.zayavka_id
LEFT JOIN Uslugi u ON zu.uslugi_id = u.id
GROUP BY z.id, z.nomer, z.status, z.data_podachi, z.data_resheniya, 
         z.polzovatel_id, p.imya, p.email, p.messenger,
         z.admin_id, a.imya, z.tsen, z.tz
GO
PRINT '  - Создано представление: v_Zayavka_Details'

PRINT 'ЭТАП 6 завершен успешно!'
PRINT ''

PRINT '========================================'
PRINT 'Миграция завершена успешно!'
PRINT '========================================'
PRINT ''
PRINT 'Рекомендуется:'
PRINT '1. Обновить код приложения для использования новых таблиц'
PRINT '2. Настроить регулярную очистку просроченных токенов'
PRINT '3. Настроить резервное копирование БД'
PRINT '4. Проверить работу хранимых процедур'
PRINT ''