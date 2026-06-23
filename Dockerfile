# Базовый образ с SQL Server Express
FROM mcr.microsoft.com/mssql/server:2022-latest

# Переменные для SQL Server (обязательны!)
ENV ACCEPT_EULA=Y
ENV MSSQL_SA_PASSWORD=YourStrong!Passw0rd
ENV MSSQL_PID=Express

# Переключаемся на root, чтобы иметь права на запуск SQL Server
USER root

# Устанавливаем рабочую папку
WORKDIR /app

# Копируем ваш скомпилированный бинарник
COPY app /app/app

# Даём права на выполнение
RUN chmod +x /app/app

# Создаём скрипт запуска
RUN echo '#!/bin/bash\n\
/opt/mssql/bin/sqlservr & \n\
sleep 30 \n\
/app/app' > /app/start.sh && chmod +x /app/start.sh

# Открываем порты
EXPOSE 1433
EXPOSE 10000

# Запускаем скрипт от имени root
CMD ["/app/start.sh"]