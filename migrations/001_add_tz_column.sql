-- Миграция: добавление поля ТЗ в таблицу заявок
-- Выполнить этот скрипт для добавления колонки tz

USE SARP;
GO

-- Добавляем колонку tz если её нет
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Zayavka' AND COLUMN_NAME = 'tz')
BEGIN
    ALTER TABLE Zayavka ADD tz NVARCHAR(MAX) NULL;
    PRINT 'Колонка tz добавлена в таблицу Zayavka';
END
ELSE
BEGIN
    PRINT 'Колонка tz уже существует';
END
GO

-- Обновляем процедуру sp_CreateZayavka для поддержки tz
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_CreateZayavka')
BEGIN
    DROP PROCEDURE sp_CreateZayavka;
END
GO

CREATE PROCEDURE sp_CreateZayavka
    @polzovatel_id  INT,
    @uslugi_ids   NVARCHAR(MAX),
    @tz          NVARCHAR(MAX) = NULL,
    @nomer       NVARCHAR(50) OUTPUT,
    @zayavka_id  INT          OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SET @nomer = CONCAT(
        'ZAY-', YEAR(GETDATE()), '-',
        RIGHT('0000' + CAST(ABS(CHECKSUM(NEWID())) % 10000 AS NVARCHAR), 4)
    );

    INSERT INTO Zayavka (nomer, status, data_podachi, polzovatel_id, tz)
    VALUES (@nomer, N'Новая', GETDATE(), @polzovatel_id, @tz);

    SET @zayavka_id = SCOPE_IDENTITY();

    INSERT INTO Zayavka_Uslugi (zayavka_id, uslugi_id)
    SELECT @zayavka_id, value
    FROM OPENJSON(@uslugi_ids);
END;
GO

PRINT 'Миграция выполнена успешно';
GO