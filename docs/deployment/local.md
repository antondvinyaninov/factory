# Локальный запуск

Проект уже содержит два приложения:

- `apps/web` — интерфейс Factory 1.0 на Next.js;
- `apps/api` — API-слой на NestJS.

## Запуск

Из корня проекта:

```bash
npm run dev:web
PORT=3001 npm run dev:api
```

## База данных

API подключается к PostgreSQL через Prisma. Локальный файл с секретами:

```text
apps/api/.env
```

Пример без секретов лежит здесь:

```text
apps/api/.env.example
```

Проверка подключения:

```bash
curl http://localhost:3001/health/db
```

Ожидаемый ответ:

```json
{
  "status": "ok",
  "provider": "postgresql",
  "latencyMs": 200
}
```

## Авторизация

Базовая авторизация работает через `apps/api`:

- `POST /auth/login` — вход;
- `GET /auth/me` — текущий пользователь;
- `POST /auth/logout` — выход.

После успешного входа API выставляет HTTP-only cookie `factory_session`.
Next.js защищает страницы через `src/proxy.ts`: без cookie пользователь попадает на `/login`.

Тестовый супер-администратор для локальной разработки:

```text
Логин: admin@admin.ru
Пароль: admin
```

Повторно создать или обновить администратора:

```bash
npm run db:seed:admin -w apps/api
```

Планируемые локальные сервисы:

- PostgreSQL;
- Redis;
- MinIO;
- Qdrant;
- локальная LLM;
- n8n;
- Collabora Online или ONLYOFFICE Docs.

Docker Compose можно добавить позже, когда будем готовы поднимать инфраструктуру одной командой.
