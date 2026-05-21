# Stage 1 — installer les dépendances
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN HUSKY=0 npm ci --omit=dev

# Stage 2 — builder
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN HUSKY=0 npm ci
COPY . .
RUN npm run build

# Stage 3 — runner
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 cellar \
  && adduser --system --uid 1001 cellar

COPY --from=builder --chown=cellar:cellar /app/.next/standalone ./
COPY --from=builder --chown=cellar:cellar /app/.next/static ./.next/static
COPY --from=builder --chown=cellar:cellar /app/public ./public

USER cellar

VOLUME ["/data", "/labels"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
