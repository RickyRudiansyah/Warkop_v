# Warkop QR Ordering System v2.4

> Sistem pemesanan digital berbasis QR Code untuk warung/kafe — customer scan, pesan, bayar tanpa antri ke kasir.

![Tech Stack](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase)
![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-06B6D4?style=flat-square&logo=tailwindcss)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel)

---

## Table of Contents

- [Overview](#overview)
- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Arsitektur Project](#arsitektur-project)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Alur Pemesanan](#alur-pemesanan)
- [Alur Status Order](#alur-status-order)
- [Cara Menjalankan Lokal](#cara-menjalankan-lokal)
- [Setup Supabase](#setup-supabase)
- [Login Staff](#login-staff)
- [Deployment ke Vercel](#deployment-ke-vercel)
- [Environment Variables](#environment-variables)
- [Struktur Project](#struktur-project)
- [Changelog v2.3](#changelog-v23)
- [Developer](#developer)
- [License](#license)

---

## Overview

Warkop QR Ordering adalah sistem pemesanan digital berbasis QR Code untuk warung/kafe skala kecil-menengah. Customer cukup scan QR di meja, pilih menu, dan bayar tanpa perlu antri ke kasir. Staff (kasir, koki, owner) mengelola pesanan melalui dashboard masing-masing.

Versi 2.x merupakan rebuild total dari versi pertama (React + FastAPI), dengan seluruh stack diganti menjadi **full Next.js 16** menggunakan App Router dan API Routes sebagai backend — sehingga hanya 1 project, 1 repo, 1 deploy.

### Perbedaan v1 vs v2.x

| Aspek | v1 (React + FastAPI) | v2.1/v2.2 (Next.js Full) |
|---|---|---|
|---|---|---|
| Repo | 2 repo terpisah | 1 repo |
| Backend | Python FastAPI | Next.js API Routes (TypeScript) |
| Deploy | Vercel + Railway | Vercel saja |
| Auth guard | Client-side ProtectedRoute | Server-side `middleware.ts` |
| Language | Python + TypeScript | TypeScript saja |
| Maintenance | 2 environment | 1 environment |
| Cart persistence | sessionStorage | sessionStorage + merge duplicates |
| clearCart() clears table | N/A | Fixed in v2.2: only clears cart |
| Kitchen ETA | Tidak ada | Set time, countdown, update ETA, overdue warning |
| Customer tracking | Tidak ada | Realtime order tracking + ETA countdown |
| Cashier view | Grid list | Kanban 4 kolom |
| Owner dashboard | Basic | Rekap penjualan, top menu, recent orders, edit menu |

---

## Fitur Utama

### Customer

| Fitur | Deskripsi |
|---|---|
| Scan QR Code | Scan QR di meja → langsung buka halaman menu dengan nomor meja |
| Browse menu | Browse menu per kategori dengan filter kategori pills |
| Search menu | Cari menu berdasarkan nama |
| Detail menu | Lihat detail menu + pilih variasi (ukuran, level pedas, topping) |
| Tambah catatan | Tambah catatan per item (contoh: "Tidak pakai gula") |
| Keranjang | Kelola keranjang dengan CartFAB floating button + CartDrawer bottom sheet |
| Cart persistence | Keranjang tersimpan di sessionStorage, survive page refresh |
| Checkout | Halaman checkout dengan ringkasan pesanan + pilihan metode pembayaran |
| Metode pembayaran | Cash (Tunai), QRIS, Transfer BCA |
| Order tracking | Lacak status pesanan secara realtime dengan estimasi waktu selesai |

### Kasir

| Fitur | Deskripsi |
|---|---|
| Dashboard Kanban | Lihat semua order aktif dalam 4 kolom: Pending Cash, Pending Bayar, Dikonfirmasi, Diproses |
| Realtime updates | Order update secara realtime via Supabase Realtime |
| Konfirmasi Cash | Tombol konfirmasi pembayaran cash |
| Konfirmasi QRIS/Transfer | Tombol konfirmasi pembayaran non-cash |
| Cancel order | Batalkan order dengan input alasan |
| Manual order | Input order manual (POS-style) untuk pelanggan yang tidak scan QR |
| QR Generator | Generate + download QR Code per meja (PNG) |
| Toast notifications | Notifikasi untuk setiap aksi (konfirmasi, cancel, dll) |
| Activity logging | Log aktivitas kasir tercatat di database |

### Koki (Kitchen Display)

| Fitur | Deskripsi |
|---|---|
| Kitchen display | Tampilan ticket pesanan secara realtime |
| Set ETA | Pilih estimasi waktu selesai (5/10/15/20/25/30 menit) saat mulai proses |
| Countdown timer | Timer realtime yang berjalan setiap detik |
| Update ETA | Perpanjang estimasi waktu saat proses berjalan (+5/10/15 menit) |
| Warning warna | Hijau (> 3 menit), Kuning (< 3 menit), Merah + pulse (overdue) |
| Overdue badge | Label "OVERDUE" + berapa menit terlambat |
| Tombol Mulai Proses | Ubah status ke PROCESSING |
| Tombol Sudah Diantar | Ubah status ke SERVED |
| Pengelompokan | Antrian vs Sedang Diproses |
| Toast notifications | Notifikasi untuk setiap aksi |
| Activity logging | Log aktivitas koki tercatat di database |

### Owner

| Fitur | Deskripsi |
|---|---|
| Statistik dashboard | Pendapatan, total order, rata-rata per order, cancel rate |
| Top menu terlaris | Ranking menu dengan badge emas/perak/perunggu |
| Order terbaru | List 10 order terakhir dengan status dan total |
| Rekap penjualan | Filter: Hari Ini / 7 Hari / Semua |
| Kelola menu | Tambah menu baru, edit menu (nama, harga, deskripsi, gambar), upload gambar via Supabase Storage, toggle sold out |
| Statistik menu | Total menu, tersedia, sold out |
| Order history | Lihat semua order yang sudah selesai atau dibatalkan |
| Toast notifications | Notifikasi untuk setiap aksi CRUD |

### Auth & Session

| Fitur | Deskripsi |
|---|---|
| Halaman login terpusat | Semua staff login di halaman yang sama |
| Auto-redirect | Redirect otomatis ke halaman sesuai role setelah login |
| Proteksi halaman | Server-side `middleware.ts` untuk auth guard |
| Role-based access | Cashier, Koki, Owner dengan akses berbeda |
| Session persisten | Session persisten via Supabase Auth cookie |
| Logout | Logout dari semua halaman |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + Storage) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Animation | Framer Motion |
| Icons | Lucide React |
| Toast | Sonner |
| QR Code | qrcode.react |
| Deployment | Vercel (1 project) |

---

## Arsitektur Project

```
warkop-app/
├── app/
│   ├── (customer)/
│   │   ├── layout.tsx                   # Suspense boundary
│   │   ├── order/page.tsx               # Halaman menu customer
│   │   ├── checkout/page.tsx            # Halaman checkout
│   │   ├── order-success/page.tsx       # Konfirmasi sukses
│   │   └── order-tracking/page.tsx      # Lacak pesanan realtime
│   ├── (staff)/
│   │   ├── login/page.tsx               # Staff login
│   │   └── dashboard/
│   │       ├── cashier/page.tsx         # Dashboard kasir (Kanban)
│   │       ├── cashier/new-order/page.tsx  # Manual order (POS)
│   │       ├── kitchen/page.tsx         # Kitchen display (ETA)
│   │       ├── owner/page.tsx           # Owner dashboard
│   │       ├── qr/page.tsx              # QR Generator
│   │       └── history/page.tsx         # Riwayat order
│   ├── api/
│   │   ├── activity-logs/route.ts       # POST/GET activity logs
│   │   ├── health/route.ts              # Health check
│   │   ├── menu/route.ts                # GET all, POST create
│   │   ├── menu/categories/route.ts     # GET categories
│   │   ├── menu/[id]/route.ts           # PUT update, DELETE
│   │   ├── menu/[id]/sold-out/route.ts  # PATCH toggle sold out
│   │   ├── orders/route.ts              # GET active/history, POST create
│   │   ├── orders/history/route.ts      # GET history (SERVED/CANCELLED)
│   │   ├── orders/[id]/route.ts         # GET detail
│   │   ├── orders/[id]/cancel/route.ts  # PATCH cancel
│   │   ├── orders/[id]/confirm-cash/route.ts    # PATCH confirm cash
│   │   ├── orders/[id]/confirm-payment/route.ts # PATCH confirm QRIS/Transfer
│   │   ├── orders/[id]/status/route.ts  # PATCH update status
│   │   ├── orders/[id]/track/route.ts   # GET order status (customer)
│   │   ├── orders/[id]/update-eta/route.ts      # PATCH update ETA
│   │   ├── tables/route.ts              # GET all tables
│   │   ├── tables/[number]/route.ts     # GET table by number
│   │   └── upload/route.ts              # POST upload gambar ke Storage
│   ├── layout.tsx                       # Root layout + providers
│   └── page.tsx                         # Redirect ke /order
├── components/
│   ├── auth/ProtectedRoute.tsx          # Client-side route guard
│   ├── cart/
│   │   ├── CartFAB.tsx                  # Floating cart button
│   │   └── CartDrawer.tsx               # Bottom sheet cart
│   ├── dashboard/
│   │   ├── DashboardLayout.tsx          # Staff dashboard shell
│   │   └── OrderCard.tsx                # Order card with ETA
│   ├── menu/
│   │   ├── MenuItemCard.tsx             # Menu item card
│   │   ├── MenuItemSheet.tsx            # Bottom sheet detail
│   │   └── CategoryPills.tsx            # Category filter pills
│   └── ui/
│       ├── Button.tsx                   # Button component
│       ├── Badge.tsx                    # Badge component
│       ├── Spinner.tsx                  # Loading spinner
│       ├── Skeleton.tsx                 # Loading placeholder
│       └── EmptyState.tsx               # Empty state
├── context/
│   ├── AuthContext.tsx                  # Auth state management
│   └── CartContext.tsx                  # Cart state + sessionStorage
├── hooks/
│   ├── useMenu.ts                       # Menu data + variations
│   ├── useOrders.ts                     # Orders with realtime
│   └── useCountdown.ts                  # Countdown timer
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # Browser Supabase client
│   │   └── server.ts                    # Server Supabase client
│   └── utils.ts                         # Utilities (formatCurrency, etc)
├── types/
│   ├── index.ts                         # TypeScript interfaces
│   └── database.ts                      # Supabase Database type
├── middleware.ts                         # Server-side auth guard
├── supabase-schema.sql                   # SQL schema for Supabase
└── .env.example                          # Environment variables template
```

---

## Database Schema

### Tables

```sql
-- Meja
tables (
  id UUID PRIMARY KEY,
  table_number INT UNIQUE NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
)

-- Kategori Menu
menu_categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
)

-- Menu Item
menu_items (
  id UUID PRIMARY KEY,
  category_id UUID REFERENCES menu_categories,
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_sold_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
)

-- Variasi Menu
menu_variations (
  id UUID PRIMARY KEY,
  menu_item_id UUID REFERENCES menu_items,
  group_name TEXT NOT NULL,    -- "Ukuran", "Level Pedas"
  label TEXT NOT NULL,         -- "Large", "Extra Pedas"
  extra_price INT DEFAULT 0
)

-- Order
orders (
  id UUID PRIMARY KEY,
  table_id UUID REFERENCES tables,
  status TEXT NOT NULL,        -- PENDING_CASH | PENDING_PAYMENT | CONFIRMED | PROCESSING | SERVED | CANCELLED
  payment_method TEXT NOT NULL,-- CASH | QRIS | TRANSFER_BCA
  total_amount INT NOT NULL,
  notes TEXT,
  cancel_reason TEXT,
  confirmed_at TIMESTAMPTZ,
  estimated_ready_at TIMESTAMPTZ,  -- ETA untuk kitchen
  created_at TIMESTAMPTZ
)

-- Order Items
order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders,
  menu_item_id UUID REFERENCES menu_items,
  menu_item_name TEXT NOT NULL,
  menu_item_price INT NOT NULL,
  quantity INT NOT NULL,
  variations JSONB DEFAULT '[]',
  subtotal INT NOT NULL,
  notes TEXT
)

-- Staff Users
staff_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cashier', 'koki', 'owner')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
)

-- Activity Logs
activity_logs (
  id UUID PRIMARY KEY,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ
)
```

---

## API Endpoints

### Menu

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/menu` | Public | Ambil semua menu aktif |
| GET | `/api/menu/categories` | Public | Ambil semua kategori |
| POST | `/api/menu` | owner | Tambah menu baru |
| PUT | `/api/menu/[id]` | owner | Update menu |
| DELETE | `/api/menu/[id]` | owner | Hapus menu |
| PATCH | `/api/menu/[id]/sold-out` | owner/cashier | Toggle sold out |

### Orders

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/orders` | cashier/owner | Ambil order aktif |
| GET | `/api/orders?history=1` | cashier/owner | Ambil semua order |
| GET | `/api/orders/history` | cashier/owner | Ambil order SERVED/CANCELLED |
| GET | `/api/orders/[id]` | cashier/owner | Detail order |
| GET | `/api/orders/[id]/track` | Public | Tracking status (customer) |
| POST | `/api/orders` | Public | Buat order baru |
| PATCH | `/api/orders/[id]/confirm-cash` | cashier | Konfirmasi bayar cash |
| PATCH | `/api/orders/[id]/confirm-payment` | cashier | Konfirmasi QRIS/Transfer |
| PATCH | `/api/orders/[id]/status` | cashier/koki | Update status |
| PATCH | `/api/orders/[id]/cancel` | cashier | Cancel order |
| PATCH | `/api/orders/[id]/update-eta` | koki | Update estimasi waktu |

### Tables

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/tables` | Public | Ambil semua meja |
| GET | `/api/tables/[number]` | Public | Ambil meja by nomor |

### Activity Logs

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/activity-logs` | staff | Ambil activity logs |
| POST | `/api/activity-logs` | staff | Buat activity log |

### Health

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/health` | Public | Health check |

### Upload

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/upload` | owner | Upload gambar menu ke Supabase Storage (max 5MB, image only) |

---

## Alur Pemesanan

```
Customer scan QR di meja
       ↓
Buka halaman menu (/order?table=N)
       ↓
Browse menu → Klik item → Pilih variasi + qty + catatan
       ↓
Tambah ke keranjang (CartFAB badge update)
       ↓
Checkout → Review pesanan → Pilih metode pembayaran
       ↓
Submit Order → API → Supabase
       ↓
Halaman sukses → Link ke tracking pesanan
       ↓
Cashier Dashboard (Kanban realtime)
       ↓
Kasir konfirmasi pembayaran → CONFIRMED
       ↓
Kitchen Display → Koki set ETA → Mulai Proses
       ↓
Countdown berjalan → Update ETA jika perlu
       ↓
Koki tekan "Sudah Diantar" → SERVED ✅
```

---

## Alur Status Order

```
Customer submit order
       ↓
PENDING_CASH ──(kasir konfirmasi cash)──→ CONFIRMED
PENDING_PAYMENT ──(kasir konfirmasi QRIS/Transfer)──→ CONFIRMED
       ↓
CONFIRMED ──(koki set ETA + mulai proses)──→ PROCESSING
       ↓
PROCESSING ──(countdown berjalan, bisa update ETA)──→ SERVED ✅

Bisa cancel dari: PENDING_CASH, PENDING_PAYMENT, CONFIRMED → CANCELLED
```

### Status Detail

| Status | Deskripsi | Aksi Tersedia |
|---|---|---|
| `PENDING_CASH` | Order menunggu pembayaran cash | Konfirmasi Cash, Cancel |
| `PENDING_PAYMENT` | Order menunggu pembayaran QRIS/Transfer | Konfirmasi Bayar, Cancel |
| `CONFIRMED` | Order dikonfirmasi, masuk antrian dapur | Mulai Proses (dengan ETA), Cancel |
| `PROCESSING` | Order sedang diproses dapur | Sudah Diantar, Update ETA |
| `SERVED` | Order sudah diantar ke meja | - |
| `CANCELLED` | Order dibatalkan | - |

---

## Cara Menjalankan Lokal

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm
- Akun Supabase

### 1. Clone / Download Project

```bash
cd C:\Users\ASUS\Documents\Vona\Warkop\warkop-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Supabase

1. Buat project di [Supabase Dashboard](https://supabase.com/dashboard)
2. Jalankan SQL schema di SQL Editor (lihat [Setup Supabase](#setup-supabase))
3. Buat user staff di Authentication → Users
4. Insert data staff ke tabel `staff_users`

### 4. Setup Environment Variables

```bash
# Copy template
copy .env.example .env

# Edit .env dan isi credentials
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Jalankan Development Server

```bash
npm run dev
```

### 6. Buka di Browser

| URL | Halaman | Akses |
|---|---|---|
| `http://localhost:3000/order?table=1` | Menu Customer | Public |
| `http://localhost:3000/checkout` | Checkout | Public |
| `http://localhost:3000/order-success` | Order Success | Public |
| `http://localhost:3000/order-tracking?orderId=xxx` | Order Tracking | Public |
| `http://localhost:3000/login` | Staff Login | Public |
| `http://localhost:3000/dashboard/cashier` | Dashboard Kasir | Cashier, Owner |
| `http://localhost:3000/dashboard/cashier/new-order` | Manual Order | Cashier, Owner |
| `http://localhost:3000/dashboard/kitchen` | Kitchen Display | Koki |
| `http://localhost:3000/dashboard/owner` | Owner Dashboard | Owner |
| `http://localhost:3000/dashboard/qr` | QR Generator | Cashier, Owner |
| `http://localhost:3000/dashboard/history` | Order History | Staff |

---

## Setup Supabase

### Step 1: Buat Project

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Klik **"New Project"**
3. Isi:
   - **Name:** `Warkop QR`
   - **Database Password:** (buat password kuat)
   - **Region:** `Southeast Asia (Singapore)`
4. Klik **"Create new project"** — tunggu ~2 menit

### Step 2: Jalankan SQL Schema

1. Di dashboard Supabase, klik **"SQL Editor"**
2. Klik **"New query"**
3. Copy-paste seluruh isi file `supabase-schema.sql`
4. Klik **"Run"**

### Step 3: Buat User Staff

1. Klik **"Authentication"** → **"Users"**
2. Klik **"Add user"** → **"Create new user"**
3. Buat 3 user:

| Email | Password | Role |
|---|---|---|
| `kasir@warkop.com` | `password123` | cashier |
| `koki@warkop.com` | `password123` | koki |
| `owner@warkop.com` | `password123` | owner |

4. Setelah buat user, copy **User ID** (UUID) masing-masing
5. Di **"Table Editor"** → pilih tabel `staff_users` → **"Insert row"**
6. Atau jalankan SQL:

```sql
INSERT INTO staff_users (id, email, name, role) VALUES
  ('UUID_KASIR', 'kasir@warkop.com', 'Kasir 1', 'cashier'),
  ('UUID_KOKI', 'koki@warkop.com', 'Koki 1', 'koki'),
  ('UUID_OWNER', 'owner@warkop.com', 'Owner 1', 'owner');
```

### Step 4: Ambil Credentials

1. Klik **"Project Settings"** (ikon gear)
2. Klik **"API"**
3. Copy:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public** → `eyJhbG...`
   - **service_role** → `eyJhbG...` (rahasia!)

### Step 5: Isi .env

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

---

## Login Staff

| Email | Password | Role | Akses |
|---|---|---|---|
| `owner@warkop.com` | (set di Auth) | Owner | Semua halaman |
| `cashier@warkop.com` | (set di Auth) | Kasir | Dashboard Kasir, Manual Order, QR Generator |
| `koki@warkop.com` | (set di Auth) | Koki | Kitchen Display |

> Password dikonfigurasi saat membuat user di Supabase Auth Dashboard.

---

## Deployment ke Vercel

### Step 1: Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: Warkop QR v2.1"
git remote add origin https://github.com/your-username/warkop-qr-ordering-v2.git
git push -u origin main
```

### Step 2: Deploy ke Vercel

1. Buka [Vercel](https://vercel.com)
2. Klik **"New Project"**
3. Import repository GitHub
4. Set environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
5. Klik **"Deploy"**

### Step 3: Verify

- Build command: `next build`
- Output: server-side (karena ada API Routes)
- Custom domain (opsional): tambahkan di Vercel settings

---

## Environment Variables

| Variable | Deskripsi | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase | Ya |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API key public (anon) | Ya |
| `SUPABASE_SERVICE_ROLE_KEY` | API key service role (rahasia!) | Ya |

> ⚠️ **PENTING:** Jangan pernah commit `SUPABASE_SERVICE_ROLE_KEY` ke repository. Gunakan `.env` lokal dan Vercel environment variables.

---

## Struktur Project

### Pages (12 halaman)

| Halaman | Route | Role | Deskripsi |
|---|---|---|---|
| Home | `/` | Public | Redirect ke `/order` |
| Menu | `/order?table=N` | Public | Halaman menu customer |
| Checkout | `/checkout` | Public | Checkout pesanan |
| Order Success | `/order-success` | Public | Konfirmasi sukses |
| Order Tracking | `/order-tracking?orderId=xxx` | Public | Lacak pesanan realtime |
| Login | `/login` | Public | Staff login |
| Cashier Dashboard | `/dashboard/cashier` | Cashier, Owner | Kanban order aktif |
| Manual Order | `/dashboard/cashier/new-order` | Cashier, Owner | Input order manual |
| Kitchen Display | `/dashboard/kitchen` | Koki | Display pesanan + ETA |
| Owner Dashboard | `/dashboard/owner` | Owner | Statistik + kelola menu |
| QR Generator | `/dashboard/qr` | Cashier, Owner | Generate QR per meja |
| Order History | `/dashboard/history` | Staff | Riwayat order |

### API Routes (18 endpoints)

| Resource | Endpoints | Deskripsi |
|---|---|---|
| Menu | GET, POST | List + create menu |
| Menu/[id] | PUT, DELETE | Update + delete menu |
| Menu/[id]/sold-out | PATCH | Toggle sold out |
| Menu/categories | GET | List kategori |
| Orders | GET, POST | List + create order |
| Orders/history | GET | Order SERVED/CANCELLED |
| Orders/[id] | GET | Detail order |
| Orders/[id]/track | GET | Tracking (customer) |
| Orders/[id]/status | PATCH | Update status |
| Orders/[id]/cancel | PATCH | Cancel order |
| Orders/[id]/confirm-cash | PATCH | Konfirmasi cash |
| Orders/[id]/confirm-payment | PATCH | Konfirmasi QRIS/Transfer |
| Orders/[id]/update-eta | PATCH | Update ETA (kitchen) |
| Tables | GET | List meja |
| Tables/[number] | GET | Meja by nomor |
| Activity-logs | GET, POST | Activity logging |
| Upload | POST | Upload gambar ke Storage |
| Health | GET | Health check |

### Components (10 komponen)

| Komponen | Lokasi | Deskripsi |
|---|---|---|
| Button | `components/ui/` | Button dengan variants + loading |
| Badge | `components/ui/` | Status badge |
| Spinner | `components/ui/` | Loading spinner |
| Skeleton | `components/ui/` | Loading placeholder |
| EmptyState | `components/ui/` | Empty state |
| MenuItemCard | `components/menu/` | Card menu item |
| MenuItemSheet | `components/menu/` | Bottom sheet detail |
| CategoryPills | `components/menu/` | Filter kategori |
| CartFAB | `components/cart/` | Floating cart button |
| CartDrawer | `components/cart/` | Bottom sheet cart |
| DashboardLayout | `components/dashboard/` | Dashboard shell |
| OrderCard | `components/dashboard/` | Order card + ETA |
| ProtectedRoute | `components/auth/` | Route guard |

### Context & Hooks

| Module | Lokasi | Deskripsi |
|---|---|---|
| AuthContext | `context/` | Auth state + Supabase auth |
| CartContext | `context/` | Cart state + sessionStorage |
| useMenu | `hooks/` | Menu data + variations |
| useOrders | `hooks/` | Orders + Supabase Realtime |
| useCountdown | `hooks/` | Countdown timer |

---

## Changelog v2.1

### New Features

- **Kitchen ETA System** — Koki bisa set estimasi waktu, countdown realtime, update ETA, overdue warning
- **Customer Order Tracking** — Customer bisa lacak status pesanan + ETA secara realtime
- **Cart FAB + Drawer** — Floating cart button + bottom sheet cart dengan animasi
- **Cart Persistence** — Keranjang tersimpan di sessionStorage, survive page refresh
- **Cart Merge Duplicates** — Item sama + variasi sama otomatis merge quantity
- **Kanban Cashier View** — 4 kolom: Pending Cash, Pending Bayar, Dikonfirmasi, Diproses
- **Owner: Rekap Penjualan** — Filter hari ini / 7 hari / semua
- **Owner: Top Menu Terlaris** — Ranking menu dengan badge emas/perak/perunggu
- **Owner: Revenue Stats** — Pendapatan, total order, rata-rata, cancel rate
- **Owner: Edit Menu** — Form edit menu (nama, harga, deskripsi)
- **Order History Page** — Riwayat order SERVED/CANCELLED
- **Activity Logging** — Log semua aksi staff (confirm, cancel, status change)
- **Skeleton Loading** — Placeholder loading untuk menu grid
- **Toast Notifications** — Sonner toasts untuk semua aksi user
- **Purple Theme** — Custom color palette (#6B3FA0)
- **Custom Scrollbar** — Styled scrollbar
- **Glass Effect** — Backdrop blur untuk header

### Bug Fixes

- **Cart addItem wired** — `onAdd` di `MenuItemSheet` sekarang terhubung ke `useCart().addItem()`
- **Variations fetch** — `menu_variations` sekarang di-fetch dari Supabase
- **Table ID resolution** — `table_id` sekarang di-resolve dari `tableNumber` saat checkout

### Improvements

- **useMenu hook** — Sekarang fetch variations bersama menu items
- **OrderCard** — Countdown timer, ETA selector, overdue badge
- **Checkout page** — Table_id resolution, toast notifications
- **Kitchen page** — ETA selector, countdown, update ETA, overdue logic
- **Cashier page** — Kanban layout, toast, activity log
- **Owner page** — Comprehensive dashboard dengan stats, rekap, top menu, recent orders


---

## Changelog v2.2

### UI/UX & Code Quality Overhaul (26 improvements across 20 files)

#### Critical Fixes

- **Hardcoded credentials removed** — Activity logs now use actual logged-in user identity from `useAuth()`, not hardcoded strings
- **Error handling added** — All Supabase queries now properly catch and handle errors (`useMenu`, `useOrders`, `AuthContext`, `checkout`)
- **Fixed broken Update ETA button** — Kitchen ETA select dropdown is now controlled; button sends the actual selected value, not hardcoded `5`
- **Cancel modal replaces `prompt()`** — Proper styled modal dialog with textarea input, confirm/cancel buttons, Escape key support, and focus management
- **MenuItemSheet state now resets** — Opening a new menu item clears quantity, variations, and notes from the previous item
- **Login page redesigned** — Now uses theme tokens (`bg-surface-2`, `bg-surface`, `text-primary`) instead of hardcoded Tailwind classes; auto-redirects based on user role without double-hop

#### UX Improvements

- **`clearCart()` no longer clears table number** — Customer can clear cart to start fresh without losing table assignment
- **Theme consistency across all components** — `MenuItemCard`, `CategoryPills`, `EmptyState`, `Badge`, `DashboardLayout` all now use CSS theme variables instead of hardcoded `bg-white`, `text-gray-*` classes
- **OrderCard animations** — Frameworks Motion enter/exit animations (`motion.div` with `opacity`/`y` transitions) for smooth card appearance
- **Skeleton loading everywhere** — Added skeleton placeholders in checkout page and order tracking page (was blank spinner only)
- **Loading state prop** — `OrderCard` now has `isLoading` prop; buttons show spinner + disabled state during API calls
- **Persistent customer headers** — All customer pages (checkout, order-success, order-tracking) now have consistent sticky header with "Warkop QR" + back button + "Meja X" indicator
- **Duplicated `cn` utility removed** — `DashboardLayout` now imports `cn` from `@/lib/utils` instead of redefining it
- **History nav link added** — Both cashier and owner navigation now include "History" link to `/dashboard/history`
- **DRY refactoring** — `useMenu` hook deduplicates fetch logic into shared function; `useOrders` fixes `.not()` filter syntax

#### Accessibility (WCAG Compliance)

- **ARIA labels** — All icon-only buttons now have descriptive `aria-label` attributes (close, plus, minus, delete, edit, search, cart)
- **Focus trapping** — Modals (MenuItemSheet, CartDrawer, CancelDialog) trap focus inside when open
- **Escape key support** — All modals close on Escape key press
- **Modal roles** — `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on all modal components
- **`aria-current="page"`** — Active navigation link in DashboardLayout is announced as current page
- **`aria-live="polite"`** — Real-time update regions (kanban, kitchen, order-tracking) use `aria-live` for screen reader announcements
- **Skip-to-content link** — Root layout includes skip navigation link for keyboard users
- **`scope="col"`** — All table header cells have proper scope attributes
- **`aria-hidden="true"`** — Modal backdrop divs marked as hidden from screen readers

#### Visual Polish

- **Table status indicator** — QR Generator page now shows occupied/vacant status per table (green "Kosong" / yellow "Diisi" badges + border)
- **Professional icon fallback** — `MenuItemCard` uses `Utensils` icon (Lucide) instead of food emoji 🍽️
- **Responsive history table** — History page table has `overflow-x-auto` and hides "Items" column on mobile (`hidden md:table-cell`)
- **CartFAB sizing** — Now centers with `max-w-md mx-auto` instead of stretching full-width on desktop
- **EmptyState action prop** — `EmptyState` component now supports optional `action` button for contextual CTAs

#### Bonus

- **Toast config** — Sonner toasts now have `duration={3000}`, `closeButton`, and `richColors`
- **Order page** — Search input has `aria-label`; menu grid has `aria-live="polite"`
- **API: status route** — Now properly handles `estimated_minutes` param for ETA setting
- **QR page: btoa fix** — UTF-8 characters in SVG no longer cause download failure (fallback to `encodeURIComponent`)

### Tech Specs

| Metric | Value |
|---|---|
| Files modified | 20 |
| TypeScript errors | 0 |
| Build | Passed |
| New dependencies | 0 |
| Breaking changes | 0 |


---

## Changelog v2.3

### Checkout Agreement Confirmation (1 file)

- **Warning card before checkout** — Customer sees a styled warning card with an `AlertTriangle` icon explaining that orders cannot be canceled after being sent to the cashier
- **Custom checkbox agreement** — Styled checkbox with purple check animation, customer must actively agree before the order button is enabled
- **Disabled button until agreement** — "Pesan Sekarang" button is disabled until checkbox is checked, preventing accidental or misclicked orders
- **Clear, concise Indonesian wording** — Simplified agreement text: _"Saya setuju, setelah dipesan, pesanan tidak dapat dibatalkan."_

### Flow Comparison

| Before (v2.2) | After (v2.3) |
|---|---|
| Click "Pesan Sekarang" -> instant submit | Warning -> centang agreement -> "Pesan Sekarang" |
| No confirmation step | Customer actively confirms they understand |
| Possible accidental orders | Guarded against mistaken submissions |

### Tech Specs

| Metric | Value |
|---|---|
| Files modified | 1 (`app/(customer)/checkout/page.tsx`) |
| TypeScript errors | 0 |
| Build | Passed |
| Breaking changes | None |

---

## Changelog v2.4

### Supabase Storage — Upload Gambar Menu (4 files)

- **Image upload API** — `POST /api/upload` menerima multipart form-data, validasi tipe & ukuran file (max 5MB), upload ke Supabase Storage bucket `menu-images`
- **Owner dashboard upload** — Form tambah & edit menu sekarang punya area upload gambar dengan preview, tombol hapus, dan loading spinner saat upload
- **Storage bucket SQL** — `supabase-schema.sql` sudah include setup bucket `menu-images` + RLS policies (public read, staff full access)
- **Auto URL binding** — Setelah upload, URL gambar otomatis tersimpan di `menu_items.image_url` dan tampil di `MenuItemCard`

### Owner Dashboard Changes

| Before (v2.3) | After (v2.4) |
|---|---|
| Tambah/edit menu hanya: nama, harga, deskripsi | Tambah: upload gambar + preview + hapus gambar |
| Menu items tanpa gambar | Menu items bisa punya gambar dari Supabase Storage |

### Tech Specs

| Metric | Value |
|---|---|
| Files modified | 2 (`owner/page.tsx`, `supabase-schema.sql`) |
| Files created | 1 (`app/api/upload/route.ts`) |
| TypeScript errors | 0 |
| Build | Passed |
| Breaking changes | None |

---

## Developer

**Ricky Rudiansyah** — BINUS University, Research Track AI & Robotika

---

## License

MIT License — bebas digunakan dan dimodifikasi.







