# Обзор архитектуры

## Решение

Для портала выбран стек:

- Frontend: Next.js, TypeScript, shadcn/ui, Tailwind CSS;
- API: NestJS, TypeScript;
- Database: PostgreSQL;
- Cache/Queues: Redis;
- Files: MinIO или совместимое S3-хранилище внутри периметра;
- RAG: отдельный слой вокруг Qdrant, локальных embeddings и локальной LLM;
- Automation: n8n как соседний сервис для workflow;
- Documents: интеграция с Collabora Online или ONLYOFFICE Docs.

## Почему NestJS

NestJS хорошо подходит для корпоративного портала, потому что даёт модульную структуру, dependency injection, guards, pipes, filters, OpenAPI и понятное разделение ответственности.

## Почему модульный монолит

Микросервисы на старте добавят сложность: сеть, авторизация между сервисами, мониторинг, деплой, трассировка. Для MVP безопаснее начать с модульного монолита и вынести отдельные части позже.

## Потенциальные отдельные сервисы позже

- RAG service;
- Document collaboration service;
- Notification worker;
- Import/export service;
- Integration gateway.
