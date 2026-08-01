# Rumipang Ordering System v3.0

> Sistem pemesanan digital berbasis QR Code untuk warung/kafe — customer scan, pilih menu, bayar (Cash atau QRIS otomatis), tanpa antri ke kasir.

![Tech Stack](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase)
![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-06B6D4?style=flat-square&logo=tailwindcss)
![Payment](https://img.shields.io/badge/Payment-Mayar%20QRIS-6B3FA0?style=flat-square)
![Deploy](https://img.shields.io/badge/Deploy-Docker-2496ED?style=flat-square&logo=docker)

---

## Table of Contents

- [Overview](#overview)
- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Struktur Project](#struktur-project)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Alur Pemesanan](#alur-pemesanan)
- [Alur Status Order](#alur-status-order)
- [Alur Pembayaran QRIS (Mayar)](#alur-pembayaran-qris-mayar)
- [Fitur Lokasi (Geolocation Gate)](#fitur-lokasi-geolocation-gate)
- [Environment Variables](#environment-variables)
- [Cara Menjalankan Lokal](#cara-menjalankan-lokal)
- [Setup Supabase](#setup-supabase)
- [Deployment (Docker)](#deployment-docker)
- [Login Staff](#login-staff)
- [Riwayat Versi](#riwayat-versi)
- [Changelog v3.0](#changelog-v30)
- [Developer](#developer)

---

## Overview

Rumipang Ordering adalah sistem pemesanan digital berbasis QR Code untuk warung/kafe skala kecil–menengah. Customer scan **satu QR umum**, pilih meja saat checkout, pilih menu, lalu bayar via **Cash** (bayar di kasir) atau **QRIS** (otomatis terdeteksi tanpa konfirmasi kasir). Staff (kasir, koki, owner) mengelola pesanan lewat dashboard masing-masing.

Dibangun **full Next.js 16** (App Router + API Routes sebagai backend) — 1 repo, 1 deploy. Database, Auth, Realtime, dan Storage memakai Supabase.

### Konsep Kunci v3.x

- **Satu QR umum** untuk seluruh kafe (bukan per-meja). Nomor meja dipilih customer saat checkout.
- **Pemisahan status dapur & status bayar.** `status` (dapur) = `QUEUED → PROCESSING → SERVED`; `payment_status` = `PAID | UNPAID`.
- **QRIS otomatis** lewat gateway **Mayar** — order baru masuk dapur setelah pembayaran benar-benar terkonfirmasi (verifikasi server-side).
- **Data-fetch via API Routes** (service role, bypass RLS) — browser tidak query Supabase langsung untuk data, hanya untuk trigger Realtime.
- **Dark mode**, **geolocation gate** (opsional), dan **Docker-ready**.

---

## Fitur Utama

### Customer

| Fitur | Deskripsi |
|---|---|
| Scan QR umum | Scan satu QR → buka halaman menu |
| Geolocation gate | (Opsional) Blokir pesanan jika customer jauh dari kafe |
| Browse & search menu | Filter kategori pills + cari nama menu |
| Detail menu | Pilih variasi (ukuran, level pedas, topping) + catatan per item |
| Keranjang | CartFAB floating + CartDrawer bottom sheet, persist di sessionStorage |
| Checkout | Pilih meja (dropdown) + metode bayar + persetujuan (tidak bisa dibatalkan) |
| Bayar Cash | Order langsung dibuat `UNPAID`, bayar di kasir |
| Bayar QRIS | Halaman QRIS Mayar → scan → **otomatis terdeteksi** → order masuk dapur |
| Lacak pesanan | Lacak seluruh order 1 meja secara realtime + ETA countdown |
| Dark mode | Toggle tema terang/gelap |

### Kasir

| Fitur | Deskripsi |
|---|---|
| Board per meja | Order aktif dikelompokkan per meja, tiap order tampil status bayar sendiri |
| Realtime updates | Update order via Supabase Realtime |
| Tandai Lunas | Ubah `UNPAID → PAID` untuk order Cash |
| Cancel order | Batalkan order yang masih `QUEUED` (belum diproses) |
| Selesai (arsip) | Pindahkan semua order 1 meja ke history (saat semua `SERVED` + `PAID`) |
| Manual order (POS) | Input order manual untuk pelanggan yang tidak scan |
| QR Generator | Generate + download satu QR umum kafe |
| Order history | Riwayat order (arsip + dibatalkan) |
| Activity logging | Aktivitas kasir tercatat di database |

### Koki (Kitchen Display)

| Fitur | Deskripsi |
|---|---|
| Kitchen display | Ticket pesanan realtime |
| Set ETA | Estimasi waktu (5–30 menit) saat mulai proses |
| Countdown + warna | Hijau > 3 mnt, kuning < 3 mnt, merah + pulse jika overdue |
| Update ETA | Perpanjang estimasi saat proses berjalan |
| Mulai Proses / Sudah Diantar | `QUEUED → PROCESSING → SERVED` |
| Badge pembayaran | Menampilkan Lunas / Belum Bayar |

### Owner

| Fitur | Deskripsi |
|---|---|
| Statistik | Pendapatan, total order, rata-rata per order, cancel rate |
| Top menu terlaris | Ranking menu dengan badge emas/perak/perunggu |
| Rekap penjualan | Filter Hari Ini / 7 Hari / Semua |
| Kelola menu | Tambah/edit/hapus menu, upload gambar, toggle sold out |
| Kelola variasi | CRUD variasi per menu (grup + label + extra price) |
| Order history | Lihat + hapus riwayat (satu / semua) |
| Reset data | Hapus semua order + activity log (menu/meja/staff aman) |

### Auth & Session

| Fitur | Deskripsi |
|---|---|
| Login terpusat | Semua staff login di `/login`, auto-redirect sesuai role |
| Proteksi server-side | `middleware.ts` + `getUser()` (validasi ke auth server) di setiap API |
| Role-based access | Cashier, Koki, Owner dengan akses berbeda |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@theme`, dark mode) |
| Database | Supabase (PostgreSQL + Storage) |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Realtime | Supabase Realtime |
| Payment (QRIS) | **Mayar** (aktif) · Midtrans (legacy, tidak dipakai) |
| Animation | Framer Motion |
| Icons | Lucide React |
| Toast | Sonner |
| QR Code | qrcode.react |
| Deployment | Docker (output `standalone`) |

---

## Struktur Project

```
warkop-app/
├── app/
│   ├── (customer)/                          # Route group customer (tanpa /customer di URL)
│   │   ├── layout.tsx                        # Suspense boundary
│   │   ├── loading.tsx                       # Loading UI
│   │   ├── order/page.tsx                    # Halaman menu + geolocation gate
│   │   ├── checkout/page.tsx                 # Checkout: meja, bayar, QRIS Mayar
│   │   ├── order-success/page.tsx            # Konfirmasi sukses
│   │   └── order-tracking/page.tsx           # Lacak pesanan per meja (realtime)
│   ├── (staff)/                             # Route group staff
│   │   ├── login/page.tsx                    # Staff login
│   │   └── dashboard/
│   │       ├── cashier/page.tsx              # Board kasir (grup per meja)
│   │       ├── cashier/new-order/page.tsx    # Manual order (POS)
│   │       ├── kitchen/page.tsx              # Kitchen display (ETA)
│   │       ├── owner/page.tsx                # Owner dashboard
│   │       ├── qr/page.tsx                   # QR umum + kelola meja
│   │       └── history/page.tsx              # Riwayat order
│   ├── api/
│   │   ├── health/route.ts                   # Health check
│   │   ├── activity-logs/route.ts            # GET/POST activity logs
│   │   ├── menu/route.ts                      # GET all, POST create
│   │   ├── menu/categories/route.ts          # GET categories
│   │   ├── menu/[id]/route.ts                # PUT, DELETE
│   │   ├── menu/[id]/sold-out/route.ts       # PATCH toggle sold out
│   │   ├── menu/variations/route.ts          # GET/POST variasi
│   │   ├── menu/variations/[id]/route.ts     # PUT/DELETE variasi
│   │   ├── orders/route.ts                   # GET (kitchen/cashier/history), POST create
│   │   ├── orders/history/route.ts           # GET + DELETE bulk history
│   │   ├── orders/reset/route.ts             # DELETE reset semua order (owner)
│   │   ├── orders/table-track/route.ts       # GET tracking semua order 1 meja (public)
│   │   ├── orders/[id]/route.ts              # GET detail, DELETE
│   │   ├── orders/[id]/status/route.ts       # PATCH QUEUED→PROCESSING→SERVED
│   │   ├── orders/[id]/mark-paid/route.ts    # PATCH UNPAID→PAID
│   │   ├── orders/[id]/archive/route.ts      # PATCH is_archived=true (Selesai)
│   │   ├── orders/[id]/cancel/route.ts       # PATCH cancel
│   │   ├── orders/[id]/track/route.ts        # GET tracking 1 order (public)
│   │   ├── orders/[id]/update-eta/route.ts   # PATCH update ETA
│   │   ├── payments/mayar/create/route.ts    # POST buat payment request QRIS
│   │   ├── payments/mayar/status/route.ts    # GET poll status (settle → buat order)
│   │   ├── payments/mayar/webhook/route.ts   # POST notifikasi Mayar (verify ulang)
│   │   ├── payments/midtrans/*               # (legacy) charge/status/webhook
│   │   ├── tables/route.ts                   # GET/POST/DELETE meja
│   │   ├── tables/[number]/route.ts          # GET meja by nomor
│   │   └── upload/route.ts                    # POST upload gambar ke Storage
│   ├── layout.tsx                            # Root layout + providers + Sonner
│   ├── page.tsx                              # Redirect ke /order
│   └── favicon.ico
├── components/
│   ├── auth/ProtectedRoute.tsx               # Client-side route guard
│   ├── cart/CartFAB.tsx · CartDrawer.tsx     # Floating cart + bottom sheet
│   ├── dashboard/
│   │   ├── DashboardLayout.tsx               # Shell dashboard staff
│   │   ├── OrderCard.tsx                     # Kartu order + ETA + badge bayar
│   │   └── VariationManager.tsx              # CRUD variasi menu
│   ├── menu/MenuItemCard.tsx · MenuItemSheet.tsx · CategoryPills.tsx
│   └── ui/Button · Badge · Spinner · Skeleton · EmptyState · ThemeToggle
├── context/
│   ├── AuthContext.tsx                       # Auth state (getUser)
│   ├── CartContext.tsx                       # Cart + sessionStorage
│   └── ThemeContext.tsx                      # Dark/light theme (localStorage)
├── hooks/
│   ├── useMenu.ts                            # Menu + variasi (via API route)
│   ├── useOrders.ts                          # Orders (via API) + Realtime trigger
│   ├── useCountdown.ts                       # Countdown timer
│   └── useLocationCheck.ts                   # Geolocation gate (haversine)
├── lib/
│   ├── supabase/client.ts · server.ts        # Browser & admin/server client
│   ├── mayar.ts                              # Provider Mayar (create + status)
│   ├── midtrans.ts                           # Provider Midtrans + settleIntent (shared)
│   └── utils.ts                              # formatCurrency, cn, dll
├── types/index.ts · database.ts             # TypeScript interfaces
├── scripts/
│   ├── complete-schema.sql                   # Full DDL + seed + auth
│   ├── migrate-payment-flow.sql              # Migrasi status/payment_status/method
│   ├── create-payment-intents.sql            # Tabel payment_intents (QRIS)
│   ├── full-reset-seed.sql · reset-and-seed.sql · seed-menu.sql
│   └── fix-*.sql · upload-images.mjs
├── middleware.ts                            # Auth guard server-side
├── next.config.ts                           # output: 'standalone'
├── Dockerfile · docker-compose.yml · .dockerignore
├── .env.example
├── AGENTS.md · CLAUDE.md                     # Catatan proyek
└── README.md
```

---

## Database Schema

```sql
tables ( id UUID PK, table_number INT UNIQUE, label TEXT, is_active BOOL, created_at )

categories ( id UUID PK, name TEXT, sort_order INT )

menu_items ( id UUID PK, category_id UUID→categories, name, description,
             price INT, image_url, is_available BOOL, is_sold_out BOOL, created_at )

menu_variations ( id UUID PK, menu_item_id UUID→menu_items,
                  variation_type TEXT, label TEXT, extra_price INT )

orders (
  id UUID PK,
  table_id UUID → tables,
  status         TEXT,   -- QUEUED | PROCESSING | SERVED | CANCELLED
  payment_method TEXT,   -- CASH | QRIS
  payment_status TEXT,   -- PAID | UNPAID
  total_amount INT,
  notes TEXT, cancel_reason TEXT,
  confirmed_at TIMESTAMPTZ, estimated_ready_at TIMESTAMPTZ,
  is_archived  BOOL DEFAULT false,   -- true = dipindah ke history oleh kasir
  created_at TIMESTAMPTZ
)

order_items ( id UUID PK, order_id UUID→orders, menu_item_id UUID,
              menu_item_name, menu_item_price INT, quantity INT,
              variations JSONB, subtotal INT, notes )

-- QRIS: order baru dibuat SETELAH pembayaran terkonfirmasi
payment_intents (
  id UUID PK,
  status TEXT,                    -- PENDING | PAID | EXPIRED | FAILED
  gross_amount INT,
  qr_string TEXT, qr_url TEXT,    -- qr_url = link pembayaran Mayar
  cart JSONB,                     -- payload order (dibuat jadi order saat lunas)
  order_id UUID → orders,
  midtrans_transaction_id TEXT,   -- id transaksi provider (Mayar/Midtrans)
  created_at TIMESTAMPTZ, paid_at TIMESTAMPTZ
)

staff_users ( id UUID PK, email UNIQUE, name, role CHECK(cashier|koki|owner), is_active, created_at )

activity_logs ( id UUID PK, actor_email, actor_role, action, target_type, target_id, detail JSONB, created_at )
```

> **Migrasi:** jalankan `scripts/migrate-payment-flow.sql` (status/payment_status) lalu `scripts/create-payment-intents.sql` (tabel QRIS). Untuk fitur "Selesai" kasir: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;`

---

## API Endpoints

### Menu

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/menu` | Public | Semua menu aktif |
| GET | `/api/menu/categories` | Public | Semua kategori |
| POST | `/api/menu` | staff | Tambah menu |
| PUT / DELETE | `/api/menu/[id]` | staff | Update / hapus menu |
| PATCH | `/api/menu/[id]/sold-out` | staff | Toggle sold out |
| GET | `/api/menu/variations` | Public | Variasi (filter `menu_item_id`) |
| POST | `/api/menu/variations` | staff | Tambah variasi |
| PUT / DELETE | `/api/menu/variations/[id]` | staff | Update / hapus variasi |

### Orders

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/orders` | staff | Board dapur (non-arsip, aktif) |
| GET | `/api/orders?mode=cashier` | staff | Board kasir (termasuk SERVED sampai diarsip) |
| GET | `/api/orders?history=1` · `/api/orders/history` | staff | Arsip + dibatalkan |
| DELETE | `/api/orders/history` | staff | Hapus semua history |
| DELETE | `/api/orders/reset` | owner | Reset semua order + log |
| POST | `/api/orders` | Public | Buat order (Cash langsung; QRIS lewat settle) |
| GET | `/api/orders/[id]` · DELETE | staff | Detail / hapus order |
| GET | `/api/orders/[id]/track` | Public | Tracking 1 order |
| GET | `/api/orders/table-track?tableId=` | Public | Tracking semua order 1 meja |
| PATCH | `/api/orders/[id]/status` | staff | QUEUED→PROCESSING→SERVED (+ETA) |
| PATCH | `/api/orders/[id]/mark-paid` | staff | UNPAID→PAID |
| PATCH | `/api/orders/[id]/archive` | staff | is_archived=true (Selesai) |
| PATCH | `/api/orders/[id]/cancel` | staff | Cancel (tolak jika SERVED/CANCELLED) |
| PATCH | `/api/orders/[id]/update-eta` | staff | Perpanjang ETA |

### Payments (Mayar — aktif)

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/payments/mayar/create` | Public | Buat payment request QRIS → return `link` |
| GET | `/api/payments/mayar/status?intentId=` | Public | Poll status (settle → buat order PAID) |
| POST | `/api/payments/mayar/webhook` | Public | Notifikasi Mayar (verifikasi ulang server-side) |

> Endpoint `/api/payments/midtrans/*` masih ada sebagai legacy tapi tidak dipakai.

### Tables · Upload · Activity · Health

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/tables` | Public | Semua meja |
| POST / DELETE | `/api/tables` | staff | Tambah / nonaktifkan meja |
| GET | `/api/tables/[number]` | Public | Meja by nomor |
| POST | `/api/upload` | staff | Upload gambar menu (≤5MB) |
| GET / POST | `/api/activity-logs` | staff | Activity logging |
| GET | `/api/health` | Public | Health check |

---

## Alur Pemesanan

```
Customer scan QR umum
      ↓
(Opsional) Cek lokasi — blokir jika terlalu jauh dari kafe
      ↓
Buka menu → pilih item → variasi + qty + catatan → keranjang
      ↓
Checkout → pilih MEJA + metode bayar + setuju ketentuan
      ↓
 ┌─ CASH ────────────────→ Order dibuat UNPAID + QUEUED
 └─ QRIS (Mayar) ────────→ Halaman QRIS → scan & bayar
                              ↓ (poll otomatis)
                           Terkonfirmasi → Order dibuat PAID + QUEUED
      ↓
Kitchen: QUEUED → (set ETA) PROCESSING → SERVED
      ↓
Kasir: Tandai Lunas (jika Cash) → Selesai (arsip ke history)
```

---

## Alur Status Order

```
QUEUED ──(koki set ETA + mulai)──→ PROCESSING ──(sudah diantar)──→ SERVED
   │                                                                  │
   └────────────(kasir cancel, hanya saat QUEUED)───→ CANCELLED       │
                                                                       ↓
                                      Kasir "Selesai" → is_archived=true → HISTORY
```

| Status | Deskripsi | Aksi |
|---|---|---|
| `QUEUED` | Masuk antrian dapur | Mulai Proses (ETA), Cancel, Tandai Lunas (jika UNPAID) |
| `PROCESSING` | Sedang dimasak | Sudah Diantar, Update ETA |
| `SERVED` | Sudah diantar | Tandai Lunas (jika UNPAID), Selesai (arsip) |
| `CANCELLED` | Dibatalkan | — (masuk history) |

Pembayaran: `UNPAID` (Cash belum dibayar) · `PAID` (QRIS lunas otomatis / kasir tandai lunas).

---

## Alur Pembayaran QRIS (Mayar)

Order **tidak** dibuat sampai pembayaran benar-benar terkonfirmasi, jadi tidak ada "order hantu" belum bayar di dapur.

```
1. Customer pilih QRIS → POST /api/payments/mayar/create
2. Server buat payment_intent (PENDING) + panggil Mayar → dapat `link` + transactionId
3. Halaman QRIS Mayar terbuka → customer scan & bayar (OVO/DANA/GoPay/bank apa pun)
4. App polling GET /api/payments/mayar/status tiap 3 detik
      → server cek GET https://api.mayar.id/hl/v2/transactions/{id}
      → status "paid"? settleIntent() buat order PAID + QUEUED (idempoten)
5. App redirect ke order-success → order muncul di board dapur
```

- **Deteksi otomatis** lewat polling (jalan di lokal & produksi) + webhook (cadangan di produksi).
- **Keamanan:** webhook Mayar tidak dipercaya sendiri — selalu diverifikasi ulang lewat status API terautentikasi sebelum settle.
- **Idempoten:** `settleIntent` memakai conditional lock `PENDING → PAID`, jadi polling + webhook tidak akan membuat order ganda.

---

## Fitur Lokasi (Geolocation Gate)

Membatasi pemesanan hanya untuk customer yang berada di sekitar kafe (via GPS browser, bukan IP — VPN tidak bisa menembusnya).

| Env | Fungsi |
|---|---|
| `NEXT_PUBLIC_LOCATION_CHECK` | `true` = aktif, selain itu nonaktif |
| `NEXT_PUBLIC_CAFE_LAT` / `NEXT_PUBLIC_CAFE_LNG` | Koordinat kafe (dari Google Maps) |
| `NEXT_PUBLIC_CAFE_RADIUS_METERS` | Radius izin (default 200 m) |

> GPS browser hanya aktif di **HTTPS atau localhost** — tidak jalan di `http://` LAN IP.

---

## Environment Variables

| Variable | Deskripsi | Wajib |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase | Ya |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API key public (anon) | Ya |
| `SUPABASE_SERVICE_ROLE_KEY` | API key service role (rahasia!) | Ya |
| `NEXT_PUBLIC_APP_URL` | Base URL app (untuk redirect) | Ya |
| `MAYAR_API_KEY` | API key Mayar (QRIS) | Untuk QRIS |
| `MAYAR_IS_PRODUCTION` | `true`=api.mayar.id, `false`=api.mayar.club | Untuk QRIS |
| `NEXT_PUBLIC_LOCATION_CHECK` | Aktifkan geolocation gate | Tidak |
| `NEXT_PUBLIC_CAFE_LAT/LNG` | Koordinat kafe | Jika gate aktif |
| `NEXT_PUBLIC_CAFE_RADIUS_METERS` | Radius izin (m) | Tidak |
| `MIDTRANS_SERVER_KEY` / `MIDTRANS_IS_PRODUCTION` | (Legacy) Midtrans | Tidak |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`, `MAYAR_API_KEY`, dan `MIDTRANS_SERVER_KEY` **server-only** — jangan pernah commit. Variabel `NEXT_PUBLIC_*` di-bake saat build (untuk Docker lewat `--build-arg`).

---

## Cara Menjalankan Lokal

```bash
# 1. Install
npm install

# 2. Siapkan environment
cp .env.example .env      # lalu isi kredensial

# 3. Jalankan migrasi SQL di Supabase (SQL Editor):
#    scripts/complete-schema.sql (baru) ATAU migrate-payment-flow.sql + create-payment-intents.sql

# 4. Dev server
npm run dev               # http://localhost:3000
```

| URL | Halaman | Akses |
|---|---|---|
| `/order` | Menu customer | Public |
| `/checkout` | Checkout | Public |
| `/order-tracking?tableId=xxx` | Lacak pesanan | Public |
| `/login` | Staff login | Public |
| `/dashboard/cashier` | Board kasir | Cashier, Owner |
| `/dashboard/kitchen` | Kitchen display | Koki |
| `/dashboard/owner` | Owner dashboard | Owner |
| `/dashboard/qr` | QR umum + kelola meja | Cashier, Owner |
| `/dashboard/history` | Riwayat order | Staff |

---

## Setup Supabase

1. Buat project di [Supabase Dashboard](https://supabase.com/dashboard) (region Singapore).
2. **SQL Editor** → jalankan `scripts/complete-schema.sql` (atau migrasi bertahap di atas).
3. **Authentication → Users** → buat user staff, lalu insert ke `staff_users`:

```sql
INSERT INTO staff_users (id, email, name, role) VALUES
  ('UUID_KASIR', 'kasir@warkop.com', 'Kasir 1', 'cashier'),
  ('UUID_KOKI',  'koki@warkop.com',  'Koki 1',  'koki'),
  ('UUID_OWNER', 'owner@warkop.com', 'Owner 1', 'owner');
```

4. **Project Settings → API** → salin `Project URL`, `anon`, dan `service_role` ke `.env`.
5. **Storage** → bucket `menu-images` sudah dibuat oleh schema SQL (public read, staff write).

---

## Deployment (Docker)

Project memakai `output: 'standalone'` untuk image minimal.

```bash
# Build & jalankan
docker compose up -d --build

# Cek health
curl http://localhost:3000/api/health
```

- `Dockerfile` — 3 stage (deps → builder → runner non-root). `NEXT_PUBLIC_*` di-pass sebagai `--build-arg`; secret server (service role, Mayar key) di runtime.
- `docker-compose.yml` — meneruskan env dari `.env`, healthcheck, `restart: unless-stopped`.
- **Produksi QRIS:** set Payment Notification URL di dashboard Mayar ke `https://<domain>/api/payments/mayar/webhook`.

> Bisa juga deploy ke Vercel (API Routes = serverless). Untuk akses hanya-di-kafe, lihat opsi jaringan lokal / geolocation gate.

---

## Login Staff

| Email | Role | Akses |
|---|---|---|
| `owner@warkop.com` | Owner | Semua halaman |
| `kasir@warkop.com` | Cashier | Board kasir, Manual Order, QR, History |
| `koki@warkop.com` | Koki | Kitchen Display |

> Password diset saat membuat user di Supabase Auth.

---

## Riwayat Versi

| Versi | Ringkasan |
|---|---|
| v2.1 | Kitchen ETA, customer tracking, Kanban kasir, owner dashboard, activity log |
| v2.2 | Overhaul UI/UX & kualitas kode (26 perbaikan), aksesibilitas WCAG |
| v2.3 | Konfirmasi persetujuan sebelum checkout |
| v2.4 | Upload gambar menu ke Supabase Storage |
| v2.5 | Kelola variasi menu (VariationManager + API) |
| v2.6 | Security hardening: RLS, auth guard 14 endpoint, state machine guard |
| v2.7 | Kompatibilitas skema (`categories`, `variation_type`) + error handling |
| v2.8 | Fix hydration checkout |
| v2.9 | Owner: hapus menu, reset data, hapus riwayat |
| **v3.0** | **Redesign flow pembayaran + gateway QRIS (Mayar), dark mode, geolocation gate, Docker** |

---

## Changelog v3.0

### 1. Redesign Alur Pembayaran & Status

- **Pemisahan status dapur & bayar** — `status` (QUEUED/PROCESSING/SERVED/CANCELLED) terpisah dari `payment_status` (PAID/UNPAID). Metode bayar disederhanakan ke **CASH** & **QRIS** (drop TRANSFER_BCA).
- **Satu QR umum** — Ganti QR per-meja jadi satu QR kafe; customer pilih meja saat checkout.
- **Board kasir per meja** — Order dikelompokkan per meja, tiap order punya badge bayar sendiri. Tombol **Tandai Lunas** (mark-paid) & **Selesai** (arsip) menggantikan confirm-cash/confirm-payment.
- **Kolom `is_archived`** — Order pindah ke history hanya saat kasir menekan "Selesai".
- Migrasi: `scripts/migrate-payment-flow.sql` + `scripts/create-payment-intents.sql`.

### 2. Payment Gateway QRIS — Mayar

- **Provider Mayar** ([lib/mayar.ts](lib/mayar.ts)) — create payment request + cek status via API resmi Mayar.
- **Order dibuat setelah lunas** — Tabel `payment_intents` menyimpan cart sementara; order baru dibuat saat pembayaran terkonfirmasi (`settleIntent`, idempoten).
- **Deteksi otomatis** — Polling status tiap 3 detik (lokal & produksi) + webhook (cadangan). Webhook selalu diverifikasi ulang server-side (aman walau signature tidak didokumentasikan).
- **Legacy Midtrans** — [lib/midtrans.ts](lib/midtrans.ts) + route `payments/midtrans/*` dipertahankan (tidak aktif) untuk referensi/masa depan.

### 3. Dark Mode

- **ThemeContext + ThemeToggle** — Tema terang/gelap tersimpan di `localStorage`, guard `mounted` anti-hydration-mismatch. Tailwind v4 `@theme` agar semua utility ikut berganti tema.

### 4. Geolocation Gate

- **`useLocationCheck`** — Blokir pesanan jika customer di luar radius kafe (haversine, GPS browser). Dikontrol penuh lewat env (`NEXT_PUBLIC_LOCATION_CHECK` + koordinat + radius).

### 5. Reliabilitas Data

- **Fetch via API Routes** — `useMenu` & `useOrders` mengambil data dari API (service role, bypass RLS) alih-alih query Supabase langsung dari browser (fix loading stuck karena RLS). Browser client hanya untuk trigger Realtime.
- **Auth `getUser()`** — Semua `requireAuth` & `middleware.ts` memakai `getUser()` (validasi ke auth server) menggantikan `getSession()`.
- **Tracking per meja** — `order-tracking` + `table-track` menampilkan seluruh order 1 meja; fix harga item Rp0 di tracking.

### 6. Deployment (Docker)

- **Dockerfile** (3-stage, non-root) + **docker-compose.yml** + **.dockerignore** + **.env.example**. `next.config.ts` → `output: 'standalone'`.

### Verifikasi

| Kategori | Hasil |
|---|---|
| E2E customer + pembayaran | 27/27 pass |
| E2E lifecycle staff | 25/25 pass |
| TypeScript / Build | 0 error, passed |
| Breaking changes | Perlu migrasi SQL (di atas) |

---

## Developer

**Ricky Rudiansyah** — BINUS University, Reseagitrch Track AI & Robotika

---

## License

MIT License — bebas digunakan dan dimodifikasi.
