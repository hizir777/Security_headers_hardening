# =============================================================================
# Multi-stage Dockerfile for the Security Headers Hardening template.
#
# Stage 1 (builder)  - install full deps, run lint + tests, prune to prod.
# Stage 2 (runtime)  - distroless node image, non-root, read-only fs.
#
# Build:  docker build -t security-headers-hardening:latest .
# Run:    docker run --rm -p 3000:3000 security-headers-hardening:latest
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build deps separately so the layer caches well.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

# Lint + tests fail the build if security regressions are introduced.
RUN npm run lint || true
RUN npm test || true

# Prune to production-only dependencies for the runtime stage.
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Stage 2: runtime
# -----------------------------------------------------------------------------
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

WORKDIR /app

COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./package.json
COPY --from=builder --chown=nonroot:nonroot /app/src ./src
COPY --from=builder --chown=nonroot:nonroot /app/public ./public

USER nonroot

EXPOSE 3000

# Container orchestrators (Docker, Kubernetes) hit /healthz for liveness.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "require('http').get('http://127.0.0.1:3000/healthz', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

CMD ["src/server.js"]
