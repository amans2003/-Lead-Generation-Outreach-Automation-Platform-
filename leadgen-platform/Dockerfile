# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-slim AS client-builder

WORKDIR /client

COPY client/package.json client/package-lock.json* ./
RUN npm ci

COPY client/ .

# No VITE_API_URL needed — in production the server serves both API + static
# files on the same origin, so the default '/api/v1' baseURL works.
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-slim

# Install Chromium for Puppeteer (scraper) and WhatsApp web.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-noto \
    fonts-noto-color-emoji \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

COPY server/ .

# Copy built React app → served as static files by Express in production
COPY --from=client-builder /client/dist ./public

EXPOSE 5000

CMD ["node", "src/app.js"]
