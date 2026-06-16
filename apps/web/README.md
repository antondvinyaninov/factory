# Factory 1.0 Web

Next.js-приложение корпоративного портала.

## Разработка

```bash
pnpm --filter web dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Типографика

Для всех новых страниц и компонентов используйте общий слой:

```tsx
import {
  TypographyH1,
  TypographyH2,
  TypographyMuted,
  TypographyProse,
  typographyStyles,
} from "@/components/ui/typography"
```

- Заголовки страниц: `TypographyH1`, `TypographyH2`, `TypographyH3`.
- Описания и вторичный текст: `TypographyMuted`.
- Длинный текст, статьи, новости, RAG-ответы: `TypographyProse`.
- Если компонент уже принимает `className`, используйте `typographyStyles`.
