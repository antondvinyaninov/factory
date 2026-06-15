FROM node:24-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS builder

COPY . .

RUN pnpm --filter web build
RUN pnpm --filter api build

FROM base AS runner

ENV NODE_ENV="production"
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"
ENV API_PORT="3001"
ENV INTERNAL_API_URL="http://127.0.0.1:3001"
ENV COOKIE_SECURE="true"

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app /app

EXPOSE 3000

CMD ["node", "scripts/start-production.mjs"]
