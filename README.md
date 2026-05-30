# Warkop QR Ordering System v3

> Sistem pemesanan digital berbasis QR Code — customer scan QR, isi nomor meja, pesan & bayar dari HP. Struk otomatis tercetak di dapur. Tanpa antri, tanpa tracking.

![Tech Stack](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase)
![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-06B6D4?style=flat-square&logo=tailwindcss)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel)

---

## Daftar Isi

- [Perombakan v3](#perombakan-v3)
- [Alur Baru](#alur-baru)
- [Halaman](#halaman)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Tech Stack](#tech-stack)
- [Arsitektur Project](#arsitektur-project)
- [Cara Menjalankan](#cara-menjalankan)
- [Environment Variables](#environment-variables)

---

## Perombakan v3

Perombakan total dari v2.x ke v3. Fokus: **self-order + self-pay dari HP customer, tanpa tracking, tanpa dashboard koki, struk otomatis print di dapur.**

### Yang Berubah

| Aspek | v2.x | v3 |
|-------|------|-----|
| Alur customer | Scan QR → pesan → bayar ke kasir → lacak pesanan | Scan QR → isi meja → pesan → **bayar dari HP** → selesai |
| Tracking customer | Halaman tracking dengan ETA countdown | **Dihapus total** |
| Koki (chef) | Dashboard dapur dengan antrian + ETA + countdown | **Dihapus total** → diganti printer fisik |
| QR Code | 10 QR berbeda, satu per meja | **1 QR generic** untuk semua meja |
| Pembayaran | Konfirmasi oleh kasir (manual) | **Bayar online** (QRIS/Transfer via Midtrans) + opsi Cash |
| Multi-orang 1 meja | Tidak dihandle | Bisa **pisah** (pesan sendiri) atau **gabung** (satu tagihan) |
| Halaman checkout | Halaman terpisah `/checkout` | **Digabung** ke dalam `/order` |
| Status order | 6 status (PENDING_CASH, PENDING_PAYMENT, CONFIRMED, PROCESSING, SERVED, CANCELLED) | 5 status (PENDING_CASH, PAID, PROCESSING, SERVED, CANCELLED) |
| Struk dapur | Tidak ada | Otomatis tercetak setelah bayar |
| Payment gateway | Tidak ada | Arsitektur siap Midtrans/Xendit |

### Yang Dihapus

| Halaman / API | Alasan |
|---------------|--------|
| `/order-tracking` | Customer tidak tracking lagi |
| `/checkout` | Digabung ke `/order` |
| `/dashboard/kitchen` | Koki pakai printer fisik |
| `/dashboard/cashier/new-order` | Tidak relevan di flow baru |
| API: `track`, `status`, `confirm-cash`, `confirm-payment`, `cancel`, `update-eta` | Diganti flow baru |

### Yang Baru

| File | Fungsi |
|------|--------|
| `lib/payment/` | Abstraction layer payment (Cash + Midtrans template) |
| `lib/printer/` | Abstraction layer printer thermal (ESC/POS + Dummy) |
| `api/table-sessions/` | Buat/gabung sesi meja untuk multi-orang |
| `api/orders/[id]/pay/` | Mark order PAID + auto-print struk |
| `api/orders/[id]/print/` | Cetak ulang struk |
| `api/payment/callback/` | Webhook Midtrans/Xendit |
| `scripts/migrate-v2.sql` | SQL migration dari v2 ke v3 |

---

## Alur Baru

### Customer

```
Scan QR → Masukkan Nomor Meja → Pilih Menu → Keranjang → Pilih Bayar → Bayar → Selesai
```

Semua dalam **1 halaman** (`/order`):
1. **Input nomor meja** — kalau meja sudah ada pesanan aktif, prompt "Gabung atau pesan sendiri?"
2. **Browse menu** — kategori pills + grid menu + search
3. **Keranjang** — bottom drawer dengan +/- qty, hapus item
4. **Pembayaran** — pilih Cash / QRIS / Transfer + centang setuju → submit
5. **Sukses** — redirect ke `/order-success` dengan ringkasan pesanan

### Staff (Kasir)

```
Login → Dashboard Kasir:
  ├── Pending Cash        → Konfirmasi bayar / Tandai lunas
  ├── Sudah Dibayar       → Mark sedang diproses / Sudah diantar / Cetak ulang
  ├── Diproses            → Sudah diantar / Cetak ulang
  ├── Cancel              → Batalkan dengan alasan
  ├── QR Generator        → 1 QR generic
  └── History             → Riwayat selesai + batal
```

### Dapur (Koki)

- **Tidak ada dashboard digital**
- Setelah customer bayar → struk **otomatis tercetak** di printer thermal dapur
- Koki lihat struk → masak → antar
- Kasir bisa cetak ulang jika diperlukan

---

## Halaman

| URL | Akses | Deskripsi |
|-----|-------|-----------|
| `/` | Public | Redirect ke `/order` |
| `/order` | Public | **Halaman utama** — input meja → menu → keranjang → bayar |
| `/order-success` | Public | Sukses + ringkasan pesanan |
| `/login` | Public | Staff login |
| `/dashboard/cashier` | Kasir, Owner | Dashboard pesanan aktif (3 kolom) |
| `/dashboard/owner` | Owner | Analitik + kelola menu + reset data |
| `/dashboard/qr` | Kasir, Owner | Generate 1 QR generic |
| `/dashboard/history` | Kasir, Owner | Riwayat pesanan selesai/batal |

---

## Database Schema

### Tabel Baru: `table_sessions`

Untuk gabung pesanan multi-orang dalam 1 meja.

```sql
table_sessions (
  id UUID PRIMARY KEY,
  table_number INT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',   -- ACTIVE | CLOSED
  total_amount INT DEFAULT 0,
  created_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
)
```

### Tabel: `orders` (v3 — disederhanakan)

```sql
orders (
  id UUID PRIMARY KEY,
  table_id UUID REFERENCES tables,
  session_id UUID REFERENCES table_sessions,  -- NEW
  status TEXT DEFAULT 'PENDING_CASH',         -- PENDING_CASH | PAID | PROCESSING | SERVED | CANCELLED
  payment_method TEXT NOT NULL,               -- CASH | QRIS | TRANSFER_BCA
  payment_status TEXT DEFAULT 'UNPAID',       -- NEW: UNPAID | PAID
  total_amount INT NOT NULL,
  notes TEXT,
  cancel_reason TEXT,
  payment_ref TEXT,                           -- NEW: referensi Midtrans/Xendit
  receipt_printed BOOLEAN DEFAULT false,      -- NEW
  paid_at TIMESTAMPTZ,                        -- NEW
  created_at TIMESTAMPTZ
)
```

### Alur Status Order

```
Customer submit order
       ↓
PENDING_CASH ──(kasir konfirmasi cash / gateway callback)──→ PAID
       ↓
PAID ──(kasir mark served / skip)──→ PROCESSING ──→ SERVED ✅

Bisa cancel dari: PENDING_CASH, PAID → CANCELLED
```

---

## API Endpoints

### Menu (unchanged from v2)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/menu` | Public | List menu items + categories |
| POST | `/api/menu` | Staff | Create menu item |
| PUT | `/api/menu/[id]` | Staff | Update menu item |
| DELETE | `/api/menu/[id]` | Staff | Delete menu item |
| PATCH | `/api/menu/[id]/sold-out` | Staff | Toggle sold out |
| GET | `/api/menu/categories` | Public | List categories |
| GET/POST | `/api/menu/variations` | Public/Staff | List/create variations |
| PUT/DELETE | `/api/menu/variations/[id]` | Staff | Update/delete variation |

### Orders (v3 — disederhanakan)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/orders` | Staff | List active orders |
| POST | `/api/orders` | Public | Create new order |
| GET | `/api/orders/[id]` | Staff | Order detail |
| DELETE | `/api/orders/[id]` | Staff | Delete SERVED/CANCELLED only |
| PATCH | `/api/orders/[id]/pay` | Staff | Mark as PAID + auto-print |
| POST | `/api/orders/[id]/print` | Staff | Reprint receipt |
| GET | `/api/orders/history` | Staff | List SERVED/CANCELLED |
| DELETE | `/api/orders/history` | Staff | Clear all history |
| DELETE | `/api/orders/reset` | Owner | Reset all orders + sessions |

### Baru di v3

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/table-sessions` | Public | Create or join table session |
| POST | `/api/payment/callback` | Public | Payment gateway webhook |

### Tables, Upload, Activity Logs (unchanged from v2)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/tables` | Public | List tables |
| GET | `/api/tables/[number]` | Public | Table by number |
| POST | `/api/upload` | Staff | Upload menu image |
| GET/POST | `/api/activity-logs` | Staff | Activity logging |
| GET | `/api/health` | Public | Health check |

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + Storage + Realtime) |
| Auth | Supabase Auth |
| Animation | Framer Motion |
| Icons | Lucide React |
| Toast | Sonner |
| QR Code | qrcode.react |
| Payment | Midtrans (template ready) |
| Printer | ESC/POS thermal (template ready) |

---

## Arsitektur Project

```
warkop-app/
├── app/
│   ├── (customer)/
│   │   ├── order/page.tsx              # Multi-step: meja → menu → keranjang → bayar
│   │   └── order-success/page.tsx      # Sukses + struk digital
│   ├── (staff)/
│   │   ├── login/page.tsx              # Staff login
│   │   └── dashboard/
│   │       ├── cashier/page.tsx        # Kanban: Pending Cash, Dibayar, Diproses
│   │       ├── owner/page.tsx          # Analitik + kelola menu
│   │       ├── qr/page.tsx             # QR generic (1 untuk semua meja)
│   │       └── history/page.tsx        # Riwayat pesanan
│   ├── api/
│   │   ├── menu/                       # Menu CRUD
│   │   ├── orders/                     # Orders + pay + print + history + reset
│   │   ├── table-sessions/             # Create/join table session
│   │   ├── payment/callback/           # Midtrans webhook
│   │   ├── tables/                     # Tables
│   │   ├── activity-logs/              # Activity logging
│   │   ├── upload/                     # Image upload
│   │   └── health/                     # Health check
│   ├── layout.tsx                      # Root layout + providers
│   └── page.tsx                        # Redirect / → /order
├── components/
│   ├── dashboard/
│   │   ├── DashboardLayout.tsx         # Staff shell (2 role: cashier, owner)
│   │   ├── OrderCard.tsx               # Order card v3
│   │   └── VariationManager.tsx        # Menu variation CRUD
│   ├── menu/
│   │   ├── MenuItemCard.tsx            # Menu grid card
│   │   ├── MenuItemSheet.tsx           # Bottom sheet detail
│   │   └── CategoryPills.tsx           # Category filter
│   └── ui/
│       ├── Button.tsx                  # Multi-variant button
│       ├── Badge.tsx                   # Status badge
│       ├── Spinner.tsx                 # Loading spinner
│       ├── Skeleton.tsx                # Skeleton loader
│       └── EmptyState.tsx              # Empty state
├── lib/
│   ├── payment/                        # Payment abstraction layer
│   │   ├── types.ts
│   │   ├── cash.ts                     # Cash provider
│   │   ├── midtrans.ts                 # Midtrans provider (template)
│   │   └── index.ts                    # Factory
│   ├── printer/                        # Printer abstraction layer
│   │   ├── types.ts
│   │   ├── escpos.ts                   # ESC/POS provider
│   │   ├── dummy.ts                    # Dev/dummy printer
│   │   └── index.ts                    # Factory
│   ├── supabase/
│   │   ├── client.ts                   # Browser client
│   │   └── server.ts                   # Server client + admin
│   └── utils.ts                        # formatCurrency, formatDate, cn
├── context/
│   ├── AuthContext.tsx                  # Auth state
│   ├── CartContext.tsx                  # Cart state + sessionStorage
│   └── ThemeContext.tsx                 # Light/dark theme
├── hooks/
│   ├── useMenu.ts                      # Menu data
│   ├── useOrders.ts                    # Orders + realtime
│   └── useCountdown.ts                 # Countdown timer
├── types/
│   ├── index.ts                        # TypeScript interfaces
│   └── database.ts                     # Supabase Database types
├── middleware.ts                        # Route protection
├── supabase-schema.sql                 # Full v3 schema + seed
├── scripts/migrate-v2.sql              # Migration v2 → v3
└── .env.example                        # Environment template
```

---

## Cara Menjalankan

### 1. Install

```bash
npm install
```

### 2. Setup Supabase

1. Buat project di [Supabase](https://supabase.com/dashboard)
2. Jalankan `supabase-schema.sql` di SQL Editor
3. **Jika upgrade dari v2**: jalankan `scripts/migrate-v2.sql` di SQL Editor
4. Buat user staff di Authentication → Users, lalu insert ke `staff_users`

### 3. Environment Variables

```bash
cp .env.example .env
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Payment (optional)
NEXT_PUBLIC_PAYMENT_PROVIDER=CASH
MIDTRANS_SERVER_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
MIDTRANS_PRODUCTION=false

# Printer (optional)
PRINTER_ENDPOINT=
```

### 4. Run

```bash
npm run dev
```

### 5. Buka

| URL | Halaman |
|-----|---------|
| `http://localhost:3000/order` | Customer — scan QR |
| `http://localhost:3000/login` | Staff login |
| `http://localhost:3000/dashboard/cashier` | Dashboard kasir |
| `http://localhost:3000/dashboard/owner` | Dashboard owner |

---

## Environment Variables

| Variable | Deskripsi | Required |
|----------|-----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase | Ya |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon public key | Ya |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (rahasia) | Ya |
| `NEXT_PUBLIC_PAYMENT_PROVIDER` | `CASH` atau `MIDTRANS` | Tidak (default: CASH) |
| `MIDTRANS_SERVER_KEY` | Midtrans server key | Hanya jika pakai Midtrans |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Midtrans client key | Hanya jika pakai Midtrans |
| `MIDTRANS_PRODUCTION` | `true` / `false` | Hanya jika pakai Midtrans |
| `PRINTER_ENDPOINT` | URL endpoint printer thermal | Tidak (default: dummy/log-only) |

---

## Login Staff

| Email | Role | Akses |
|-------|------|-------|
| `owner@warkop.com` | Owner | Semua dashboard |
| `kasir@warkop.com` | Cashier | Orders, QR, History |
| `koki@warkop.com` | Koki | **Tidak ada akses dashboard** (diganti printer) |

> Password dikonfigurasi di Supabase Auth Dashboard.

---

## Changelog v3

### Perombakan Total — Self-Order + Self-Pay

- **Customer flow**: 1 halaman multi-step — input meja → menu → keranjang → bayar
- **Hapus**: tracking customer, checkout terpisah, dashboard koki, order manual kasir
- **QR generic**: 1 QR untuk semua meja, customer isi nomor meja sendiri
- **Pembayaran online**: abstraction layer siap Midtrans/Xendit, Cash tetap ada
- **Multi-orang 1 meja**: bisa pisah (masing-masing bayar) atau gabung (satu tagihan meja)
- **Struk otomatis**: setelah bayar → print ke dapur via printer thermal
- **Status disederhanakan**: 6 → 5 status, tanpa PENDING_PAYMENT dan CONFIRMED
- **Payment status**: kolom baru `payment_status` (UNPAID/PAID) terpisah dari order status
- **Table sessions**: tabel baru untuk merge pesanan multi-orang
- **Middleware**: hapus role koki, hanya 2 role (cashier + owner)
- **API dibersihkan**: 7 endpoint dihapus, 5 endpoint baru

### Tech Specs

| Metric | Value |
|--------|-------|
| Files created | 17 |
| Files deleted | 13 |
| Files modified | 15 |
| TypeScript errors | 0 |
| New tables | 1 (`table_sessions`) |
| Columns added to orders | 5 (`session_id`, `payment_status`, `payment_ref`, `receipt_printed`, `paid_at`) |

---

## Developer

**Ricky Rudiansyah** — BINUS University

---

## License

MIT
