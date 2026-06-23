-- Обновить пароль админа
UPDATE Admin 
SET password_hash = '$2a$10$9W0M0EjVgbvp1xHXC3s6reqQQI17WWz4nni2JNDlsvusNtZKRRVs.'
WHERE email = 'admin@example.com';

-- Проверить
SELECT email, role, 
       LEFT(password_hash, 50) AS hash_prefix,
       DATALENGTH(password_hash) AS hash_len
FROM Admin 
WHERE email = 'admin@example.com';
