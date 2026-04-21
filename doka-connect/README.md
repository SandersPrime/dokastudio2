# Doka Connect

**Doka Connect** — это отдельное Windows-приложение для подключения оборудования RF317 и RF215 к экосистеме DokaStudio. Оно запускается локально, и bridge использует его REST/WS интерфейс для обмена событиями.

## Запуск

1. Установите DLL/SDK для оборудования и укажите путь в переменной окружения `VENDOR_DLL_PATH`.
2. Соберите решение `DokaConnect.sln` и запустите `DokaConnect.exe`.
3. Приложение поднимет REST/WS сервер на порту `17610`.

## Порты

- REST: `http://127.0.0.1:17610`
- WebSocket: `ws://127.0.0.1:17610/ws`

## Порядок запуска

1. Doka Connect
2. Bridge
3. DokaStudio

## Переменные окружения

- `VENDOR_DLL_PATH` — путь к DLL SDK (RF317).
- `VENDOR_HELPER_PORT` — порт сервера (по умолчанию `17610`).
- `VENDOR_HELPER_WS_PATH` — WS путь (по умолчанию `/ws`).
