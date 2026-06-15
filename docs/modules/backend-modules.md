# API-модули NestJS

Каждый крупный раздел портала должен быть отдельным NestJS-модулем.

## Структура модуля

```text
module-name/
  module-name.module.ts
  module-name.controller.ts
  module-name.service.ts
  dto/
  entities/
```

## Правила

- Модуль не должен напрямую лезть в таблицы другого модуля без явного сервиса или контракта.
- DTO лежат рядом с модулем.
- Общие типы выносятся в `packages/shared`.
- Бизнес-логика живёт в service/use-case слое, не в controller.
- Интеграции с внешними системами изолируются в отдельных providers.
