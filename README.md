# DokaStudio Platform

DokaStudio — платформа для создания и проведения интерактивных викторин, вебинаров и домашних заданий.

## Технический стек
- **Backend**: Node.js, Express, Prisma, PostgreSQL/SQLite
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Realtime**: Socket.IO
- **База данных**: PostgreSQL (production), SQLite (development)

## Установка и запуск

### 1. Установите зависимости
```bash
npm install
```

### 2. Настройте окружение
Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

Отредактируйте `.env`, указав актуальные значения.

### 3. Примените миграции Prisma
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Запустите проект

**Разработка:**
```bash
npm run dev
```

**Продакшн:**
```bash
npm start
```

### 5. Наполните базу демонстрационными данными
```bash
npm run seed
```

Сервер запустится на `http://localhost:3000`.

## Структура проекта
См. `docs/architecture.md`.

## Модули
См. `docs/modules.md`.

## Деплой
См. `docs/deployment.md`.