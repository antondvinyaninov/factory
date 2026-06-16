FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED="1"

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS builder

COPY . .

RUN pnpm --filter web build
RUN mkdir -p apps/web/.next/standalone/apps/web/.next \
  && cp -r apps/web/public apps/web/.next/standalone/apps/web/public \
  && cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
RUN pnpm --filter api build

FROM base AS runner

ENV NODE_ENV="production"
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"
ENV API_PORT="3001"
ENV INTERNAL_API_URL="http://127.0.0.1:3001"
ENV COOKIE_SECURE="true"
ENV UPLOADS_DIR="/data/uploads"

COPY --from=builder /app /app

RUN mkdir -p /data/uploads

VOLUME ["/data/uploads"]

EXPOSE 3000

CMD ["node", "scripts/start-production.mjs"]
