# Rumipang Ordering System v3.2

> Sistem pemesanan digital berbasis QR Code untuk warung/kafe — customer scan, pilih menu, bayar (Cash atau QRIS otomatis), tanpa antri ke kasir. Struk lunas otomatis cetak ke printer Bluetooth.

![Tech Stack](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase)
![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-06B6D4?style=flat-square&logo=tailwindcss)
![Payment](https://img.shields.io/badge/Payment-Midtrans%20QRIS-1A4FA0?style=flat-square)
![Printer](https://img.shields.io/badge/Printer-Bluetooth%20ESC%2FPOS-555?style=flat-square)
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
- [Alur Pembayaran QRIS (Midtrans)](#alur-pembayaran-qris-midtrans)
- [Fitur Lokasi (Geolocation Gate)](#fitur-lokasi-geolocation-gate)
- [Environment Variables](#environment-variables)
- [Cara Menjalankan Lokal](#cara-menjalankan-lokal)
- [Setup Supabase](#setup-supabase)
- [Login Staff](#login-staff)
- [Deployment (Docker)](#deployment-docker)
- [Riwayat Versi](#riwayat-versi)
- [Changelog v2.1](#changelog-v21)
- [Changelog v2.2](#changelog-v22)
- [Changelog v2.3](#changelog-v23)
- [Changelog v2.4](#changelog-v24)
- [Changelog v2.5](#changelog-v25)
- [Changelog v2.6](#changelog-v26)
- [Changelog v2.7](#changelog-v27)
- [Changelog v2.8](#changelog-v28)
- [Changelog v2.9](#changelog-v29)
- [Changelog v3.0](#changelog-v30)
- [Changelog v3.1](#changelog-v31)
- [Changelog v3.2](#changelog-v32)
- [Developer](#developer)

---

## Overview

Rumipang Ordering adalah sistem pemesanan digital berbasis QR Code untuk warung/kafe skala kecil–menengah. Customer scan **satu QR umum**, pilih meja saat checkout, pilih menu, lalu bayar via **Cash** (bayar di kasir) atau **QRIS** (otomatis terdeteksi tanpa konfirmasi kasir). Staff (kasir, owner) mengelola pesanan lewat dashboard masing-masing, dan struk pembayaran yang lunas otomatis dicetak ke printer thermal Bluetooth lewat aplikasi Android companion.

Dibangun **full Next.js 16** (App Router + API Routes sebagai backend) — 1 repo, 1 deploy. Database, Auth, Realtime, dan Storage memakai Supabase.

### Konsep Kunci v3.x

- **Satu QR umum** untuk seluruh kafe (bukan per-meja). Nomor meja dipilih customer saat checkout.
- **Pemisahan status dapur & status bayar.** `status` (dapur) = `QUEUED → PROCESSING → SERVED`; `payment_status` = `PAID | UNPAID`.
- **QRIS otomatis** lewat gateway **Midtrans** — order baru masuk dapur setelah pembayaran benar-benar terkonfirmasi (verifikasi server-side).
- **Dua role staff** — `cashier` & `owner`. Role `koki` sudah dihapus; Kitchen Display sekarang dipegang kasir & owner lewat menu **Dapur**.
- **Struk otomatis ke printer Bluetooth** — begitu sebuah order jadi `PAID` (QRIS settle atau kasir verifikasi cash), struknya masuk antrian dan ditarik aplikasi Android companion.
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
| Checkout | Pilih meja **atau Take Away** + metode bayar + persetujuan (tidak bisa dibatalkan) |
| Take Away | Pesanan dibungkus, tanpa nomor meja — dipilih dari lembar "Pilih Nomor Meja" atau dropdown checkout |
| Bayar Cash | Order langsung dibuat `UNPAID`, bayar di kasir |
| Bayar QRIS | Kode QRIS Midtrans tampil di checkout → scan → **otomatis terdeteksi** → order masuk + struk tercetak. Bisa dimatikan lewat `NEXT_PUBLIC_QRIS_ENABLED=false` |
| Lacak pesanan | Lacak seluruh order 1 meja secara realtime + ETA countdown |
| Dark mode | Toggle tema terang/gelap |

### Kasir

| Fitur | Deskripsi |
|---|---|
| Board per meja | Order aktif dikelompokkan per meja, tiap order tampil status bayar sendiri |
| Realtime updates | Update order via Supabase Realtime |
| Verifikasi bayar cash | Tombol **"Verifikasi & Cetak Struk"** — ubah `UNPAID → PAID` sekaligus antrikan struk ke printer |
| Cancel order | Batalkan order yang masih `QUEUED` (belum diproses) |
| Arsip otomatis (QRIS) | Order QRIS yang lunas pindah sendiri ke history (v3.2) |
| Selesai (arsip) — tunai | Order tunai dipindahkan kasir lewat tombol "Selesai", saat semua `SERVED` + `PAID` |
| Manual order (POS) | Input order manual + cari menu, filter kategori, muat ulang katalog |
| Cetak ulang struk | Tombol printer di kartu order (khusus order yang sudah lunas) |
| QR Generator | Generate + download satu QR umum kafe |
| Order history | Riwayat order (arsip + dibatalkan) |
| Activity logging | Aktivitas kasir tercatat di database |

### Kitchen Display (dipegang Kasir)

> Sejak v3.1 role `koki` dihapus. Halaman Dapur diakses kasir & owner lewat menu **Dapur**.

| Fitur | Deskripsi |
|---|---|
| Kitchen display | Ticket pesanan realtime |
| Set ETA | Estimasi waktu (5–30 menit) saat mulai proses |
| Countdown + warna | Hijau > 3 mnt, kuning < 3 mnt, merah + pulse jika overdue |
| Update ETA | Perpanjang estimasi saat proses berjalan |
| Mulai Proses / Sudah Diantar | `QUEUED → PROCESSING → SERVED` |
| Badge pembayaran | Menampilkan Lunas / Belum Bayar |
| Pengelompokan | Antrian vs Sedang Diproses |
| Activity logging | Log aktivitas tercatat di database |

### Printer Struk (Bluetooth)

| Fitur | Deskripsi |
|---|---|
| QRIS auto-print | Struk otomatis masuk antrian cetak begitu pembayaran QRIS settle (Midtrans) |
| Cash butuh verifikasi | Struk baru dicetak setelah kasir menekan "Verifikasi & Cetak Struk" |
| Antrian cetak | Halaman `/dashboard/printer` — status job, pratinjau struk, cetak ulang |
| Anti dobel-cetak | Satu struk otomatis per order (unique index), aman dari webhook + poll bersamaan |
| Auto-requeue | Job yang tidak di-ACK aplikasi Android dalam 2 menit kembali ke antrian |
| Cetak ulang | Tombol printer di kartu order (khusus order lunas) |

> Detail kontrak integrasi aplikasi Android: [`docs/BLUETOOTH-PRINTER.md`](docs/BLUETOOTH-PRINTER.md)
>
> Spesifikasi aplikasi kasir Flutter (menggantikan dashboard kasir + jembatan
> printer): [`docs/FLUTTER-KASIR-APP.md`](docs/FLUTTER-KASIR-APP.md)

### Owner

| Fitur | Deskripsi |
|---|---|
| Statistik | Pendapatan, total order, rata-rata per order, cancel rate |
| Top menu terlaris | Ranking menu dengan badge emas/perak/perunggu |
| Rekap penjualan | Filter Hari Ini / 7 Hari / Semua |
| Kelola menu | Tambah/edit/hapus menu, upload gambar, toggle sold out |
| Kelola variasi | CRUD variasi per menu (grup + label + extra price) |
| Order history | Lihat + hapus riwayat (satu / per hari / per bulan / per tahun / semua) |
| Reset data | Hapus semua order + activity log (menu/meja/staff aman) |

### Auth & Session

| Fitur | Deskripsi |
|---|---|
| Login terpusat | Semua staff login di `/login`, auto-redirect sesuai role |
| Proteksi server-side | `middleware.ts` + `getUser()` (validasi ke auth server) di setiap API |
| Role-based access | Cashier & Owner dengan akses berbeda |
| Session persisten | Session persisten via Supabase Auth cookie |
| Logout | Logout dari semua halaman |

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
| Payment (QRIS) | **Midtrans** — provider aktif, dipakai checkout customer. Mayar (`lib/mayar.ts`) masih ada di repo tapi **tidak dipanggil** |
| Printer | Thermal Bluetooth (ESC/POS, 58mm/32-kolom) via aplikasi Android companion |
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
│   │   ├── checkout/page.tsx                 # Checkout: meja/take away, bayar, QRIS Midtrans
│   │   ├── order-success/page.tsx            # Konfirmasi sukses
│   │   └── order-tracking/page.tsx           # Lacak pesanan per meja (realtime)
│   ├── (staff)/                             # Route group staff
│   │   ├── login/page.tsx                    # Staff login
│   │   └── dashboard/
│   │       ├── cashier/page.tsx              # Board kasir (grup per meja)
│   │       ├── cashier/new-order/page.tsx    # Manual order (POS)
│   │       ├── kitchen/page.tsx              # Kitchen display / Dapur (ETA)
│   │       ├── printer/page.tsx              # Antrian cetak struk + pratinjau
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
│   │   ├── orders/[id]/mark-paid/route.ts    # PATCH UNPAID→PAID + antrikan struk
│   │   ├── orders/[id]/archive/route.ts      # PATCH is_archived=true (Selesai)
│   │   ├── orders/[id]/cancel/route.ts       # PATCH cancel
│   │   ├── orders/[id]/track/route.ts        # GET tracking 1 order (public)
│   │   ├── orders/[id]/update-eta/route.ts   # PATCH update ETA
│   │   ├── payments/mayar/*                  # Provider Mayar — TIDAK DIPAKAI
│   │   ├── payments/midtrans/charge/route.ts # POST buat charge QRIS (dipakai script test sandbox)
│   │   ├── payments/midtrans/status/route.ts # GET poll status Midtrans
│   │   ├── payments/midtrans/webhook/route.ts# POST notifikasi Midtrans
│   │   ├── print/jobs/route.ts               # GET (claim/monitor), POST cetak ulang
│   │   ├── print/jobs/[id]/ack/route.ts      # PATCH konfirmasi hasil cetak
│   │   ├── print/jobs/[id]/retry/route.ts    # POST antrikan ulang job gagal
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
│   │   ├── OrderCard.tsx                     # Kartu order + ETA + badge bayar + cetak ulang
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
│   ├── mayar.ts                              # Provider Mayar — TIDAK DIPAKAI (lihat catatan provider)
│   ├── midtrans.ts                           # Provider Midtrans + settleIntent (shared, memicu cetak struk)
│   ├── print.ts                              # Antrian cetak: enqueue, klaim job, auth perangkat
│   ├── receipt.ts                            # Bentuk struk (JSON + teks ESC/POS)
│   └── utils.ts                              # formatCurrency, cn, dll
├── types/index.ts · database.ts             # TypeScript interfaces
├── docs/
│   └── BLUETOOTH-PRINTER.md                  # Kontrak integrasi aplikasi Android printer
├── scripts/
│   ├── complete-schema.sql                   # Full DDL + seed + auth
│   ├── migrate-payment-flow.sql              # Migrasi status/payment_status/method
│   ├── create-payment-intents.sql            # Tabel payment_intents (QRIS)
│   ├── remove-koki-role.sql                  # Hapus role koki (migrasi ke cashier)
│   ├── create-print-jobs.sql                 # Tabel print_jobs (antrian cetak)
│   ├── test-qris-sandbox.mjs                 # Uji QRIS end-to-end via Midtrans sandbox
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
  qr_string TEXT, qr_url TEXT,    -- qr_string = QRIS Midtrans yang dirender klien
  cart JSONB,                     -- payload order (dibuat jadi order saat lunas)
  order_id UUID → orders,
  midtrans_transaction_id TEXT,   -- id transaksi Midtrans
  created_at TIMESTAMPTZ, paid_at TIMESTAMPTZ
)

staff_users ( id UUID PK, email UNIQUE, name, role CHECK(cashier|owner), is_active, created_at )

-- Antrian cetak struk ke printer Bluetooth
print_jobs (
  id UUID PK,
  order_id UUID → orders (ON DELETE CASCADE),
  kind      TEXT,   -- RECEIPT | REPRINT
  status    TEXT,   -- PENDING | PRINTING | PRINTED | FAILED
  trigger   TEXT,   -- QRIS_SETTLED | CASH_VERIFIED | CASHIER_PAID_ORDER | STAFF_REPRINT
  payload   JSONB,  -- snapshot struk terstruktur
  text_body TEXT,   -- teks siap kirim ke printer ESC/POS
  attempts INT, last_error TEXT, device_id TEXT,
  created_at TIMESTAMPTZ, claimed_at TIMESTAMPTZ, printed_at TIMESTAMPTZ
)
-- UNIQUE (order_id) WHERE kind = 'RECEIPT'  -> anti dobel-cetak

activity_logs ( id UUID PK, actor_email, actor_role, action, target_type, target_id, detail JSONB, created_at )
```

> **Migrasi (urutan):** `scripts/migrate-payment-flow.sql` + `scripts/create-payment-intents.sql` (status split & QRIS) → `scripts/remove-koki-role.sql` (hapus role koki) → `scripts/create-print-jobs.sql` (antrian printer). Untuk fitur "Selesai" kasir: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;`

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
| DELETE | `/api/orders/history` | staff | Hapus history — seluruhnya, atau `?from=&to=` (ISO-8601 ber-offset, `from` inklusif · `to` eksklusif) |
| DELETE | `/api/orders/reset` | owner | Reset semua order + log |
| POST | `/api/orders` | Public | Buat order (Cash langsung; QRIS lewat settle) |
| GET | `/api/orders/[id]` · DELETE | staff | Detail / hapus order |
| GET | `/api/orders/[id]/track` | Public | Tracking 1 order |
| GET | `/api/orders/table-track?tableId=` | Public | Tracking semua order 1 meja |
| PATCH | `/api/orders/[id]/status` | staff | QUEUED→PROCESSING→SERVED (+ETA) |
| PATCH | `/api/orders/[id]/mark-paid` | staff | UNPAID→PAID + antrikan struk + arsip otomatis |
| PATCH | `/api/orders/[id]/archive` | staff | is_archived=true (arsip manual; sejak v3.2 jarang dipakai) |
| PATCH | `/api/orders/[id]/cancel` | staff | Cancel (tolak jika SERVED/CANCELLED) |
| PATCH | `/api/orders/[id]/update-eta` | staff | Perpanjang ETA |

### Print (Struk Bluetooth)

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/print/jobs?claim=1&limit=5` | Token perangkat / staff | Ambil & kunci job PENDING jadi PRINTING |
| GET | `/api/print/jobs` | Token perangkat / staff | 50 job terakhir untuk monitoring |
| POST | `/api/print/jobs` | Staff | Cetak ulang struk sebuah order |
| PATCH | `/api/print/jobs/[id]/ack` | Token perangkat / staff | Konfirmasi PRINTED / FAILED |
| POST | `/api/print/jobs/[id]/retry` | Staff | Kembalikan job gagal ke antrian |

### Payments — Midtrans (AKTIF, dipakai checkout customer)

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/payments/midtrans/charge` | Public | Buat charge QRIS → `qr_string` + `qr_url`. **Ini yang dipanggil checkout pelanggan** |
| GET | `/api/payments/midtrans/status?intentId=` | Public | Poll status (settle → buat order PAID + antrikan struk) |
| POST | `/api/payments/midtrans/webhook` | Public | Notifikasi Midtrans |

> `settleIntent()` di `lib/midtrans.ts` yang membuat order + mengantrikan struk begitu pembayaran settle. Dipanggil dari **polling status** maupun **webhook**, dan idempoten — jadi keduanya boleh menang duluan tanpa membuat order ganda.

### Payments — Mayar (ADA DI REPO, TIDAK DIPAKAI)

`lib/mayar.ts` dan `app/api/payments/mayar/*` masih ada, tapi **checkout tidak
pernah memanggilnya** — [`checkout/page.tsx`](app/(customer)/checkout/page.tsx)
memanggil `midtrans/charge` dan `midtrans/status`. Anggap sebagai provider
cadangan yang belum dicabut, bukan jalur yang hidup.

> Sampai v3.2 README ini menulis Mayar sebagai provider aktif. Itu **salah** —
> dan sempat berakibat nyata: sakelar `NEXT_PUBLIC_QRIS_ENABLED` pertama kali
> dipasang di route Mayar, sehingga UI-nya mati tapi endpoint yang sebenarnya
> dipakai pelanggan tidak terjaga sama sekali.

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
 ┌─ CASH ────────────────→ Order dibuat UNPAID + QUEUED (langsung masuk dapur)
 │                              ↓
 │                         Pelanggan bayar di kasir
 │                              ↓
 │                         Kasir klik "Verifikasi & Cetak Struk" → PAID
 │                              ↓
 │                         Struk masuk antrian printer
 │
 └─ QRIS (Midtrans) ─────→ Kode QRIS tampil → scan & bayar
                              ↓ (poll otomatis / webhook)
                           Terkonfirmasi → Order dibuat PAID + QUEUED
                              ↓
                           Struk otomatis masuk antrian printer
      ↓
Aplikasi Android tarik antrian printer → cetak ke printer Bluetooth
      ↓
Dapur: QUEUED → (set ETA) PROCESSING → SERVED
      ↓
QRIS  lunas  → order pindah sendiri ke History (tanpa tombol, v3.2)
Tunai lunas  → kasir tekan "Selesai" → pindah ke History
```

---

## Alur Status Order

```
QUEUED ──(set ETA + mulai proses)──→ PROCESSING ──(sudah diantar)──→ SERVED
   │                                                                  │
   └────────────(kasir cancel, hanya saat QUEUED)───→ CANCELLED       │
                                                                       ↓
              QRIS  → is_archived=true otomatis          → HISTORY
                             Tunai → kasir tekan "Selesai" → is_archived=true → HISTORY
```

| Status | Deskripsi | Aksi |
|---|---|---|
| `QUEUED` | Masuk antrian dapur | Mulai Proses (ETA), Cancel, Verifikasi Bayar (jika UNPAID) |
| `PROCESSING` | Sedang dimasak | Sudah Diantar, Update ETA |
| `SERVED` | Sudah diantar | Verifikasi Bayar (jika UNPAID). Lunas: QRIS → arsip otomatis · Tunai → tombol "Selesai" |
| `CANCELLED` | Dibatalkan | — (masuk history) |

Pembayaran: `UNPAID` (Cash belum dibayar) · `PAID` (QRIS lunas otomatis / kasir verifikasi). Struk dicetak tepat pada transisi menjadi `PAID`.

---

## Alur Pembayaran QRIS (Midtrans)

> **Status: AKTIF di produksi** sejak 7 Agustus 2026, lewat **Snap** —
> bukan Core API. Transaksinya uang asli.

### Kenapa Snap, bukan Core API

Akun produksi ini hanya diberi akses **Snap**. `POST /v2/charge` (Core API)
membalas `402 Payment channel is not activated` untuk **setiap** payment_type:

| Percobaan | Hasil |
|---|---|
| Snap `POST /snap/v1/transactions` | **201, token + redirect_url** ✅ |
| Core API `qris` (acquirer gopay / tanpa acquirer / airpay shopee) | 402 |
| Core API `gopay` | 402 |
| Core API `bank_transfer` (BCA VA) | 402 |
| Core API `echannel` (Mandiri Bill) | 402 |

Kuncinya ada di dua baris terakhir: **BCA VA dan Mandiri juga ditolak.** Kalau
masalahnya channel QRIS, keduanya seharusnya lolos. Jadi yang belum dibuka itu
**akses Core API**-nya, bukan QRIS — Midtrans memang memberi Snap secara default
dan menyaratkan pengajuan terpisah untuk Core API.

Salah membaca gejala ini mahal: kalau disimpulkan "QRIS belum aktif", yang
diajukan ke Midtrans adalah hal yang salah, dan penantiannya sia-sia. Uji satu
channel non-QRIS lebih dulu sebelum menyimpulkan.

Yang berganti hanya cara QR sampai ke pelanggan:

| | Core API (dulu) | Snap (sekarang) |
|---|---|---|
| QR | `qr_string` dirender `qrcode.react` di halaman kita | halaman `app.midtrans.com`, dibuka di tab baru |
| `order_id` ke Midtrans | `intent.id` | **`intent.id`** — sengaja sama |
| Polling status | `GET /v2/{order_id}/status` | **sama persis** |
| `settleIntent`, webhook, cetak struk | — | **tidak berubah sama sekali** |

`order_id` sengaja tetap `intent.id` supaya seluruh rantai sesudah pembayaran —
status, settle, webhook, antrian printer — tidak perlu tahu providernya
berganti. Halaman Snap dibuka di **tab baru** agar polling di tab checkout tetap
hidup; begitu pembayaran masuk, tab checkout sendiri yang pindah ke
order-success.

Kalau nanti Midtrans membuka Core API, `midtransChargeQris()` masih ada di
[lib/midtrans.ts](lib/midtrans.ts) dan tinggal ditukar kembali.

Order **tidak** dibuat sampai pembayaran benar-benar terkonfirmasi, jadi tidak ada "order hantu" belum bayar di dapur.

```
1. Customer pilih QRIS → POST /api/payments/midtrans/charge
2. Server buat payment_intent (PENDING) + transaksi Snap (enabled_payments:
   other_qris, expiry 15 menit) → dapat token + redirect_url
3. Customer klik "Buka Halaman QRIS" (tab baru) → scan & bayar di halaman
   Midtrans (OVO/DANA/GoPay/bank apa pun)
4. App polling GET /api/payments/midtrans/status?intentId= tiap 3 detik
      → server cek GET https://api.midtrans.com/v2/{order_id}/status
      → settlement/capture? settleIntent() buat order PAID + SERVED (idempoten)
        + antrikan struk
5. App redirect ke order-success → struk tercetak di printer Bluetooth
```

- **Deteksi otomatis** lewat polling (jalan di lokal & produksi) + webhook (cadangan di produksi).
- **Keamanan:** webhook Midtrans tidak dipercaya sendiri — selalu diverifikasi ulang lewat status API terautentikasi sebelum settle.
- **Idempoten:** `settleIntent` memakai conditional lock `PENDING → PAID`, jadi polling + webhook tidak akan membuat order ganda atau struk ganda.

### Memastikan kunci Midtrans sah tanpa membuat transaksi

Kesalahan paling sering saat pindah sandbox ↔ produksi adalah kunci dan flag
tidak diganti bersamaan. Cek tanpa menyentuh uang — `GET /v2/<uuid-acak>/status`
hanya membaca:

```bash
curl -s -u "$MIDTRANS_SERVER_KEY:" https://api.midtrans.com/v2/$(uuidgen)/status
```

| Balasan | Artinya |
|---|---|
| `404 Transaction doesn't exist` | kunci **sah** untuk lingkungan itu |
| `401 Unknown Merchant server_key/id` | kunci ditolak — salah kunci, atau salah lingkungan |

Kunci yang sah **belum berarti QRIS bisa dipakai.** Keduanya terpisah:

| Gejala | Artinya | Yang harus dilakukan |
|---|---|---|
| `401 Unknown Merchant server_key/id` | autentikasi gagal | ganti kunci **dan** `MIDTRANS_IS_PRODUCTION` bersamaan |
| `402 Payment channel is not activated` | kunci sah, tapi channel/API itu tidak dibuka untuk akun tsb. **Uji `bank_transfer` juga** — kalau ikut 402, yang belum dibuka adalah akses **Core API**, bukan QRIS | pakai Snap (sudah dilakukan), atau ajukan Core API ke Midtrans |
| Snap `token` / `qr_string` terbit | gateway benar-benar hidup | boleh set `NEXT_PUBLIC_QRIS_ENABLED=true` |

Aktivasi **sandbox tidak otomatis berlaku di produksi**, dan sebaliknya. Akun
produksi yang baru biasanya perlu pengajuan + persetujuan Midtrans lebih dulu.

> **Awas komentar inline di `.env`.** `MIDTRANS_SERVER_KEY=Mid-server-xxx #Production`
> dibaca Next.js sebagai kunci saja (komentarnya dibuang), tapi skrip yang
> memotong di tanda `=` akan ikut membawa ` #Production` dan menghasilkan 401
> palsu — yang dicurigai jadi kuncinya, bukan pembacanya. Semua script CLI
> karena itu memakai [`scripts/load-env.mjs`](scripts/load-env.mjs) bersama,
> yang membuang komentar inline persis seperti dotenv.

### Menguji QRIS di produksi (uang asli)

`npm run test:qris` **menolak jalan** saat `MIDTRANS_IS_PRODUCTION=true` — itu
pengaman, bukan kerusakan: script sandbox membayar lewat simulator, dan
simulator tidak berlaku di produksi. **Jangan** menyetel
`MIDTRANS_IS_PRODUCTION=false` untuk menembusnya; kunci produksi akan ditolak
401, dan kalau lupa dikembalikan, checkout pelanggan ikut mati.

Untuk produksi ada script terpisah dengan pengaman yang dibalik:

```bash
npm run test:qris:prod                                    # hanya menampilkan peringatan
node scripts/test-qris-production.mjs --yes-real-money    # benar-benar jalan
node scripts/test-qris-production.mjs --yes-real-money --amount=1000
```

| Pengaman | Alasan |
|---|---|
| Menuntut `MIDTRANS_IS_PRODUCTION=true` | kebalikan script sandbox — tidak mungkin tertukar |
| Menuntut `NEXT_PUBLIC_QRIS_ENABLED=true` | kalau tidak, endpoint charge membalas 503 |
| Menolak kunci `SB-…` | sandbox key + IS_PRODUCTION=true = 401 yang membingungkan |
| Wajib `--yes-real-money` | tidak bisa jalan karena salah ketik |
| Default Rp 1.000, `table_id: null` | nominal kecil, dan tidak menempati meja yang mungkin sedang dipakai |

**Berhenti di tengah pun sudah berguna.** Begitu QR muncul, tiga hal yang paling
sering rusak sudah terbukti: kredensial produksi diterima, QRIS aktif di akun
Midtrans, dan endpoint charge aplikasi jalan. Tekan Ctrl+C di situ — tagihan
yang tidak dibayar kedaluwarsa sendiri dan tidak pernah menjadi order.

Kalau diteruskan sampai dibayar dengan e-wallet asli, script memverifikasi
sisanya: order terbentuk, lalu struknya benar-benar masuk antrian printer.
Order hasil uji ini QRIS + lunas, jadi **langsung masuk Riwayat**, bukan board
kasir — hapus dari sana kalau mengganggu.

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
| `NEXT_PUBLIC_QRIS_ENABLED` | `true` = QRIS pelanggan aktif. **Default mati** — checkout menampilkan "Belum tersedia" dan endpoint create menolak 503 | Tidak |
| `MIDTRANS_SERVER_KEY` | Server key Midtrans — **provider aktif**. `SB-Mid-server-…` sandbox, `Mid-server-…` produksi | Untuk QRIS |
| `MIDTRANS_IS_PRODUCTION` | `false` = sandbox, `true` = produksi (uang asli) | Untuk QRIS |
| `MAYAR_API_KEY` / `MAYAR_IS_PRODUCTION` | Provider Mayar — **tidak dipakai**, checkout tidak pernah memanggilnya | Tidak |
| `PRINT_DEVICE_TOKEN` | Token aplikasi Android printer (header `x-print-token`) | Untuk printer |
| `RECEIPT_STORE_NAME` | Nama toko di kop struk (default: Rumipang) | Tidak |
| `RECEIPT_STORE_ADDRESS` | Alamat di kop struk | Tidak |
| `RECEIPT_STORE_PHONE` | Nomor telepon di kop struk | Tidak |
| `RECEIPT_FOOTER` | Kalimat penutup struk | Tidak |
| `RECEIPT_COLUMNS` | Lebar struk: `32` (58mm) atau `48` (80mm) | Tidak |
| `NEXT_PUBLIC_LOCATION_CHECK` | Aktifkan geolocation gate | Tidak |
| `NEXT_PUBLIC_CAFE_LAT` / `LNG` | Koordinat kafe | Jika gate aktif |
| `NEXT_PUBLIC_CAFE_RADIUS_METERS` | Radius izin (m) | Tidak |

> ⚠️ **PENTING:** `SUPABASE_SERVICE_ROLE_KEY`, `MAYAR_API_KEY`, `MIDTRANS_SERVER_KEY`, dan `PRINT_DEVICE_TOKEN` **server-only** — jangan pernah commit. Variabel `NEXT_PUBLIC_*` di-bake saat build (untuk Docker lewat `--build-arg`).

### Beralih QRIS Sandbox ↔ Produksi

Hanya **dua** variabel yang menentukan, dan keduanya **wajib diganti bersamaan**:

| | Sandbox (uji coba) | Produksi (uang asli) |
|---|---|---|
| `MIDTRANS_SERVER_KEY` | Server key dari dashboard mode **Sandbox** | Server key dari dashboard mode **Production** |
| `MIDTRANS_IS_PRODUCTION` | `false` | `true` |

Key sandbox dan produksi adalah **kredensial yang berbeda**, dan bentuknya tidak
bisa dijadikan patokan — sebagian akun memberi key sandbox tanpa awalan `SB-`.
Mengganti flag saja tanpa mengganti key menghasilkan:

```
401 — Unknown Merchant server_key/id
```

#### Langkah ke PRODUKSI

1. Dashboard Midtrans → toggle ke **Production** → Settings → Access Keys →
   salin **Server Key**
2. Pastikan **QRIS sudah aktif** untuk akun produksi (butuh persetujuan Midtrans;
   aktivasi sandbox tidak otomatis berlaku di produksi)
3. Settings → **Payment Notification URL** → isi
   `https://<domain>/api/payments/midtrans/webhook`
   *(pengaturan sandbox dan produksi terpisah — mengisi salah satu tidak
   mengisi yang lain)*
4. Ganti kedua variabel di Vercel → **Redeploy** (variabel env baru terbaca
   setelah deploy ulang)
5. Uji dengan nominal kecil memakai e-wallet asli. Simulator sandbox **tidak
   berlaku** di produksi.

#### Langkah kembali ke SANDBOX

Kebalikannya: ambil server key dari toggle **Sandbox**, set
`MIDTRANS_IS_PRODUCTION=false`, redeploy. Bayar lewat
<https://simulator.sandbox.midtrans.com/v2/qris/index>.

> Sebagai pengaman, `npm run test:qris` **menolak jalan** saat
> `MIDTRANS_IS_PRODUCTION=true`, supaya script uji tidak pernah membuat transaksi
> dengan uang asli. Untuk menguji produksi, pakai `test:qris:prod` — lihat
> [Menguji QRIS di produksi](#menguji-qris-di-produksi-uang-asli).

Data kedua lingkungan **terpisah total**. Transaksi yang dibuat di sandbox tidak
bisa dicek dari produksi (dan sebaliknya), jadi `payment_intents` berstatus
`PENDING` sisa uji coba tidak akan pernah bisa diselesaikan setelah pindah ke
produksi — abaikan saja atau bersihkan lewat tombol **Reset Data** di dashboard owner.

---

## Cara Menjalankan Lokal

```bash
# 1. Install
npm install

# 2. Siapkan environment
cp .env.example .env      # lalu isi kredensial

# 3. Jalankan migrasi SQL di Supabase (SQL Editor) — lihat urutan di Database Schema

# 4. Dev server
npm run dev               # http://localhost:3000
```

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
3. Copy-paste seluruh isi file `supabase-schema.sql`, klik **"Run"**
4. Lanjutkan dengan migrasi tambahan sesuai urutan di [Database Schema](#database-schema) (payment flow → QRIS → hapus koki → print jobs)

### Step 3: Buat User Staff

1. Klik **"Authentication"** → **"Users"**
2. Klik **"Add user"** → **"Create new user"**
3. Buat 2 user:

| Email | Password | Role |
|---|---|---|
| `kasir@warkop.com` | `password123` | cashier |
| `owner@warkop.com` | `password123` | owner |

4. Setelah buat user, copy **User ID** (UUID) masing-masing
5. Di **"Table Editor"** → pilih tabel `staff_users` → **"Insert row"**, atau jalankan SQL:

```sql
INSERT INTO staff_users (id, email, name, role) VALUES
  ('UUID_KASIR', 'kasir@warkop.com', 'Kasir 1', 'cashier'),
  ('UUID_OWNER', 'owner@warkop.com', 'Owner 1', 'owner');
```

### Step 4: Ambil Credentials

1. Klik **"Project Settings"** (ikon gear) → **"API"**
2. Copy:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public** → `eyJhbG...`
   - **service_role** → `eyJhbG...` (rahasia!)

### Step 5: Isi .env

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

> **Storage:** bucket `menu-images` sudah dibuat oleh schema SQL (public read, staff write).

---

## Login Staff

| Email | Role | Akses |
|---|---|---|
| `owner@warkop.com` | Owner | Semua halaman |
| `kasir@warkop.com` | Cashier | Board kasir, Dapur, Manual Order, Printer, QR, History |

> Password dikonfigurasi saat membuat user di Supabase Auth Dashboard. Role `koki` sudah dihapus sejak v3.1 — Kitchen Display sekarang dipegang kasir & owner.

---

## Deployment (Docker)

Project memakai `output: 'standalone'` untuk image minimal.

```bash
# Build & jalankan
docker compose up -d --build

# Cek health
curl http://localhost:3000/api/health
```

- `Dockerfile` — 3 stage (deps → builder → runner non-root). `NEXT_PUBLIC_*` di-pass sebagai `--build-arg`; secret server (service role, Midtrans key, print token) di runtime.
- `docker-compose.yml` — meneruskan env dari `.env`, healthcheck, `restart: unless-stopped`.
- **Produksi QRIS:** set Payment Notification URL di dashboard **Midtrans** ke `https://<domain>/api/payments/midtrans/webhook`.

> Bisa juga deploy ke Vercel (API Routes = serverless). Untuk akses hanya-di-kafe, lihat opsi jaringan lokal / geolocation gate.

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
| v3.0 | Redesign alur pembayaran (status/payment_status split), gateway QRIS, dark mode, geolocation gate, Docker |
| v3.1 | Hapus role koki, cetak struk otomatis ke printer Bluetooth |
| v3.2 | Arsip otomatis khusus QRIS, hapus riwayat per hari/bulan/tahun, kelola karyawan, Take Away untuk pelanggan, 30 meja, QRIS pelanggan dimatikan |

---

## Changelog v2.1

### New Features

- **Kitchen ETA System** — Set estimasi waktu, countdown realtime, update ETA, overdue warning
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
- **OrderCard animations** — Framer Motion enter/exit animations (`motion.div` with `opacity`/`y` transitions) for smooth card appearance
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
| Improvements | 26 |
| Breaking changes | None |

---

## Changelog v2.3

### Konfirmasi Persetujuan Sebelum Checkout (1 file)

> ⚠️ Isi asli changelog ini hilang saat merge branch sebelumnya — baris di bawah direkonstruksi dari perilaku yang masih terverifikasi ada di `app/(customer)/checkout/page.tsx`, bukan salinan teks aslinya.

- Sebelum submit pesanan, customer wajib mencentang persetujuan bahwa pesanan **tidak dapat dibatalkan** setelah checkout.
- Tombol checkout nonaktif sampai kotak centang dicentang dan meja dipilih.

### Tech Specs

| Metric | Value |
|---|---|
| Files modified | 1 (`app/(customer)/checkout/page.tsx`) |
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

## Changelog v2.5

### Kelola Variasi Menu — VariationManager (6 files)

> ⚠️ Isi asli changelog ini hilang saat merge branch sebelumnya — baris di bawah direkonstruksi dari metadata yang tersisa (tabel Tech Specs) dan endpoint yang terverifikasi masih berjalan hari ini.

- Owner bisa CRUD variasi per menu (grup + label + harga tambahan) lewat komponen `VariationManager`
- Endpoint baru: `GET/POST /api/menu/variations`, `PUT/DELETE /api/menu/variations/[id]`

### Tech Specs

| Metric | Value |
|---|---|
| Files created | 3 (`VariationManager.tsx`, `variations/route.ts`, `variations/[id]/route.ts`) |
| Files modified | 1 (`owner/page.tsx`) |
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

> Endpoint `confirm-cash`/`confirm-payment` di atas kemudian digantikan oleh `mark-paid` pada redesign alur pembayaran v3.0.

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

> Baris "Login (kasir/koki/owner)" adalah catatan historis dari saat role `koki` masih ada — dihapus di v3.1.

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

### 1. Redesign Alur Pembayaran & Status

- **Pemisahan status dapur & bayar** — `status` (QUEUED/PROCESSING/SERVED/CANCELLED) terpisah dari `payment_status` (PAID/UNPAID). Metode bayar disederhanakan ke **CASH** & **QRIS** (drop TRANSFER_BCA).
- **Satu QR umum** — Ganti QR per-meja jadi satu QR kafe; customer pilih meja saat checkout.
- **Board kasir per meja** — Order dikelompokkan per meja, tiap order punya badge bayar sendiri. Tombol **Tandai Lunas** (mark-paid) & **Selesai** (arsip) menggantikan confirm-cash/confirm-payment.
- **Kolom `is_archived`** — Order pindah ke history hanya saat kasir menekan "Selesai".
- Migrasi: `scripts/migrate-payment-flow.sql` + `scripts/create-payment-intents.sql`.

### 2. Payment Gateway QRIS — Midtrans

- **Provider Midtrans** ([lib/midtrans.ts](lib/midtrans.ts)) — charge QRIS + cek status via API resmi Midtrans. (Catatan historis: v3.0 sempat memakai Mayar; checkout sudah kembali ke Midtrans.)
- **Order dibuat setelah lunas** — Tabel `payment_intents` menyimpan cart sementara; order baru dibuat saat pembayaran terkonfirmasi (`settleIntent`, idempoten).
- **Deteksi otomatis** — Polling status tiap 3 detik (lokal & produksi) + webhook (cadangan). Webhook selalu diverifikasi ulang server-side (aman walau signature tidak didokumentasikan).
- **Provider Mayar** — `lib/mayar.ts` + route `payments/mayar/*` masih ada di repo tapi tidak dipanggil checkout.

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
| Breaking changes | Perlu migrasi SQL (`migrate-payment-flow.sql` + `create-payment-intents.sql`) |

---

## Changelog v3.1

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
QRIS  -> pelanggan scan & bayar (Midtrans)
      -> settlement (webhook / status poll) via settleIntent()
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
npm run test:qris:auto     # terminal 2 — bayar otomatis, tanpa browser (paling mudah)
npm run test:qris          # terminal 2 — bayar manual di simulator
```

`test:qris:auto` mengisi form simulator sandbox sendiri, jadi tidak ada risiko
salah halaman/salah field. Kalau Midtrans mengubah markup simulatornya, mode ini
bisa berhenti bekerja — pakai `test:qris` (manual) sebagai cadangan.

Script mencetak **QR image URL** (`qrUrl`) dan `qr_string`. Untuk membayar,
buka simulator sandbox Midtrans (<https://simulator.sandbox.midtrans.com/v2/qris/index>),
tempel **QR image URL** ke field *QR Code Image Url*, klik **Scan QR** lalu **Pay**.

> **Pakai URL dengan `/v2/`.** Halaman lama (`/qris/index`, tanpa `/v2/`) masih
> bisa membaca QR dan menampilkan Reference ID, tapi form-nya kehilangan field
> `exploreData` sehingga tombol Pay selalu berakhir *"Transaction is unsuccessful"*
> dan transaksi tetap `pending`.

> Simulator hanya menerima **URL gambar QR**, bukan `qr_string` mentah.
> `qr_string` dipakai aplikasi untuk merender QR sendiri (via `qrcode.react`),
> bukan untuk ditempel ke simulator.

Setelah dibayar, script akan polling sampai lunas dan menampilkan isi struk yang
masuk antrian printer.

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

## Changelog v3.2

### Arsip otomatis — QRIS saja

| Metode bayar | Pindah ke riwayat |
|---|---|
| **QRIS** | **Otomatis**, begitu pembayarannya settle |
| **Tunai** | **Manual** — kasir menekan "Selesai" |

Bedanya bukan soal teknis, tapi soal apa yang masih terjadi di dunia nyata.
Uang QRIS sudah masuk sebelum ordernya lahir; tidak ada langkah tersisa, dan
menahannya di board hanya menunggu klik yang jawabannya selalu "ya". Di tunai
masih ada yang tidak terlihat server: uang dihitung, kembalian diberikan, meja
dibereskan. Hanya kasir yang tahu kapan itu benar-benar selesai. Keputusan
pemilik.

Penyaringan metode bayarnya ada di **satu tempat**,
[`lib/archive.ts`](lib/archive.ts) — bukan di pemanggilnya. Jadi ketiga jalur di
bawah boleh memanggilnya tanpa perlu tahu aturannya, dan aturan itu tidak bisa
bercabang diam-diam:

| Titik | Kapan | Hasil |
|---|---|---|
| `settleIntent()` di `lib/midtrans.ts` | QRIS settle (Midtrans) | **diarsipkan** |
| `POST /api/orders` | order POS yang uangnya sudah diterima | diarsipkan **kalau** QRIS |
| `PATCH /api/orders/[id]/mark-paid` | kasir verifikasi tunai | tetap di board |

Fungsinya idempoten dan tidak pernah `throw`: gagal mengarsipkan tidak boleh
menggagalkan transaksi yang uangnya sudah diterima.

Tombol **"Selesai"** karena itu tetap ada di kedua klien — bilah
`_ArchiveBar` di aplikasi Flutter dan tombol per meja di
[board kasir web](app/(staff)/dashboard/cashier/page.tsx) — dan syaratnya tidak
berubah: muncul hanya kalau **semua** order di meja itu sudah `SERVED` + `PAID`.
Yang sampai ke sana praktis selalu tunai, karena yang QRIS tidak pernah menetap.

> **Sapuan pengaman di aplikasi.** `CashierBoardNotifier` ikut mengarsipkan
> order QRIS lunas yang masih tampil di board (arsip di server sempat gagal,
> atau baris dari sebelum v3.2) — **khusus QRIS**. Order tunai sengaja
> dibiarkan; menyapunya sama saja menekan "Selesai" tanpa sepengetahuan kasir.

### Hapus riwayat per hari / bulan / tahun

`DELETE /api/orders/history` sekarang menerima `?from=&to=`:

```
DELETE /api/orders/history                       # seluruh riwayat (perilaku lama)
DELETE /api/orders/history?from=…&to=…           # satu rentang created_at
```

Keduanya ISO-8601 **lengkap dengan offset zona waktu**, `from` inklusif dan
`to` eksklusif. Batas "hari" di warung adalah tengah malam WIB, bukan UTC —
tengah malam UTC jatuh pukul 07.00 pagi, tepat di tengah hari kerja — jadi
pemanggilnyalah yang menentukan batas itu, bukan server.

Sekalian diperbaiki: penghapusan dulu memakai `status in (SERVED, CANCELLED)`,
yang **ikut menghapus order `SERVED` yang masih menunggu pembayaran** di board
kasir. Sekarang definisinya sama persis dengan `GET` di atasnya
(`is_archived = true` ATAU `status = CANCELLED`).

Antarmukanya ada di kedua klien — aplikasi Flutter dan
[halaman Riwayat web](app/(staff)/dashboard/history/page.tsx): pilih lingkup
(Hari · Bulan · Tahun · Semua), geser periodenya dengan panah, dan **jumlah order
yang terdampak selalu terlihat sebelum tombolnya bisa ditekan**. Tombol lama
"Hapus Semua" dilebur jadi lingkup "Semua"; dulu ia menghapus tanpa pernah
menyebut berapa banyak.

### POS web: cari, filter kategori, muat ulang

Sama seperti layar Order di aplikasi — dan alasannya sama: `useMenu()` hanya
mengambil katalog saat mount, jadi menu yang baru ditambahkan lewat dashboard
owner tidak pernah muncul di POS sampai halamannya dimuat ulang. Sekarang ada
tombol **Muat Ulang** (`refetch()`), kolom cari, dan deretan filter kategori di
[new-order](app/(staff)/dashboard/cashier/new-order/page.tsx).

### Opsi "tanpa" pada variasi menu (web pelanggan)

`MenuItemSheet` memakai radio button, dan radio tidak punya jalan mundur: sekali
pelanggan menyentuh topping berbayar, tidak ada cara kembali ke harga polos
selain menutup lembarnya. Tiap grup variasi sekarang punya opsi **"Tanpa …"**
yang terpilih sejak awal.

> Berbeda dari aplikasi Flutter, web **tidak pernah** memilih variasi otomatis,
> jadi harga dasarnya memang sudah benar sejak dulu — yang hilang cuma jalan
> pulangnya.

### Kelola karyawan (tambah & ubah)

Layar **Jatah** di aplikasi kasir memanggil dua endpoint yang tidak pernah ada:
`POST /api/staff` membalas **405** (file rutenya cuma punya `GET`) dan
`PATCH /api/staff/[id]` membalas **404**. Tombol "Tambah Karyawan" dan "Ubah
Karyawan" karena itu tidak pernah berhasil.

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/staff` | staff | Karyawan aktif |
| POST | `/api/staff` | **owner** | Tambah karyawan |
| PATCH | `/api/staff/[id]` | **owner** | Ubah nama / peran / email / aktif |

- **Owner-only ditegakkan di server,** bukan cuma disembunyikan di UI —
  daftar karyawan menentukan siapa yang berhak jatah makan.
- **`id` dibuat aplikasi, bukan database.** `staff_users.id` sengaja tidak punya
  `DEFAULT` (lihat `scripts/complete-schema.sql`): id-nya adalah cerminan UUID
  user Supabase Auth, bukan nomor acak. POST karena itu menerima `id` opsional:

  | Karyawan | Kirim `id`? |
  |---|---|
  | Ikut memakai aplikasi (punya akun login) | **Ya** — salin UUID user auth-nya. `requireStaff` mencocokkan sesi lewat `id`; id yang berbeda = tidak bisa masuk walau akun auth-nya sah. |
  | Hanya menerima jatah makan | Tidak — server membuat UUID acak. |
- **PATCH hanya menyentuh field yang dikirim.** Sengaja berbeda dari
  `PUT /api/menu/[id]` yang mengganti seluruh baris.
- **Owner aktif terakhir tidak bisa menurunkan perannya sendiri atau
  menonaktifkan dirinya** (409). Tanpa satu pun owner aktif, tidak ada lagi yang
  bisa mengembalikan keadaan lewat aplikasi.
- Validasi + perapian body dipakai bersama POST dan PATCH lewat
  [`app/api/staff/shared.ts`](app/api/staff/shared.ts).

> **Butuh migrasi:** [`scripts/staff-optional-email.sql`](scripts/staff-optional-email.sql).
> `staff_users.email` masih `NOT NULL`, padahal karyawan yang hanya menerima
> jatah makan (juru masak, pramusaji) tidak punya email — dan form aplikasi
> memang menandainya opsional. Kolomnya tetap `UNIQUE`; Postgres membolehkan
> banyak `NULL` di kolom unik, jadi email kosong disimpan sebagai `NULL`, bukan
> `''`. Tanpa migrasi ini, menambah karyawan tanpa email dibalas 400 dengan
> pesan yang menyebutkan file ini.

### "Tanpa Meja" → "Take Away"

Order tanpa `table_id` adalah pesanan bungkus, tapi tiap layar menuliskannya
sendiri-sendiri — dan dua di antaranya menuliskannya **"Meja -"**, yang terbaca
seperti data rusak, bukan seperti pilihan yang memang diambil kasir.

Sekarang satu sumber: `tableLabel()` di [lib/utils.ts](lib/utils.ts).

| Tempat | Sebelum | Sesudah |
|---|---|---|
| POS — pemilih meja | `— Tanpa meja —` | `Take Away · Tanpa Meja` |
| Board kasir (grup + `OrderCard`) | `Tanpa Meja` / `Meja -` | `Take Away` |
| Riwayat & dashboard owner | `Meja -` | `Take Away` |
| Struk termal | `Meja        Tanpa Meja` | `Jenis       TAKE AWAY` |

Kata yang dipakai **sama persis** dengan aplikasi kasir Flutter
(`OrderModel.tableLabel`) — order yang sama muncul di dua layar itu sekaligus,
jadi keduanya harus seragam.

`tableLabel()` juga memakai `table_number != null`, bukan `|| '-'`: meja bernomor
`0` dulu ikut jatuh ke tanda hubung.

### Take Away untuk pelanggan

Sebelumnya pesanan bungkus **tidak mungkin** dibuat dari sisi pelanggan: meja
wajib dipilih, dan tombol Checkout mati sampai ada nomornya.

Masalahnya bukan sekadar menambah tombol. `tableId === null` dipakai untuk dua
arti yang berbeda — "belum memilih" dan "sengaja tanpa meja" — dan keduanya
tidak bisa dibedakan dari situ. Karena itu [`CartContext`](context/CartContext.tsx)
sekarang punya flag `takeAway` sendiri (ikut tersimpan di `sessionStorage`),
plus turunan `tableDecided` = "meja dipilih **atau** take away" yang dipakai
semua penjagaan:

| Tempat | Sebelum | Sesudah |
|---|---|---|
| [`TablePicker`](components/order/TablePicker.tsx) | hanya daftar meja | tombol **Take Away · Dibungkus** di atas daftar |
| Pill di header | "Pilih Meja" berkedip selamanya | jadi "Take Away" + ikon kantong |
| [`CartDrawer`](components/cart/CartDrawer.tsx) | Checkout mati tanpa nomor meja | aktif kalau `tableDecided` |
| [Checkout](app/(customer)/checkout/page.tsx) | dropdown meja saja | + opsi "Take Away · Dibungkus" |

`takeAway` dan `tableId` **tidak pernah menyala bersamaan** — `setTable()`
mematikan take away dan `setTakeAway(true)` mengosongkan meja. Kalau keduanya
boleh hidup, order bungkus tetap membawa nomor meja dan kasir mengantarkannya ke
meja yang salah.

Order take away dikirim dengan `table_id: null`, dan tampil sebagai
**"Take Away"** di board kasir, riwayat, dan struk (lihat bagian di bawah).

### Meja sampai nomor 30

[`scripts/seed-tables-30.sql`](scripts/seed-tables-30.sql) — idempoten,
`ON CONFLICT (table_number) DO NOTHING`, jadi label yang sudah diganti staff
lewat halaman QR tidak ikut tertimpa dan meja yang dinonaktifkan tidak
dihidupkan diam-diam.

Lembar pemilih meja ikut disesuaikan: 3 kolom di HP, **6 di layar lebar** —
dengan 30 meja, tiga kolom berarti sepuluh baris gulungan.

### Sakelar QRIS pelanggan

QRIS bisa dimatikan/dinyalakan lewat env, tanpa menyentuh kode:

```env
NEXT_PUBLIC_QRIS_ENABLED=true    # sekarang AKTIF (Midtrans Snap, produksi)
```

Sakelarnya bekerja di **dua lapis**, dan keduanya perlu:

| Lapis | Perilaku |
|---|---|
| [Checkout pelanggan](app/(customer)/checkout/page.tsx) | Pilihan QRIS **tetap tampil** tapi mati, berlabel "Belum tersedia" |
| [`POST /api/payments/midtrans/charge`](app/api/payments/midtrans/charge/route.ts) | Menolak dengan **503** sebelum satu pun `payment_intent` dibuat |

Lapis kedua bukan formalitas. Endpoint itu publik, dan tab pelanggan yang sudah
lama terbuka masih memegang UI versi lama — tanpa penjagaan di server, ia masih
bisa membuat intent yang tidak akan pernah bisa dibayar.

> **Pastikan lapis kedua ada di route yang benar.** Versi pertama sakelar ini
> dipasang di `payments/mayar/create` — mengikuti README yang (keliru) menyebut
> Mayar sebagai provider aktif. Checkout sebenarnya memanggil
> `payments/midtrans/charge`, jadi selama itu UI-nya mati tapi endpoint yang
> benar-benar dipakai tidak terjaga sama sekali. Sakelar yang salah alamat
> lebih berbahaya daripada tidak ada sakelar: ia terlihat seperti sudah aman.

Saat mati, pilihannya **ditampilkan mati, bukan disembunyikan**: pelanggan yang
mencari QRIS jadi tahu ini belum tersedia, bukan mengira warungnya tidak
menerima QRIS lalu bertanya ke kasir.

> **Tidak menyentuh QRIS di POS kasir.** Di sana "QRIS" berarti uangnya sudah
> diterima lewat cara lain (mis. stiker QRIS statis di meja kasir) — tidak ada
> gateway yang dipanggil, jadi pilihan itu tetap hidup.
>
> Konsekuensinya pada arsip otomatis: order POS bertanda QRIS **tetap** langsung
> masuk riwayat, karena uangnya memang sudah diterima.

`NEXT_PUBLIC_*` di-bake saat build — mengubah flag ini menuntut **deploy ulang**.

### Tech Specs

| Metric | Value |
|---|---|
| Files created | 8 (`lib/archive.ts`, `lib/features.ts`, `app/api/staff/shared.ts`, `app/api/staff/[id]/route.ts`, `scripts/staff-optional-email.sql`, `scripts/seed-tables-30.sql`, `scripts/test-qris-production.mjs`, `scripts/load-env.mjs`) |
| Files modified | 16 (`orders/route.ts`, `mark-paid/route.ts`, `orders/history/route.ts`, `mayar/create/route.ts`, `midtrans/charge/route.ts`, `lib/midtrans.ts`, `staff/route.ts`, `lib/utils.ts`, `lib/receipt.ts`, `OrderCard.tsx`, `MenuItemSheet.tsx`, `cashier/page.tsx`, `new-order/page.tsx`, `history/page.tsx`, `owner/page.tsx`, `checkout/page.tsx`) |
| TypeScript errors | 0 |
| Breaking changes | Arsip otomatis tidak butuh migrasi (`is_archived` ada sejak v3.0). Kelola karyawan butuh `scripts/staff-optional-email.sql`. |

---

## Developer

**Ricky Rudiansyah** — BINUS University, Research Track AI & Robotika

---

## License

MIT License — bebas digunakan dan dimodifikasi.
