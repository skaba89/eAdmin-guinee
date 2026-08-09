# =============================================================================
# Dockerfile multi-stage - eAdministration Suite Guinea
# Frontend Next.js 16 — Production-ready, no Prisma
# =============================================================================

# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lock ./
# Keep the container toolchain identical to CI for reproducible frozen installs.
RUN npm install -g bun@1.3.4 && bun install --frozen-lockfile

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Render exposes service environment variables to Docker builds as build args.
# NEXT_PUBLIC_* values must therefore be explicitly declared here so Next.js can
# bake the public API origin into the browser bundle during `next build`.
ARG NEXT_PUBLIC_API_URL=""
ARG RENDER=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# A Render deployment without a public API URL must fail at build time instead
# of silently shipping a browser bundle that calls localhost. The API is a
# public browser endpoint, so HTTPS is mandatory on Render.
RUN if [ "$RENDER" = "true" ]; then \
      if [ -z "$NEXT_PUBLIC_API_URL" ]; then \
        echo "ERROR: NEXT_PUBLIC_API_URL is required for Render frontend builds." >&2; \
        exit 1; \
      fi; \
      case "$NEXT_PUBLIC_API_URL" in \
        https://*) ;; \
        *) echo "ERROR: NEXT_PUBLIC_API_URL must use https:// on Render." >&2; exit 1 ;; \
      esac; \
    fi && npm run build

# ---- Stage 3: Production ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
