# Деплой в EasyPanel

Factory 1.0 готовится как одно приложение в одном Docker-контейнере:

- наружу открывается только Next.js на `PORT=3000`;
- NestJS API запускается внутри контейнера на `API_PORT=3001`;
- frontend обращается к API через относительный путь `/api`;
- Next.js прокидывает `/api/*` во внутренний `http://127.0.0.1:3001`.

## Docker

В EasyPanel можно использовать сборку из GitHub по `Dockerfile` в корне проекта.

Открываемый порт:

```env
PORT=3000
```

## Переменные окружения

Минимальный набор для production:

```env
DATABASE_URL=postgresql://factory:password@host:5432/factory?sslmode=disable
JWT_SECRET=change-this-long-random-secret
WEB_ORIGIN=https://your-domain.example
COOKIE_SECURE=true
```

Для первого запуска можно временно включить:

```env
RUN_DB_PUSH=true
SEED_ADMIN=true
```

После создания таблиц и администратора лучше выключить:

```env
RUN_DB_PUSH=false
SEED_ADMIN=false
```

## Администратор по умолчанию

Если включён `SEED_ADMIN=true`, создаётся пользователь:

```text
Логин: admin@admin.ru
Пароль: admin
```

После первого входа пароль нужно заменить, когда появится экран управления пользователями.

## Важные замечания

- Не задавайте `NEXT_PUBLIC_API_URL` для production, если API живёт в том же контейнере.
- Для HTTPS-домена оставляйте `COOKIE_SECURE=true`.
- Если временно запускаете портал без HTTPS, поставьте `COOKIE_SECURE=false`, иначе браузер не сохранит cookie входа.
- В GitHub не нужно отправлять `.env`, `.env.local`, `node_modules`, `.next` и `dist`.
