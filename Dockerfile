FROM node:22-alpine AS base
# Next compila binarios que esperan glibc; en Alpine hace falta el shim.
RUN apk add --no-cache libc6-compat
WORKDIR /app


# ── Dependencias ──────────────────────────────────────────────────────────
FROM base AS deps

COPY package.json package-lock.json* ./

# npm ci exige lockfile y es el camino reproducible. Si todavía no has
# commiteado package-lock.json, cae a npm install para no romper el build.
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      echo "AVISO: sin package-lock.json, el build no es reproducible" && npm install; \
    fi


# ── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# next/font descarga y autoaloja las tipografías en este paso: esta etapa
# necesita salida a internet. Si construyes en una red cerrada, hay que
# permitir fonts.googleapis.com y fonts.gstatic.com.
RUN npm run build


# ── Runtime ───────────────────────────────────────────────────────────────
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario sin privilegios: nada acá necesita root.
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# standalone ya trae su propio server.js y solo las dependencias en uso.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Los assets estáticos quedan fuera del bundle standalone: van aparte.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# PORT lo respeta server.js. Cloud Run lo inyecta él mismo, así que este
# valor solo aplica cuando nadie lo define.
ENV PORT=3000
# Sin esto escucha en localhost y el contenedor queda inalcanzable desde fuera.
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# Liveness del proceso, no del backend: ver app/api/health/route.ts
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "server.js"]