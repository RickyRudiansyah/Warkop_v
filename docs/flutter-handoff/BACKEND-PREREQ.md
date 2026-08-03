# Prasyarat Backend — Dukungan `Authorization: Bearer`

> **Dikerjakan di repo WEB (Next.js), bukan di repo Flutter.**
> Aplikasi Flutter tidak bisa mengerjakan ini sendiri.

## Masalahnya

API Next.js sekarang mengautentikasi staff lewat **cookie sesi** (`@supabase/ssr`).
Aplikasi Flutter memegang **JWT**, bukan cookie. Akibatnya, selama perubahan ini
belum dilakukan, **semua endpoint staff membalas 401** dan aplikasi kasir tidak
bisa berfungsi sama sekali.

Ini bukan sekadar penyesuaian gaya — ini pemblokir total. Kerjakan **sebelum**
mulai membangun aplikasi Flutter, atau minimal sebelum tahap yang menyentuh API.

## Perbaikannya

Buat `lib/auth.ts`:

```ts
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export interface StaffIdentity { role: string; name: string }

// Menerima dua cara login:
//   * Bearer JWT  -> aplikasi Flutter kasir
//   * cookie sesi -> dashboard web (tetap berjalan seperti sebelumnya)
export async function requireStaff(request?: NextRequest): Promise<StaffIdentity | null> {
  const header = request?.headers.get('authorization');

  if (header?.startsWith('Bearer ')) {
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(header.slice(7));
    if (!user) return null;
    const { data } = await admin
      .from('staff_users').select('role, name').eq('id', user.id).maybeSingle();
    return data ?? null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('staff_users').select('role, name').eq('id', user.id).maybeSingle();
  return data ?? null;
}
```

Lalu di tiap route, ganti fungsi `requireAuth()` lokal dengan `requireStaff(request)`:

```ts
// sebelum
if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// sesudah
if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

Perhatikan: beberapa route memakai hasilnya (mis. `mark-paid` memakai `staff.name`
untuk mengisi nama kasir di struk), jadi simpan hasilnya ke variabel.

## Route yang perlu diubah

```
app/api/orders/route.ts                   (GET, POST)
app/api/orders/history/route.ts           (GET, DELETE)
app/api/orders/[id]/route.ts              (GET, DELETE)
app/api/orders/[id]/status/route.ts       (PATCH)
app/api/orders/[id]/mark-paid/route.ts    (PATCH)   <- pakai staff.name
app/api/orders/[id]/cancel/route.ts       (PATCH)
app/api/orders/[id]/archive/route.ts      (PATCH)
app/api/orders/[id]/update-eta/route.ts   (PATCH)   <- lihat catatan keamanan
app/api/print/jobs/route.ts               (GET, POST)
app/api/print/jobs/[id]/ack/route.ts      (PATCH)
app/api/print/jobs/[id]/retry/route.ts    (POST)
app/api/tables/route.ts                   (GET)
app/api/menu/route.ts                     (GET)
app/api/activity-logs/route.ts            (POST)
```

Untuk `lib/print.ts` → `requirePrintAccess()`, tambahkan cabang Bearer yang sama
di jalur `staff` (jalur `x-print-token` biarkan apa adanya).

Dashboard web **tidak akan rusak**: jalur cookie tetap dipakai selama header
`Authorization` tidak ada.

## Catatan keamanan yang ditemukan sekalian

`PATCH /api/orders/{id}/update-eta` saat ini **tidak punya penjagaan autentikasi
sama sekali** — berbeda dari route order lainnya. Siapa pun yang tahu ID order
bisa mengubah estimasi waktu tanpa login.

Ini masalah lama, bukan akibat aplikasi Flutter. Tapi karena route ini akan
dipakai aplikasi kasir, tutup sekalian:

```ts
export async function PATCH(request: NextRequest, { params }) {
  if (!await requireStaff(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...sisanya tetap
}
```

## Cara menguji

```bash
# 1. Ambil token (ganti kredensial & URL Supabase)
TOKEN=$(curl -s -X POST "https://<ref>.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"kasir@warkop.com","password":"..."}' | jq -r .access_token)

# 2. Harus 200, bukan 401
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "https://rumipang.vercel.app/api/orders?mode=cashier"

# 3. Tanpa token harus tetap 401
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://rumipang.vercel.app/api/orders?mode=cashier"
```

Selesai kalau langkah 2 → `200` dan langkah 3 → `401`.
