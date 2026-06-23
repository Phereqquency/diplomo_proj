-- Обновить пароль админа на admin123
UPDATE Admin 
SET password_hash = '$2a$10$8s8ncdZO5hxmwyGoEsxR5OLI90ykEP0NxKh.8KL41ljbUtTExOjIO'
WHERE email = 'admin@example.com';

-- Проверить
SELECT id, imya, email, role, 
       LEFT(password_hash, 30) + '...' as hash_preview 
FROM Admin 
WHERE email = 'admin@example.com';
