# Stage 1: Builder – installiert Dependencies
FROM node:18-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Runtime – nur das Nötigste
FROM node:18-alpine
WORKDIR /app

# Non-root User für Sicherheit
RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser

# Dependencies von Builder kopieren
COPY --from=builder --chown=appuser:appgroup /build/node_modules ./node_modules

# App-Code kopieren
COPY --chown=appuser:appgroup . .

USER appuser
EXPOSE 3000

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { if (res.statusCode !== 200) process.exit(1); })" || exit 1

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "src/index.js"]
