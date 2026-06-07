# Deployment (Docker)

The app builds to a self-contained Next.js **standalone** output and runs as a
non-root user on a minimal `node:22-alpine` image.

## 1. Configure environment

Copy the example and fill in real values:

```bash
cp .env.example .env
```

| Variable | When it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **build** + runtime | baked into the browser bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **build** + runtime | baked into the browser bundle |
| `NEXT_PUBLIC_APP_URL` | **build** + runtime | your public URL in production |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime only | secret — never exposed to browser |
| `MIDTRANS_SERVER_KEY` | runtime only | QRIS gateway server key |
| `MIDTRANS_IS_PRODUCTION` | runtime only | `false` for sandbox, `true` for live |

> `NEXT_PUBLIC_*` values are inlined at **build time**. If you change them you must
> rebuild the image — restarting the container is not enough.

## 2. Build & run with Docker Compose (recommended)

```bash
docker compose up -d --build
```

App is served on `http://localhost:3000`. Health check: `GET /api/health`.

## 3. Or build & run with plain Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key" \
  --build-arg NEXT_PUBLIC_APP_URL="https://your-domain.com" \
  -t warkop-app .

docker run -d -p 3000:3000 \
  -e SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  -e MIDTRANS_SERVER_KEY="your-midtrans-key" \
  -e MIDTRANS_IS_PRODUCTION="false" \
  -e NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key" \
  -e NEXT_PUBLIC_APP_URL="https://your-domain.com" \
  --name warkop-app warkop-app
```

## 4. Database migrations

Run these once in the Supabase SQL editor before going live:

- `scripts/migrate-payment-flow.sql` — payment_status column + status constraints
- `ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;`

## 5. Midtrans webhook

In the Midtrans dashboard set the **Payment Notification URL** to:

```
https://your-domain.com/api/payments/midtrans/webhook
```

## Notes

- Next.js 16 prints a deprecation warning suggesting `middleware.ts` be renamed to
  `proxy.ts`. The build and runtime work fine as-is; rename later when convenient.
