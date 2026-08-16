# Build stage
FROM node:20.17.0 AS builder

# better-sqlite3 must compile from source, so we need build tools and curl for the sqlite3 download
RUN apt-get update && \
    apt-get install -y python3 make g++ bash curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Force better-sqlite3 to compile for this exact Node version
RUN (cd /app/node_modules/better-sqlite3 && npm run download && npm run build-release)

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PHASE=phase-production-build
RUN npm run build

# Runtime stage
FROM node:20.17.0-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN mkdir -p /app/data /app/uploads

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "server.js"]
