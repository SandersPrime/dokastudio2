# Архитектура проекта

## Общая структура

DokaStudio — это full-stack веб-приложение на Node.js, реализующее интерактивную платформу для проведения и создания викторин.

### Backend
Расположен в папке `src/`.

- **app.js** — главная точка входа, инициализация сервера, middlewares, статики
- **src/config** — конфигурация: env, prisma, socket
- **src/controllers** — обработчики HTTP-запросов
- **src/middlewares** — кастомные express middleware
- **src/routes** — маршруты API и их регистрация
- **src/services** — бизнес-логика приложения
- **src/sockets** — обработка WebSocket-событий
- **src/utils** — вспомогательные функции
- **prisma/** — схема и миграции базы данных

### Frontend
Расположен в папке `public/`.

- **public/index.html** — главная страница
- **public/constructor.html** — редактор квизов
- **public/host.html** — интерфейс ведущего
- **public/play.html** — интерфейс игрока
- **public/homework.html** — просмотр домашних заданий
- **public/do-homework.html** — прохождение задания
- **public/js/** — клиентский JavaScript
  - **api.js** — HTTP-клиент
  - **auth.js** — аутентификация
  - **quiz-constructor.js** — оркестратор редактора
  - **constructor-ui.js** — рендеринг UI
  - **state/** — управление состоянием
  - **services/** — сервисные утилиты
  - **components/** — переиспользуемые компоненты
- **public/css/** — стили
- **public/uploads/** — загруженные пользователем файлы

## Реалтайм-архитектура (Socket.IO)

- Сокеты инициализируются в `src/config/socket.js`
- Центральный слой регистрации: `src/sockets/session.socket.js`
- Хост-события вынесены в `src/sockets/host.socket.js`
- Игрок-события вынесены в `src/sockets/player.socket.js`
- Защитные функции (guards) вынесены в `src/sockets/socket-guards.js`
- Состояние сокетов хранится в `public/js/state/live-host.state.js` и `public/js/state/live-player.state.js`

## Управление состоянием

- **quiz-constructor.js** — основной оркестратор логики конструктора
- **constructor.state.js** — управление состоянием редактора
- **quiz-editor.state.js** — устаревшее состояние, сохранено для совместимости
- **auth.state.js** — состояние авторизации

Состояние не дублируется; `quiz-constructor.js` синхронизирует legacy-состояние при необходимости.