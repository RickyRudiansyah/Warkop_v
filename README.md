# Rumipang Ordering System v2.9

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
- [Changelog v2.6](#changelog-v26)
- [Changelog v2.7](#changelog-v27)
- [Changelog v2.8](#changelog-v28)
- [Changelog v2.9](#changelog-v29)
- [Changelog v3.0](#changelog-v30)
- [Developer](#developer)

---

## Overview

Rumipang Ordering adalah sistem pemesanan digital berbasis QR Code untuk warung/kafe skala kecil-menengah. Customer cukup scan QR di meja, pilih menu, dan bayar tanpa perlu antri ke kasir. Staff (kasir, owner) mengelola pesanan melalui dashboard masing-masing, dan struk
lunas otomatis dicetak ke printer thermal Bluetooth lewat aplikasi Android companion.

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
| Order history | Lihat + hapus riwayat order yang sudah selesai atau dibatalkan |
| Toast notifications | Notifikasi untuk setiap aksi (konfirmasi, cancel, dll) |
| Activity logging | Log aktivitas kasir tercatat di database |

### Kitchen Display (dipegang Kasir)

> Sejak v3.0 role `koki` dihapus. Halaman Dapur diakses kasir & owner lewat menu **Dapur**.

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
| Activity logging | Log aktivitas tercatat di database |

### Printer Struk (Bluetooth)

| Fitur | Deskripsi |
|---|---|
| QRIS auto-print | Struk otomatis masuk antrian cetak begitu Midtrans menyatakan settlement |
| Cash butuh verifikasi | Struk baru dicetak setelah kasir menekan "Verifikasi & Cetak Struk" |
| Antrian cetak | Halaman `/dashboard/printer` — status job, pratinjau struk, cetak ulang |
| Anti dobel-cetak | Satu struk otomatis per order (unique index), aman dari webhook + poll bersamaan |
| Auto-requeue | Job yang tidak di-ACK aplikasi Android dalam 2 menit kembali ke antrian |
| Cetak ulang | Tombol printer di kartu order (khusus order lunas) |

> Detail kontrak integrasi aplikasi Android: [`docs/BLUETOOTH-PRINTER.md`](docs/BLUETOOTH-PRINTER.md)

### Owner

| Fitur | Deskripsi |
|---|---|
| Statistik dashboard | Pendapatan, total order, rata-rata per order, cancel rate |
| Top menu terlaris | Ranking menu dengan badge emas/perak/perunggu |
| Order terbaru | List 10 order terakhir dengan status dan total |
| Rekap penjualan | Filter: Hari Ini / 7 Hari / Semua |
| Kelola menu | Tambah, edit, **hapus** (nama, harga, deskripsi, gambar), upload gambar via Supabase Storage, toggle sold out |
| Kelola variasi | Tambah, edit, hapus variasi per menu (level pedas, ukuran, topping, dll) — grup + label + extra price |
| Statistik menu | Total menu, tersedia, sold out |
| Order history | Lihat + **hapus** semua order yang sudah selesai atau dibatalkan, dengan hapus satu per satu atau hapus semua |
| Reset data | Hapus semua order (aktif + riwayat) & activity log dengan satu klik — menu, meja, staff tetap aman |
| Toast notifications | Notifikasi untuk setiap aksi CRUD |

### Auth & Session

| Fitur | Deskripsi |
|---|---|
| Halaman login terpusat | Semua staff login di halaman yang sama |
| Auto-redirect | Redirect otomatis ke halaman sesuai role setelah login |
| Proteksi halaman | Server-side `middleware.ts` untuk auth guard |
| Role-based access | Cashier & Owner dengan akses berbeda |
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
│   │   ├── menu/variations/route.ts      # GET/POST variasi menu
│   │   ├── menu/variations/[id]/route.ts # PUT/DELETE variasi
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
  role TEXT NOT NULL CHECK (role IN ('cashier', 'owner')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
)

-- Print Jobs (antrian cetak struk ke printer Bluetooth)
print_jobs (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  kind TEXT CHECK (kind IN ('RECEIPT', 'REPRINT')),
  status TEXT CHECK (status IN ('PENDING', 'PRINTING', 'PRINTED', 'FAILED')),
  trigger TEXT,
  payload JSONB,          -- snapshot struk terstruktur
  text_body TEXT,         -- teks siap kirim ke printer ESC/POS
  attempts INTEGER,
  last_error TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  printed_at TIMESTAMPTZ
)
-- UNIQUE (order_id) WHERE kind = 'RECEIPT'  -> anti dobel-cetak

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
| GET | `/api/menu/variations` | Public | Ambil semua variasi / filter by menu_item_id |
| POST | `/api/menu/variations` | owner | Tambah variasi baru |
| PUT | `/api/menu/variations/[id]` | owner | Update variasi |
| DELETE | `/api/menu/variations/[id]` | owner | Hapus variasi |

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
| PATCH | `/api/orders/[id]/status` | cashier | Update status |
| PATCH | `/api/orders/[id]/cancel` | cashier | Cancel order |
| PATCH | `/api/orders/[id]/update-eta` | cashier | Update estimasi waktu |
| PATCH | `/api/orders/[id]/mark-paid` | cashier | Verifikasi bayar cash + antrikan struk |

### Print (Struk Bluetooth)

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/print/jobs?claim=1` | Device token / staff | Ambil & kunci job cetak |
| GET | `/api/print/jobs` | Device token / staff | 50 job terakhir |
| POST | `/api/print/jobs` | Staff | Cetak ulang struk |
| PATCH | `/api/print/jobs/[id]/ack` | Device token / staff | Konfirmasi PRINTED / FAILED |
| POST | `/api/print/jobs/[id]/retry` | Staff | Antrikan ulang job gagal |

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
       ├── QRIS ──→ Scan & bayar → Midtrans settlement
       │              ↓
       │            Order dibuat LUNAS + struk otomatis ke antrian printer
       │
       └── CASH ──→ Order dibuat BELUM BAYAR (langsung masuk dapur)
                      ↓
                    Pelanggan bayar di kasir
                      ↓
                    Kasir klik "Verifikasi & Cetak Struk"
                      ↓
                    Struk masuk antrian printer
       ↓
Aplikasi Android tarik antrian → cetak ke printer Bluetooth
       ↓
Dapur (Kitchen Display) → set ETA → Mulai Proses
       ↓
Countdown berjalan → Update ETA jika perlu
       ↓
Tekan "Sudah Diantar" → SERVED ✅
       ↓
Kasir tekan "Selesai" → order pindah ke History
```

---

## Alur Status Order

Status dapur dan status pembayaran dipisah sejak v2.x:

```
status (dapur):     QUEUED → PROCESSING → SERVED        (atau CANCELLED)
payment_status:     UNPAID → PAID

QUEUED ──(set ETA + mulai proses)──→ PROCESSING
       ↓
PROCESSING ──(countdown berjalan, bisa update ETA)──→ SERVED ✅

QRIS : order lahir langsung PAID (order hanya dibuat setelah Midtrans settle)
CASH : order lahir UNPAID → PAID saat kasir verifikasi

Struk dicetak tepat pada transisi menjadi PAID.
Bisa cancel selama status masih QUEUED → CANCELLED
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
| `http://localhost:3000/dashboard/kitchen` | Kitchen Display (Dapur) | Cashier, Owner |
| `http://localhost:3000/dashboard/printer` | Antrian Printer Struk | Cashier, Owner |
| `http://localhost:3000/dashboard/owner` | Owner Dashboard | Owner |
| `http://localhost:3000/dashboard/qr` | QR Generator | Cashier, Owner |
| `http://localhost:3000/dashboard/history` | Order History | Staff |

---

## Setup Supabase

### Step 1: Buat Project

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Klik **"New Project"**
3. Isi:
   - **Name:** `Rumipang`
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
3. Buat 2 user:

| Email | Password | Role |
|---|---|---|
| `kasir@warkop.com` | `password123` | cashier |
| `owner@warkop.com` | `password123` | owner |

4. Setelah buat user, copy **User ID** (UUID) masing-masing
5. Di **"Table Editor"** → pilih tabel `staff_users` → **"Insert row"**
6. Atau jalankan SQL:

```sql
INSERT INTO staff_users (id, email, name, role) VALUES
  ('UUID_KASIR', 'kasir@warkop.com', 'Kasir 1', 'cashier'),
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
| `cashier@warkop.com` | (set di Auth) | Kasir | Dashboard Kasir, Dapur, Manual Order, Printer, QR Generator, History |

> Role `koki` sudah dihapus sejak v3.0 — Kitchen Display sekarang dipegang kasir.

> Password dikonfigurasi saat membuat user di Supabase Auth Dashboard.

---

## Deployment ke Vercel

### Step 1: Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: Rumipang v2.1"
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
| `MIDTRANS_SERVER_KEY` | Server key Midtrans (`SB-Mid-server-…` untuk sandbox) | Untuk QRIS |
| `MIDTRANS_IS_PRODUCTION` | `false` = sandbox, `true` = produksi | Untuk QRIS |
| `PRINT_DEVICE_TOKEN` | Token aplikasi Android printer (header `x-print-token`) | Untuk printer |
| `RECEIPT_STORE_NAME` | Nama toko di kop struk (default: Rumipang) | Tidak |
| `RECEIPT_STORE_ADDRESS` | Alamat di kop struk | Tidak |
| `RECEIPT_STORE_PHONE` | Nomor telepon di kop struk | Tidak |
| `RECEIPT_FOOTER` | Kalimat penutup struk | Tidak |
| `RECEIPT_COLUMNS` | Lebar struk: `32` (58mm) atau `48` (80mm) | Tidak |

> ⚠️ **PENTING:** Jangan pernah commit `SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`, atau `PRINT_DEVICE_TOKEN` ke repository. Gunakan `.env` lokal dan Vercel environment variables.

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
| Kitchen Display | `/dashboard/kitchen` | Cashier, Owner | Display pesanan + ETA |
| Printer Struk | `/dashboard/printer` | Cashier, Owner | Antrian cetak + pratinjau struk |
| Owner Dashboard | `/dashboard/owner` | Owner | Statistik + kelola menu |
| QR Generator | `/dashboard/qr` | Cashier, Owner | Generate QR per meja |
| Order History | `/dashboard/history` | Staff | Riwayat order |

### API Routes (22 endpoints)

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
| Variations | GET, POST, PUT, DELETE | CRUD variasi menu |
| Upload | POST | Upload gambar ke Storage |
| Health | GET | Health check |
| Payments/midtrans/charge | POST | Buat QRIS Midtrans |
| Payments/midtrans/status | GET | Cek status pembayaran |
| Payments/midtrans/webhook | POST | Notifikasi Midtrans |
| Print/jobs | GET, POST | Antrian cetak + cetak ulang |
| Print/jobs/[id]/ack | PATCH | Konfirmasi hasil cetak |
| Print/jobs/[id]/retry | POST | Antrikan ulang job gagal |

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
| VariationManager | `components/dashboard/` | Kelola variasi menu (CRUD) |
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
- **Persistent customer headers** — All customer pages (checkout, order-success, order-tracking) now have consistent sticky header with "Rumipang" + back button + "Meja X" indicator
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

## Changelog v2.5

### Menu Variations — Kelola Variasi per Menu (6 files)

- **VariationManager component** — Komponen baru untuk kelola variasi menu: tambah, edit, hapus variasi per menu item
- **Variations API** — `GET/POST /api/menu/variations` dan `PUT/DELETE /api/menu/variations/[id]` untuk CRUD variasi
- **Owner dashboard** — Tombol kelola variasi di setiap baris menu, panel inline untuk tambah variasi (grup, label, extra price)
- **Group-based selection** — Customer pilih satu opsi per grup via radio button (misal: Level Pedas, Tambahan, Ukuran)
- **Extra price support** — Setiap opsi variasi bisa punya tambahan harga (Rp0 kalau gratis)

### Owner Dashboard Changes

| Before (v2.4) | After (v2.5) |
|---|---|
| Hanya tambah/edit/hapus menu | Tambah: kelola variasi per menu (tambah/edit/hapus) |
| Menu tanpa variasi | Customer bisa pilih level pedas, ukuran, topping, dll |

### Tech Specs

| Metric | Value |
|---|---|
| Files created | 3 (`VariationManager.tsx`, `variations/route.ts`, `variations/[id]/route.ts`) |
| Files modified | 1 (`owner/page.tsx`) |
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

## Changelog v2.6

### Security Hardening & Bug Fixes (25 files)

#### Critical Security Fixes

- **RLS Policies** — Semua "Staff full access" policy diubah dari `USING (true)` ke `USING (auth.role() = 'authenticated')`. Sebelumnya anonymous user bisa INSERT/UPDATE/DELETE di semua tabel termasuk `orders`, `staff_users`, `activity_logs`.
- **Storage RLS** — Policy upload/update/delete di bucket `menu-images` ditambah `AND auth.role() = 'authenticated'`.
- **Auth on Upload API** — `POST /api/upload` sekarang cek session + staff_users sebelum menerima upload.
- **Order Rollback** — Jika insert `order_items` gagal, `orders` yang sudah dibuat dihapus (cleanup orphaned order). Plus validasi input (`items`, `payment_method`, `total_amount`).

#### Auth Guards — 14 API Endpoints Protected

| Endpoint | Before | After |
|---|---|---|
| `POST /api/upload` | No auth | Cek session + staff role |
| `POST/GET /api/activity-logs` | No auth | Staff only |
| `POST /api/menu` | No auth | Staff only |
| `PUT/DELETE /api/menu/[id]` | No auth | Staff only |
| `PATCH /api/menu/[id]/sold-out` | No auth | Staff only |
| `POST /api/menu/variations` | No auth | Staff only |
| `PUT/DELETE /api/menu/variations/[id]` | No auth | Staff only |
| `GET /api/orders` | No auth | Staff only |
| `GET /api/orders/[id]` | No auth | Staff only |
| `GET /api/orders/history` | No auth | Staff only |
| `PATCH /api/orders/[id]/status` | No auth | Staff only |
| `PATCH /api/orders/[id]/cancel` | No auth | Staff only |
| `PATCH /api/orders/[id]/confirm-cash` | No auth | Staff only |
| `PATCH /api/orders/[id]/confirm-payment` | No auth | Staff only |

#### State Machine Guards

| Endpoint | Fix |
|---|---|
| `PATCH /api/orders/[id]/confirm-cash` | Hanya bisa dari status `PENDING_CASH` |
| `PATCH /api/orders/[id]/confirm-payment` | Hanya bisa dari status `PENDING_PAYMENT` |
| `PATCH /api/orders/[id]/cancel` | Tidak bisa cancel order `SERVED`/`CANCELLED` |
| `PATCH /api/orders/[id]/status` | Auth guard ditambahkan |
| DB Schema | CHECK constraints pada `orders.status` dan `orders.payment_method` |

#### Bug Fixes — Frontend & API

| File | Fix |
|---|---|
| `middleware.ts` | Cashier diblok dari `/dashboard/kitchen` (sebelumnya bisa akses) |
| `kitchen/page.tsx` | Kitchen queue hanya tampil order `CONFIRMED` (sebelumnya termasuk `PENDING_CASH`/`PENDING_PAYMENT`) |
| `update-eta/route.ts` | Update ETA sekarang **extend** dari existing `estimated_ready_at`, bukan overwrite dari `Date.now()` |
| `menu/route.ts` | Input validation: name wajib, price >= 0, whitelist field (anti injection) |
| `menu/[id]/route.ts` | Input validation + whitelist field pada PUT |
| `CartContext.tsx` | SSR-safe: `typeof window === 'undefined'` guard untuk `sessionStorage` |
| `useOrders.ts` | Supabase client di-memoize dengan `useMemo` (sebelumnya recreate tiap render) |
| `useMenu.ts` | Supabase client di-memoize dengan `useMemo` |
| `tables/[number]/route.ts` | Handle `parseInt(NaN)` — return 400 alih-alih error 500 ambigu |
| `order/page.tsx` | Validasi table number bukan NaN sebelum set state |
| `sold-out/route.ts` | Pisahkan `fetchError` dari `!current` (sebelumnya error terswallow) |
| `OrderCard.tsx` | Fallback untuk status tidak dikenal (anti TypeError crash) |
| `history/page.tsx` | `.catch()` handler pada fetch (sebelumnya infinite spinner) |
| `orders/route.ts` GET | Konsisten pakai `.not('status', 'in', '(SERVED,CANCELLED)')` |

#### Tech Specs

| Metric | Value |
|---|---|
| Files modified | 25 |
| Lines added | 275 |
| Lines removed | 51 |
| TypeScript errors | 0 |
| Lint errors (new) | 0 |
| Breaking changes | None |

---

## Changelog v2.7

### Schema Compatibility & Error Handling (22 files)

#### Database Schema Alignment
- **Tabel `categories`** — App diupdate dari `menu_categories` ke `categories` untuk kompatibilitas dengan skema database existing
- **Kolom `variation_type`** — Semua kode diupdate dari `group_name` ke `variation_type` (4 file: types, API, VariationManager, MenuItemSheet, CartContext)
- **Complete schema SQL** — File `scripts/complete-schema.sql` berisi full DDL + seed + auth users untuk setup dari nol

#### Error Handling Hardening

| File | Fix |
|---|---|
| `cashier/page.tsx` | try/catch di `handleConfirmCash`, `handleConfirmPayment`, `handleCancel` + toast error |
| `cashier/new-order/page.tsx` | try/catch di `handleSubmit` + CartItem type fix (`variations: never[]`) |
| `qr/page.tsx` | Error handling pada fetch + remove `any` types + modern base64 encoding (replace deprecated `unescape`) |
| `login/page.tsx` | `loading` state di-reset dengan `finally` block (sebelumnya stuck forever setelah login sukses) |
| `owner/page.tsx` | (pre-existing) `Date.now()` in render identified |

#### Stability & Performance

| File | Fix |
|---|---|
| `AuthContext.tsx` | Supabase client di-memoize dengan `useMemo` (sebelumnya recreate tiap render → potensi infinite loop) |
| `ProtectedRoute.tsx` | `allowedRoles` di-reference via `useRef` string key (sebelumnya array baru tiap render → redirect loop) |
| `useCountdown.ts` | Guard `isNaN(target)` untuk mencegah NaN countdown di UI |
| `utils.ts` | `getElapsedMinutes` guard `isNaN(then.getTime())` return 0 |
| `checkout/page.tsx` | Hydration fix: `mounted` state untuk `tableNumber` dari sessionStorage |
| `CartDrawer.tsx` | Stable key `menu_item.id + '-' + index` (sebelumnya index-only) |

#### Logout Fix
- **`DashboardLayout.tsx`** — `handleLogout` dengan loading state + redirect `router.push('/login')` setelah signOut (sebelumnya tidak ada redirect → user stuck di dashboard setelah logout)
- **`AuthContext.tsx`** — `signOut` dengan try/catch error handling

#### Kitchen Fix — `.single()` → `.maybeSingle()` + Error Handling
- **14 API route files** — `requireAuth()` diganti `.maybeSingle()` (sebelumnya crash "Cannot coerce to single JSON object" jika staff_user tidak ditemukan → kitchen gagal proses order + loading stuck forever)
- **`kitchen/page.tsx`** — `handleStartProcess`, `handleUpdateEta`, `handleServed` + try/catch + error toast (sebelumnya silent failure → loading spinner stuck tanpa pesan error)

#### Test Results

| Category | Passed |
|---|---|
| API Endpoints (public) | 11/11 |
| Auth Guards (no cookie = 401) | 14/14 |
| Login (kasir/koki/owner) | 3/3 |
| Order Creation | OK |
| TypeScript | 0 errors |

#### Tech Specs

| Metric | Value |
|---|---|
| Files modified | 24 |
| Schema SQL | `scripts/complete-schema.sql` |
| TypeScript errors | 0 |
| Breaking changes | None |

---

## Changelog v2.8

### Hydration Fix — Checkout Page (1 file)

- **SSR hydration mismatch pada checkout** — Server merender empty cart state (`items.length === 0` karena `sessionStorage` tidak tersedia di server), sementara client merender checkout UI (items dari `sessionStorage`). Akibat: error `Hydration failed because the server rendered HTML didn't match the client`.
- **`!mounted` guard** — Guard tambahan di awal render: jika `!mounted`, tampilkan skeleton loading yang identik di server dan client. Setelah `useEffect` mount, baru render content sesungguhnya berdasarkan `items.length`.
- **Redundant check removal** — Hapus `{mounted &&` di header main return karena di titik tersebut `mounted` sudah pasti `true`.

### Tech Specs

| Metric | Value |
|---|---|
| Files modified | 1 (`app/(customer)/checkout/page.tsx`) |
| TypeScript errors | 0 |
| Build | Passed |
| Breaking changes | None |

---

## Changelog v2.9

### Owner: Hapus Menu, Reset Data & Hapus Riwayat (5 files)

#### Hapus Menu — Owner Dashboard
- **Tombol hapus per menu** — Icon `Trash2` di action bar Kelola Menu, dengan konfirmasi modal sebelum hapus
- **`DELETE /api/menu/[id]`** — API sudah ada, tombol UI yang sebelumnya hilang sekarang tersedia
- Variasi ikut terhapus (CASCADE), order lama tetap ada (menu_item_id jadi NULL)

#### Hapus Riwayat — History Page
- **Hapus satu order** — Tombol `Trash2` per baris di tabel riwayat, dengan konfirmasi modal
- **Hapus semua riwayat** — Tombol "Hapus Semua" di header, hapus semua order SERVED + CANCELLED
- **`DELETE /api/orders/[id]`** — API baru: hanya bisa hapus order SERVED/CANCELLED (tolak order aktif)
- **`DELETE /api/orders/history`** — API baru: bulk hapus semua SERVED + CANCELLED

#### Reset Semua Data — Owner Dashboard
- **Tombol "Reset Semua Data"** — Di section Rekap Penjualan, dengan double-confirmation modal
- **`DELETE /api/orders/reset`** — API baru: hapus semua order (aktif + riwayat) + activity log. Menu, meja, kategori, variasi, dan staff **tidak** ikut terhapus
- Hanya owner yang bisa akses (role guard di API)

#### UI Safety
- Semua aksi hapus pakai **modal konfirmasi** (bukan `window.confirm`)
- Loading state + disable button saat proses berjalan
- Toast success/error untuk setiap aksi

### Tech Specs

| Metric | Value |
|---|---|
| Files created | 1 (`app/api/orders/reset/route.ts`) |
| Files modified | 4 (`owner/page.tsx`, `history/page.tsx`, `orders/[id]/route.ts`, `orders/history/route.ts`) |
| New API endpoints | 3 (`DELETE /api/orders/[id]`, `DELETE /api/orders/history`, `DELETE /api/orders/reset`) |
| TypeScript errors | 0 |
| Build | Passed |
| Breaking changes | None |

---

## Changelog v3.0

### Hapus Role Koki + Cetak Struk ke Printer Bluetooth

**Breaking change** — jalankan dua migrasi SQL sebelum deploy:

```sql
-- 1. Hapus role koki (user koki lama otomatis jadi cashier)
scripts/remove-koki-role.sql
-- 2. Tabel antrian cetak struk
scripts/create-print-jobs.sql
```

#### Role koki dihapus

| Sebelum | Sesudah |
|---|---|
| 3 role: cashier, koki, owner | 2 role: cashier, owner |
| Koki dikunci hanya di `/dashboard/kitchen` | Kasir & owner punya menu **Dapur** ke halaman yang sama |
| `staff_users.role CHECK (cashier, koki, owner)` | `CHECK (cashier, owner)` |

Migrasi memindahkan user `koki` yang sudah ada menjadi `cashier`, jadi akun lama
tetap bisa login. Riwayat `activity_logs` dengan `actor_role = 'koki'` dibiarkan
apa adanya.

#### Alur cetak struk

```
QRIS  -> pelanggan scan & bayar
      -> Midtrans settlement (webhook / status poll)
      -> order dibuat LUNAS + print job otomatis   [trigger: QRIS_SETTLED]
      -> aplikasi Android tarik job -> cetak Bluetooth

CASH  -> pelanggan checkout (order masuk dapur, status BELUM BAYAR)
      -> pelanggan bayar di kasir
      -> kasir klik "Verifikasi & Cetak Struk"
      -> print job dibuat                          [trigger: CASH_VERIFIED]
      -> aplikasi Android tarik job -> cetak Bluetooth
```

Struk **tidak pernah** dicetak untuk order yang belum lunas.

#### Endpoint baru

| Method | Endpoint | Auth | Fungsi |
|---|---|---|---|
| GET | `/api/print/jobs?claim=1&limit=5` | Token perangkat / staff | Ambil & kunci job PENDING jadi PRINTING |
| GET | `/api/print/jobs` | Token perangkat / staff | 50 job terakhir untuk monitoring |
| POST | `/api/print/jobs` | Staff | Cetak ulang struk sebuah order |
| PATCH | `/api/print/jobs/[id]/ack` | Token perangkat / staff | Konfirmasi PRINTED / FAILED |
| POST | `/api/print/jobs/[id]/retry` | Staff | Kembalikan job gagal ke antrian |

#### Env baru

```env
PRINT_DEVICE_TOKEN=          # token aplikasi Android (header x-print-token)
RECEIPT_STORE_NAME=Rumipang
RECEIPT_STORE_ADDRESS=
RECEIPT_STORE_PHONE=
RECEIPT_FOOTER=Terima kasih atas kunjungan Anda!
RECEIPT_COLUMNS=32           # 32 = kertas 58mm, 48 = 80mm
```

#### Testing QRIS (Midtrans Sandbox)

```bash
npm run test:qris:direct   # cek server key & aktivasi QRIS (tanpa perlu app jalan)

npm run dev                # terminal 1
npm run test:qris          # terminal 2 — end-to-end sampai struk masuk antrian
```

Script mencetak `qr_string` + link QR. Bayar di simulator sandbox Midtrans
(<https://simulator.sandbox.midtrans.com/qris/index>), lalu script akan polling
sampai lunas dan menampilkan isi struk yang masuk antrian printer.

Prasyarat sandbox: `MIDTRANS_SERVER_KEY` diawali `SB-Mid-server-`,
`MIDTRANS_IS_PRODUCTION=false`, dan Payment Notification URL di dashboard
Midtrans diarahkan ke `<domain>/api/payments/midtrans/webhook`.

#### Tech Specs

| Metric | Value |
|---|---|
| Files created | 8 (`lib/receipt.ts`, `lib/print.ts`, 3 route printer, `dashboard/printer/page.tsx`, 2 SQL migrasi) |
| Files modified | 13 |
| Tabel baru | `print_jobs` |
| Anti dobel-cetak | Unique index `print_jobs (order_id) WHERE kind='RECEIPT'` |
| Lebar struk | 32 kolom (58mm), konfigurabel |
| TypeScript errors | 0 |
| Build | Passed |
| Breaking changes | Role `koki` dihapus — perlu migrasi SQL |

---

## Developer

**Ricky Rudiansyah** — BINUS University, Research Track AI & Robotika

---

## License

MIT License — bebas digunakan dan dimodifikasi.







