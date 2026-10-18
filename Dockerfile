# One image: the Vue client (static files) served by the Hono server, which also
# carries the API and the WebSockets. Migrations are inside the image and run
# at boot (infra rule BR-DEPLOY-004).
FROM node:22-alpine AS builder
WORKDIR /build

COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
ENV NPM_CONFIG_LOGLEVEL=warn
RUN npm ci

COPY shared shared
COPY server server
COPY web web
RUN npm run build -w web && npm run build -w server

FROM node:22-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.source=https://github.com/voikyrioh/bingo-multiplayer-app
LABEL org.opencontainers.image.description="Bingo Live: multiplayer bingo (Hono + WebSocket + Vue)"
LABEL org.opencontainers.image.licenses=UNLICENSED

# The infra app sheet (apps/bingo.yml) sets PUBLIC_ORIGIN; DATABASE_URL comes from Vault.
ENV NODE_ENV=production \
	HOSTNAME=0.0.0.0 \
	PORT=3000 \
	STORAGE=postgres \
	STATIC_DIR=/app/public \
	MIGRATIONS_DIR=/app/migrations

# Production dependencies of the server workspace only (the bundle keeps them external).
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --omit=dev --workspace server --include-workspace-root=false \
	&& npm cache clean --force \
	&& rm -rf web shared

COPY --from=builder /build/server/dist ./dist
COPY --from=builder /build/web/dist ./public
COPY server/migrations ./migrations

EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "dist/index.js"]
