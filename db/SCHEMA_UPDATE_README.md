# Обновление схемы базы данных SARP

## Дата обновления: 2026-04-29

## Описание изменений

### 1. Таблица Admin (Администраторы / Менеджеры)
**Изменения:**
- Убрано поле `individualny_token` (перенесено в отдельную таблицу для безопасности)
- Добавлено поле `rolya` - роль пользователя (admin, user, manager)
- Добавлено поле `last_login` - дата последнего входа
- Добавлено поле `is_active` - статус активности
- Добавлены `created_at` и `updated_at` для аудита

**Индексы:**
- `idx_admin_email` - уникальный индекс на email
- `idx_admin_rolya` - индекс на роль для фильтрации

### 2. Таблица AdminTokens (JWT токены)
**Новая таблица для безопасности:**
- `admin_id` - ссылка на администратора
- `token_hash` - хэш токена (для проверки без хранения открытого текста)
- `token_text` - сам токен (опционально, можно не хранить)
- `ip_address` - IP адрес входа
- `user_agent` - браузер/клиент
- `expires_at` - дата истечения токена
- `is_revoked` - флаг отзыва токена
- `revoked_at` - дата отзыва

**Индексы:**
- `idx_admin_tokens_admin` - поиск токенов пользователя
- `idx_admin_tokens_expires` - очистка просроченных
- `idx_admin_tokens_revoked` - фильтр активных токенов
- `idx_admin_tokens_hash` - проверка токена по хэшу

### 3. Таблица Polzovatel (Клиенты / Пользователи)
**Изменения:**
- Добавлены `created_at` и `updated_at`

**Индексы:**
- `idx_polzovatel_email` - уникальный индекс на email
- `idx_polzovatel_imya` - индекс на имя для поиска

### 4. Таблица Uslugi (Услуги)
**Изменения:**
- Добавлены поля для расширенного описания услуг:
  - `min_summa` - минимальная сумма
  - `max_summa` - максимальная сумма
  - `srok_vipolneniya` - срок выполнения в часах
- Добавлены `created_at` и `updated_at`
- Добавлено поле `is_active` - статус активности услуги

**Индексы:**
- `idx_uslugi_kategoriya` - фильтр по категории
- `idx_uslugi_active` - только активные услуги
- `idx_uslugi_cena` - сортировка и фильтр по цене
- `idx_uslugi_naimenovanie` - поиск по названию

### 5. Таблица Kategoriya (Категории)
**Изменения:**
- Добавлено поле `description` - описание категории
- Добавлены `created_at` и `updated_at`
- Добавлено поле `is_active` - статус активности

**Индексы:**
- `idx_kategoriya_active` - фильтр активных категорий

### 6. Таблица Zayavka (Заявки)
**Изменения:**
- Добавлены `created_at` и `updated_at` для аудита

**Индексы (добавлены для производительности):**
- `idx_zayavka_nomer` - уникальный индекс на номер
- `idx_zayavka_status` - фильтр по статусу
- `idx_zayavka_polzovatel` - фильтр по клиенту
- `idx_zayavka_admin` - фильтр по менеджеру
- `idx_zayavka_data` - сортировка по дате
- `idx_zayavka_cena` - фильтр по цене

### 7. Таблица Zayavka_Uslugi (Связи заявок и услуг)
**Изменения:**
- Добавлено поле `kolichestvo` - количество (по умолчанию 1)
- Добавлено поле `cena_za_ed` - цена за единицу на момент заказа
- Добавлено поле `created_at`

**Индексы:**
- `idx_zu_zayavka` - поиск услуг по заявке
- `idx_zu_uslugi` - поиск заявок по услуге

### 8. Таблица Zayavka_Status_History (Аудит изменений статусов)
**Новая таблица для отслеживания истории:**
- `zayavka_id` - заявка
- `old_status` - предыдущий статус
- `new_status` - новый статус
- `admin_id` - кто изменил
- `comment` - комментарий
- `created_at` - когда изменено

**Индексы:**
- `idx_status_history_zayavka` - история по заявке
- `idx_status_history_admin` - изменения по менеджеру

## Хранимые процедуры

### 1. sp_CreateZayavka
Создает новую заявку с автоматической генерацией номера.

**Параметры:**
- `@polzovatel_id` - ID клиента
- `@uslugi_ids` - JSON массив ID услуг
- `@tz` - техническое задание
- `@nomer` - OUTPUT: сгенерированный номер
- `@zayavka_id` - OUTPUT: ID созданной заявки

