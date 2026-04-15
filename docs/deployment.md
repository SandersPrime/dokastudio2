# Деплой и развёртывание

## Подготовка к деплою

Перед развёртыванием убедитесь, что:

1. Установлен Node.js (v18+)
2. Установлен npm
3. Настроена база данных (PostgreSQL)
4. Подготовлен файл `.env` с production-настройками
5. Установлены все зависимости

```bash
npm install
```

## Локальное развёртывание

Для локального запуска в production-режиме:

```bash
# Установите окружение
export NODE_ENV=production

# Примените миграции
npm run prisma:migrate

# Запустите сервер
npm start
```

Сервер будет доступен на `http://localhost:3000`.

## Production деплой

### Требования
- Сервер с Ubuntu 20.04/22.04
- Node.js v18+
- PostgreSQL 14+
- Nginx (рекомендуется для проксирования)
- PM2 (рекомендуется для управления процессами)

### Пошаговая инструкция

1. **Настройте сервер**
```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установите PostgreSQL
sudo apt install postgresql postgresql-contrib -y
```

2. **Настройте базу данных**
```bash
# Переключитесь на пользователя postgres
sudo -u postgres psql

# Создайте базу данных
CREATE DATABASE dokastudio;

# Создайте пользователя
CREATE USER dokastudio_user WITH PASSWORD 'strong_password';

# Назначьте права
GRANT ALL PRIVILEGES ON DATABASE dokastudio TO dokastudio_user;

# Выйдите
\q
```

3. **Склонируйте репозиторий**
```bash
git clone https://github.com/your-repo/dokastudio.git
cd dokastudio
```

4. **Установите зависимости**
```bash
npm install
```

5. **Настройте окружение**
```bash
# Создайте .env файл
cp .env.example .env

# Отредактируйте .env
nano .env
```

Обновите значения:
```env
NODE_ENV=production
DATABASE_URL=postgresql://dokastudio_user:strong_password@localhost:5432/dokastudio?schema=public
JWT_SECRET=your_strong_jwt_secret_here
CLIENT_URL=https://your-domain.com
```

6. **Примените миграции**
```bash
npm run prisma:migrate
```

7. **Запустите seed-скрипт**
```bash
npm run seed
```

8. **Настройте PM2 (опционально)**
```bash
# Установите PM2
npm install -g pm2

# Запустите приложение
pm2 start app.js --name="dokastudio"

# Настройте автозагрузку
pm2 startup
pm2 save
```

9. **Настройте Nginx (рекомендуется)**
```bash
# Установите Nginx
sudo apt install nginx -y

# Создайте конфиг
sudo nano /etc/nginx/sites-available/dokastudio
```

Содержимое конфига:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активируйте конфиг:
```bash
sudo ln -s /etc/nginx/sites-available/dokastudio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

10. **Настройте HTTPS с Let's Encrypt (рекомендуется)**
```bash
# Установите Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получите SSL-сертификат
sudo certbot --nginx -d your-domain.com
```

## Docker (опционально)

Если вы хотите использовать Docker, создайте `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run prisma:generate

EXPOSE 3000

CMD ["npm", "start"]
```

И `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/dokastudio?schema=public
      - JWT_SECRET=your_strong_jwt_secret
      - CLIENT_URL=http://localhost:3000
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=dokastudio
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Запустите:
```bash
docker-compose up -d
```

## Мониторинг и логи

### Логи
Логи приложения выводятся в консоль. При использовании PM2:

```bash
# Просмотр логов
pm2 logs dokastudio

# Мониторинг
pm2 monit
```

### Health-check
Используйте эндпоинт `/health` для проверки состояния сервиса.

## Rollback

Если возникла ошибка после деплоя:

1. Остановите текущее приложение
2. Откатите код до предыдущей стабильной версии
3. Перезапустите приложение

При использовании PM2:
```bash
pm2 rollback dokastudio
```

## Best Practices

- Регулярно делайте бэкапы базы данных
- Используйте HTTPS
- Настройте мониторинг (UptimeRobot, Prometheus)
- Регулярно обновляйте зависимости
- Используйте CI/CD для автоматизации деплоя
- Тестируйте деплой на staging-окружении перед production