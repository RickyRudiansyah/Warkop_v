# syntax=docker/dockerfile:1

# ---------- Stage 1: install dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /app
# libc6-compat is needed by some native deps on Alpine
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: build the app ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at build time,
# so they MUST be present here (not just at runtime). Pass them via --build-arg.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_LOCATION_CHECK
ARG NEXT_PUBLIC_CAFE_LAT
ARG NEXT_PUBLIC_CAFE_LNG
ARG NEXT_PUBLIC_CAFE_RADIUS_METERS
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_LOCATION_CHECK=$NEXT_PUBLIC_LOCATION_CHECK
ENV NEXT_PUBLIC_CAFE_LAT=$NEXT_PUBLIC_CAFE_LAT
ENV NEXT_PUBLIC_CAFE_LNG=$NEXT_PUBLIC_CAFE_LNG
ENV NEXT_PUBLIC_CAFE_RADIUS_METERS=$NEXT_PUBLIC_CAFE_RADIUS_METERS
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- Stage 3: minimal production runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone output bundles only the files needed to run the server.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