**Формат номера:** `ZAY-2026-0001` (год-порядковый номер)

### 2. sp_UpdateZayavkaStatus
Обновляет статус заявки с сохранением истории.

**Параметры:**
- `@zayavka_id` - ID заявки
- `@status` - новый статус
- `@admin_id` - ID менеджера, сделавшего изменение

**Дополнительно:**
- Автоматически устанавливает `data_resheniya` при статусах "Завершена" или "Отклонена"
- Сохраняет запись в таблицу истории

### 3. sp_UpdateZayavkaTsena
Обновляет цену заявки.

**Параметры:**
- `@zayavka_id` - ID заявки
- `@tsena` - новая цена

## Триггеры

Автоматическое обновление поля `updated_at` при изменении записей в таблицах:
- Polzovatel
- Admin
- Uslugi
- Kategoriya
- Zayavka

## Представления

### v_Zayavka_Details
Объединенная таблица для быстрого получения заявок со всеми деталями.

**Поля:**
- Данные заявки (номер, статус, даты)
- Данные клиента (имя, email, мессенджер)
- Данные менеджера (имя)
- Список услуг (через запятую)
- Количество услуг
- Сумма по услугам

## Рекомендации по миграции

1. **Создание резервной копии:**
   ```sql
   BACKUP DATABASE SARP TO DISK = 'SARP_backup.bak'
   ```

2. **Сохранение данных из individualny_token:**
   ```sql
   -- Перенос данных из old_admin в Admin
   INSERT INTO Admin (id, imya, email, password_hash, rolya, last_login)
   SELECT id, imya, email, password_hash, 
          CASE WHEN individualny_token != '' THEN 'user' ELSE 'admin' END,
          NULL
   FROM old_admin
   WHERE id NOT IN (SELECT id FROM Admin)
   ```

3. **Перенос токенов:**
   ```sql
   INSERT INTO AdminTokens (admin_id, token_text, expires_at)
   SELECT admin_id, token, DATEADD(day, 30, GETDATE())
   FROM old_admin_tokens
   WHERE token IS NOT NULL
   ```

4. **Обновление колонок с ценой:**
   ```sql
   ALTER TABLE Uslugi ADD tsen MONEY NOT NULL DEFAULT 0
   UPDATE Uslugi SET tsen = old_price_column
   ALTER TABLE Uslugi DROP COLUMN old_price_column
   ```

## Проверка установки

```sql
-- Проверка таблиц
SELECT name FROM sys.tables WHERE name IN (
    'Admin', 'AdminTokens', 'Polzovatel', 'Kategoriya',
    'Uslugi', 'Zayavka', 'Zayavka_Uslugi', 'Zayavka_Status_History'
)

-- Проверка процедур
SELECT name FROM sys.procedures WHERE name IN (
    'sp_CreateZayavka', 'sp_UpdateZayavkaStatus', 'sp_UpdateZayavkaTsena'
)

-- Проверка представлений
SELECT name FROM sys.views WHERE name = 'v_Zayavka_Details'
```

## Примеры запросов

### Получение всех заявок клиента
```sql
SELECT * FROM Zayavka WHERE polzovatel_id = @client_id
```

### Получение активных токенов
```sql
SELECT * FROM AdminTokens 
WHERE is_revoked = 0 AND expires_at > GETDATE()
```

### Статистика по статусам
```sql
SELECT status, COUNT(*) as count 
FROM Zayavka 
GROUP BY status
```

### История изменений заявки
```sql
SELECT zsh.*, a.imya as admin_name
FROM Zayavka_Status_History zsh
JOIN Admin a ON zsh.admin_id = a.id
WHERE zayavka_id = @zayavka_id
ORDER BY created_at DESC
```

## Безопасность

1. **Хранение паролей:** Используется bcrypt хэширование
2. **Токены:** Хранятся в хэшированном виде, возможна привязка к IP
3. **Отзыв сессий:** Возможность принудительного завершения всех сессий
4. **История:** Полная история изменений статусов заявок
5. **Аудит:** Отслеживание всех действий менеджеров

## Производительность

- Все внешние ключи проиндексированы
- Индексы на часто используемых полях (email, status, даты)
- Представление для сложных объединяющих запросов
- Ограничения на удаление (RESTRICT, CASCADE, SET NULL)
