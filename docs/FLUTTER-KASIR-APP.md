# Aplikasi Kasir Mobile (Flutter) — Rumipang

Spesifikasi teknis aplikasi Android yang **menggantikan dashboard kasir di web**
sekaligus menjadi **jembatan ke printer Bluetooth**.

Target perangkat: **ADVAN Tab VX Lite** (10,4" • Android 13 • 6 GB RAM).

---

## 1. Tujuan & Ruang Lingkup

Satu tablet di meja kasir menjalankan seluruh operasional harian:

| Yang dikerjakan aplikasi | Menggantikan halaman web |
|---|---|
| Melihat order aktif per meja, realtime | `/dashboard/cashier` |
| Verifikasi pembayaran tunai → struk tercetak | tombol "Verifikasi & Cetak Struk" |
| Batalkan order, selesaikan meja (arsip) | `/dashboard/cashier` |
| Kitchen display: set ETA, mulai proses, sudah diantar | `/dashboard/kitchen` |
| Order manual (POS) untuk pelanggan yang tidak scan | `/dashboard/cashier/new-order` |
| Antrian cetak + cetak ulang struk | `/dashboard/printer` |
| Riwayat order | `/dashboard/history` |
| **Mencetak ke printer Bluetooth** | *(tidak ada padanannya di web)* |

**Di luar ruang lingkup** (tetap di web, dipegang owner): kelola menu & variasi,
upload gambar, statistik penjualan, reset data, generator QR.

> Dashboard web kasir **tidak dihapus**. Aplikasi ini memakai API yang sama,
> jadi keduanya bisa berjalan berdampingan — berguna sebagai cadangan kalau
> tablet bermasalah.

---

## 2. Perangkat Target

| Spesifikasi | Nilai | Implikasi untuk aplikasi |
|---|---|---|
| OS | Android 13 (API 33) | `minSdk 26`, `targetSdk 34`. Wajib izin runtime `BLUETOOTH_CONNECT`/`BLUETOOTH_SCAN` (Android 12+) dan `POST_NOTIFICATIONS` (Android 13+) |
| Layar | 10,4" resolusi 2K | Layout **tablet landscape**: master-detail (daftar meja di kiri, detail order di kanan). Jangan pakai layout ponsel yang di-stretch |
| Chipset | Unisoc Tiger T618 (octa-core) | ABI `arm64-v8a`. Cukup untuk Flutter, tapi hindari animasi berat & rebuild list besar |
| RAM | 6 GB | Lega. Tetap batasi riwayat yang dimuat sekaligus |
| Baterai | 6000 mAh, pengisian 10 W | Tablet dipakai seharian sambil di-charge → aktifkan `WakelockPlus` di layar order, dan pastikan aplikasi tahan `Doze` |
| Konektivitas | 4G LTE + Wi-Fi | Tangani jaringan putus dengan antre lokal (lihat §9) |

Bluetooth pada tablet ini dipakai bersamaan dengan Wi-Fi/4G — pada chipset kelas
ini keduanya berbagi antena, jadi **uji stabilitas cetak sambil streaming data
realtime** sebelum dipakai produksi.

---

## 3. Arsitektur

```
┌──────────────────── ADVAN Tab VX Lite ────────────────────┐
│  Aplikasi Flutter (Kasir)                                  │
│                                                            │
│  ┌────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │ UI (Riverpod)│  │ Repository   │   │ PrinterService  │  │
│  └──────┬───────┘  └──────┬───────┘   └────────┬────────┘  │
│         │                 │                    │           │
│         │        REST + Bearer JWT             │ SPP       │
│         │                 │                    │ (Bluetooth│
│         │   Realtime (websocket)               │  Classic) │
└─────────┼─────────────────┼────────────────────┼───────────┘
          │                 │                    │
          ▼                 ▼                    ▼
   ┌─────────────┐   ┌─────────────┐     ┌──────────────┐
   │  Supabase   │   │  Next.js    │     │ Panda        │
   │  (auth +    │   │  API Routes │     │ PRJ-R58D     │
   │   realtime) │   │             │     │ (58mm)       │
   └─────────────┘   └─────────────┘     └──────────────┘
```

Pembagian tugas yang disarankan:

* **Supabase SDK** — hanya untuk **login** dan **realtime** (memantau perubahan
  tabel `orders` & `print_jobs` agar UI langsung menyegarkan).
* **REST API Next.js** — untuk **semua baca data dan aksi**. Alasannya: logika
  bisnis penting ada di server, bukan di tabel. Contoh: `mark-paid` bukan sekadar
  meng-update kolom, tapi juga **membuat print job**. Kalau Flutter meng-update
  tabel langsung lewat Supabase, struknya tidak akan pernah tercetak.

> **Aturan praktis:** baca boleh lewat mana saja, tapi **setiap perubahan status
> order harus lewat REST API**.

---

## 4. Prasyarat Backend (WAJIB dikerjakan lebih dulu)

API Next.js saat ini mengautentikasi staff lewat **cookie sesi** (`@supabase/ssr`).
Aplikasi Flutter memegang **JWT**, bukan cookie — jadi endpoint staff akan
menolaknya dengan 401 sampai backend menerima header `Authorization: Bearer`.

Buat `lib/auth.ts`:

```ts
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export interface StaffIdentity { role: string; name: string }

// Menerima dua cara login:
//   * Bearer JWT  -> aplikasi Flutter kasir
//   * cookie sesi -> dashboard web
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

Lalu ganti fungsi `requireAuth()` lokal di setiap route dengan `requireStaff(request)`.
Route yang perlu diubah:

```
app/api/orders/route.ts                   (GET, POST)
app/api/orders/history/route.ts           (GET, DELETE)
app/api/orders/[id]/route.ts              (GET, DELETE)
app/api/orders/[id]/status/route.ts       (PATCH)
app/api/orders/[id]/mark-paid/route.ts    (PATCH)
app/api/orders/[id]/cancel/route.ts       (PATCH)
app/api/orders/[id]/archive/route.ts      (PATCH)
app/api/orders/[id]/update-eta/route.ts   (PATCH)  <-- lihat catatan keamanan §12
app/api/print/jobs/route.ts               (GET, POST)
app/api/print/jobs/[id]/ack/route.ts      (PATCH)
app/api/print/jobs/[id]/retry/route.ts    (POST)
app/api/tables/route.ts                   (GET)
app/api/menu/route.ts                     (GET — untuk order manual)
app/api/activity-logs/route.ts            (POST)
```

Perubahan ini **tidak merusak dashboard web** karena jalur cookie tetap dipakai
saat header `Authorization` tidak ada.

---

## 5. Autentikasi

Login memakai akun `staff_users` yang sama dengan web (role `cashier` atau `owner`).

```dart
final supabase = Supabase.instance.client;

Future<void> login(String email, String password) async {
  final res = await supabase.auth.signInWithPassword(email: email, password: password);
  if (res.session == null) throw Exception('Login gagal');

  // Wajib: pastikan akun ini benar-benar staff, bukan sekadar user Supabase.
  final staff = await supabase
      .from('staff_users')
      .select('role, name, is_active')
      .eq('id', res.user!.id)
      .maybeSingle();

  if (staff == null || staff['is_active'] != true) {
    await supabase.auth.signOut();
    throw Exception('Akun ini bukan staff aktif');
  }
}
```

Sertakan token di setiap panggilan REST:

```dart
final token = Supabase.instance.client.auth.currentSession?.accessToken;
final headers = {
  'Authorization': 'Bearer $token',
  'Content-Type': 'application/json',
};
```

Token Supabase kedaluwarsa ~1 jam. `supabase_flutter` menyegarkannya otomatis,
tapi **ambil ulang `accessToken` tepat sebelum tiap request** — jangan disimpan
di variabel yang dibuat sekali saat login. Kalau dapat 401, coba `refreshSession()`
sekali; kalau tetap gagal, lempar ke layar login.

Sesi disimpan otomatis (`FlutterSecureStorage` di `supabase_flutter`), jadi kasir
tidak perlu login ulang tiap pagi.

---

## 6. Kontrak API

Base URL produksi: `https://rumipang.vercel.app`. Semua endpoint di bawah butuh
`Authorization: Bearer <token>` setelah §4 dikerjakan.

### 6.1 Order

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/orders?mode=cashier` | **Board kasir** — order non-arsip & non-cancel, termasuk `SERVED` yang belum diarsip |
| GET | `/api/orders` | **Board dapur** — hanya `QUEUED` & `PROCESSING` |
| GET | `/api/orders/history` | Arsip + dibatalkan |
| POST | `/api/orders` | Order manual (POS) |
| PATCH | `/api/orders/{id}/mark-paid` | **Verifikasi tunai → memicu cetak struk** |
| PATCH | `/api/orders/{id}/status` | `{ status, estimated_minutes? }` |
| PATCH | `/api/orders/{id}/update-eta` | `{ estimated_minutes }` — **menambah** waktu dari ETA berjalan |
| PATCH | `/api/orders/{id}/cancel` | `{ reason }` — ditolak kalau sudah `SERVED`/`CANCELLED` |
| PATCH | `/api/orders/{id}/archive` | Tandai selesai → pindah ke history |

Bentuk objek order:

```jsonc
{
  "id": "uuid",
  "status": "QUEUED",            // QUEUED | PROCESSING | SERVED | CANCELLED
  "payment_method": "CASH",      // CASH | QRIS
  "payment_status": "UNPAID",    // PAID | UNPAID
  "total_amount": 23000,
  "notes": null,
  "cancel_reason": null,
  "confirmed_at": null,
  "estimated_ready_at": null,
  "is_archived": false,
  "created_at": "2026-08-03T15:12:55.120Z",
  "table": { "id": "uuid", "table_number": 4, "label": "Meja 4" },
  "items": [
    {
      "id": "uuid",
      "menu_item_name": "Es Kopi Susu",
      "menu_item_price": 18000,
      "quantity": 1,
      "variations": [{ "variation_type": "Ukuran", "label": "Large", "extra_price": 3000 }],
      "subtotal": 21000,
      "notes": "Kurangi es"
    }
  ]
}
```

**`status` (dapur) dan `payment_status` (uang) terpisah.** Jangan menyimpulkan
salah satu dari yang lain — order bisa `SERVED` tapi masih `UNPAID`.

Respons `mark-paid` berisi `print_queued: true|false`. Kalau `false`, order tetap
lunas tapi struk gagal diantrikan — tampilkan peringatan dan tawarkan cetak ulang.

### 6.2 Printer

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/print/jobs?claim=1&limit=5` | Ambil **dan kunci** job `PENDING` → jadi `PRINTING` |
| GET | `/api/print/jobs` | 50 job terakhir (monitoring) |
| POST | `/api/print/jobs` | `{ order_id, verified_by }` → cetak ulang |
| PATCH | `/api/print/jobs/{id}/ack` | `{ status: "PRINTED" \| "FAILED", error? }` |
| POST | `/api/print/jobs/{id}/retry` | Kembalikan job gagal ke antrian |

Endpoint printer juga menerima header perangkat `x-print-token: <PRINT_DEVICE_TOKEN>`
sebagai alternatif Bearer. **Untuk aplikasi kasir pakai Bearer saja** — token
perangkat lebih cocok untuk alat cetak khusus tanpa login.

Detail lengkap siklus hidup job: [`BLUETOOTH-PRINTER.md`](BLUETOOTH-PRINTER.md).

### 6.3 Pendukung

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/tables` | Daftar meja aktif (untuk order manual) |
| GET | `/api/menu` | Daftar menu + `is_sold_out` |
| GET | `/api/menu/variations` | Variasi menu |
| POST | `/api/activity-logs` | `{ actor_email, actor_role, action, target_type, target_id, detail }` |
| GET | `/api/health` | Cek koneksi server |

---

## 7. Realtime

Berlangganan perubahan agar board tidak perlu polling agresif:

```dart
supabase.channel('kasir')
  .onPostgresChanges(
    event: PostgresChangeEvent.all, schema: 'public', table: 'orders',
    callback: (_) => ref.invalidate(ordersProvider))
  .onPostgresChanges(
    event: PostgresChangeEvent.all, schema: 'public', table: 'order_items',
    callback: (_) => ref.invalidate(ordersProvider))
  .onPostgresChanges(
    event: PostgresChangeEvent.insert, schema: 'public', table: 'print_jobs',
    callback: (_) => printerService.pumpQueue())
  .subscribe();
```

Pola yang dipakai web (dan disarankan di sini): **event realtime hanya sebagai
pemicu refetch**, bukan sumber data. Payload realtime tidak membawa relasi
(`table`, `items`), jadi tetap ambil ulang lewat REST.

Websocket bisa putus tanpa pemberitahuan (pindah Wi-Fi ↔ 4G). Tetap jalankan
**polling cadangan tiap 15 detik** dan refetch saat aplikasi kembali ke foreground.

---

## 8. Modul Printer Bluetooth

### 8.1 Pilihan paket — hati-hati BLE vs Classic

Printer termal murah seperti **Panda PRJ-R58D memakai Bluetooth Classic (SPP)**,
**bukan BLE**. Ini jebakan paling sering:

| Paket | Cocok? |
|---|---|
| `flutter_blue_plus` | **TIDAK** — hanya BLE, printer tidak akan terdeteksi |
| `print_bluetooth_thermal` | Ya — SPP, ada API cetak byte langsung |
| `blue_thermal_printer` | Ya — SPP klasik, Android saja |
| `esc_pos_utils_plus` | Pelengkap — menyusun byte ESC/POS (opsional) |

Cek versi terbaru di pub.dev saat mulai; ekosistem paket printer Flutter sering
berubah dan sebagian sudah tidak dirawat.

### 8.2 Izin Android 13

`android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
                 android:usesPermissionFlags="neverForLocation"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

<!-- Perangkat lama (Android <= 11) -->
<uses-permission android:name="android.permission.BLUETOOTH"
                 android:maxSdkVersion="30"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"
                 android:maxSdkVersion="30"/>
```

`BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, dan `POST_NOTIFICATIONS` harus diminta
**saat runtime** — Android 13 tidak memberikannya otomatis dari manifest.

### 8.3 Alur cetak

Struk sudah disiapkan server dalam dua bentuk, jadi aplikasi **tidak perlu
menyusun format sendiri**:

* `text_body` — teks siap kirim, 32 kolom (kertas 58 mm). **Pakai ini.**
* `payload` — struk terstruktur (JSON), kalau nanti mau format kustom/logo.

```dart
// UUID standar Serial Port Profile untuk printer termal
const sppUuid = '00001101-0000-1000-8000-00805F9B34FB';

Future<void> printJob(PrintJob job) async {
  final bytes = <int>[
    0x1B, 0x40,                                   // ESC @  — reset printer
    ...latin1.encode(job.textBody),               // isi struk
    0x0A, 0x0A, 0x0A,                             // feed
    0x1D, 0x56, 0x00,                             // GS V 0 — potong kertas
  ];
  await PrintBluetoothThermal.writeBytes(bytes);
}
```

Loop utamanya:

```
1. GET /api/print/jobs?claim=1&limit=3     -> job dikunci jadi PRINTING
2. untuk tiap job: kirim byte ke printer
3. sukses -> PATCH ack { status: "PRINTED" }
   gagal  -> PATCH ack { status: "FAILED", error: "<pesan>" }
4. ulangi tiap 3–5 detik (atau saat ada event realtime INSERT)
```

**ACK wajib.** Job `PRINTING` yang tidak di-ACK dalam 2 menit otomatis kembali
ke `PENDING` — kalau aplikasi lupa ACK, struk yang sama akan tercetak dua kali.

Jalankan loop ini di **foreground service** agar tidak dimatikan sistem saat
layar mati. Tampilkan notifikasi persisten "Printer aktif — N struk menunggu".

### 8.4 Batasan karakter

Printer kelas ini umumnya hanya mendukung code page 437/850 (ASCII). Server sudah
merender struk dalam ASCII, tapi **nama menu yang mengandung karakter non-ASCII
akan tercetak kacau**. Kalau muncul masalah, transliterasi di sisi aplikasi
sebelum mengirim, atau perbaiki nama menu di dashboard owner.

### 8.5 Layar Pengaturan Printer

Wajib ada, karena kasir yang akan memperbaiki sendiri saat printer bermasalah:

* Daftar perangkat ter-*pair* + tombol pilih (simpan MAC address di lokal)
* Indikator status: Terhubung / Terputus / Mencari
* Tombol **Tes Cetak** (struk contoh, tidak menyentuh antrian server)
* Tombol **Hubungkan Ulang**
* Jumlah job pending & gagal + tombol coba lagi

---

## 9. Jaringan Putus & Antrian Lokal

Kasir tetap harus bisa bekerja saat internet ngadat sebentar.

| Situasi | Perilaku yang diharapkan |
|---|---|
| Server tidak terjangkau saat memuat board | Tampilkan data terakhir dari cache + banner "Offline — data mungkin usang" |
| `mark-paid` gagal karena jaringan | Simpan ke antrian aksi lokal, coba lagi otomatis. **Jangan** tandai lunas di UI sebelum server mengonfirmasi |
| Printer terputus saat mencetak | ACK `FAILED` dengan pesan jelas; job kembali ke antrian |
| Job sudah diklaim lalu aplikasi mati | Server mengembalikannya ke `PENDING` setelah 2 menit |

**Jangan pernah menampilkan "lunas" sebelum server membalas 200.** Uang dan
struk harus mengikuti satu sumber kebenaran, yaitu database — bukan optimistic
update di tablet.

---

## 10. Struktur Proyek

```
lib/
├── main.dart
├── core/
│   ├── env.dart                 # base URL, Supabase key (lewat --dart-define)
│   ├── api_client.dart          # http + Bearer + retry + penanganan 401
│   └── failure.dart
├── features/
│   ├── auth/                    # login, guard role staff
│   ├── orders/                  # board kasir (grup per meja)
│   ├── kitchen/                 # ETA, mulai proses, sudah diantar
│   ├── new_order/               # POS manual
│   ├── history/
│   └── printer/
│       ├── printer_service.dart # koneksi SPP + kirim byte
│       ├── print_queue.dart     # claim → cetak → ack
│       └── printer_settings_page.dart
└── shared/                      # widget, format rupiah, tema
```

State management: **Riverpod** (cocok untuk data server + invalidasi realtime).
Model: **freezed** + `json_serializable` agar bentuk JSON server terikat tipe.

Jangan menaruh kunci di kode. Pakai `--dart-define`:

```bash
flutter build apk --release \
  --dart-define=API_BASE_URL=https://rumipang.vercel.app \
  --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJhbG...
```

> Hanya **anon key** yang boleh masuk aplikasi. `SUPABASE_SERVICE_ROLE_KEY` dan
> `MIDTRANS_SERVER_KEY` **tidak boleh** ada di APK — keduanya server-only.

---

## 11. Rancangan Layar (tablet landscape)

### Board Kasir — layar utama
```
┌──────────────────────────────────────────────────────────────┐
│ Rumipang · Kasir            [printer ●]  [Kasir 1]  [keluar]  │
├────────────────┬─────────────────────────────────────────────┤
│ MEJA           │  Meja 4 · 2 order                            │
│                │  ┌────────────────────────────────────────┐ │
│ ▸ Meja 1  ●2   │  │ #A3F91C   22:31   [Antri] [Belum Bayar] │ │
│ ▸ Meja 4  ●2   │  │ 1x Es Kopi Susu (Large)         21.000  │ │
│ ▸ Meja 7  ●1   │  │ ─────────────────────────────────────── │ │
│                │  │ TOTAL                           21.000  │ │
│ (● = belum     │  │ [Verifikasi & Cetak Struk] [Batalkan]   │ │
│    bayar)      │  └────────────────────────────────────────┘ │
│                │  [ Selesai — Pindahkan ke History ]          │
└────────────────┴─────────────────────────────────────────────┘
```

Aturan tombol (samakan dengan web):

* **Verifikasi & Cetak Struk** — hanya saat `payment_status == UNPAID`
* **Batalkan** — hanya saat `status == QUEUED`, wajib isi alasan
* **Selesai** — hanya saat **semua** order di meja itu `SERVED` **dan** `PAID`

Indikator printer di kanan atas harus selalu terlihat: hijau = terhubung,
merah = terputus, angka = job menunggu. Kasir harus tahu tanpa membuka menu.

### Layar lain
* **Dapur** — dua kolom: Antrian → Sedang Diproses. Kartu overdue diberi warna
  merah + hitung mundur.
* **Order Manual** — grid menu di kiri, keranjang di kanan, pilih meja, pilih
  metode bayar. Kirim ke `POST /api/orders`.
* **Printer** — lihat §8.5.
* **Riwayat** — daftar order arsip/batal, bisa cetak ulang struk.

---

## 12. Keamanan

* Simpan sesi di penyimpanan aman bawaan `supabase_flutter`; jangan tulis token
  ke `SharedPreferences` biasa.
* Cek `is_active` pada `staff_users` saat login **dan** saat aplikasi kembali
  dibuka — staff yang dinonaktifkan harus langsung terkunci.
* Aktifkan penguncian layar tablet. Aplikasi kasir memberi akses ke seluruh data
  order dan tombol "tandai lunas".
* Jangan tanam `PRINT_DEVICE_TOKEN` di APK yang disebar luas; aplikasi kasir
  sudah punya identitas staff sendiri.

### Temuan yang perlu diperbaiki

Saat menyusun dokumen ini saya menemukan **`PATCH /api/orders/{id}/update-eta`
tidak punya penjagaan autentikasi sama sekali** — berbeda dari route order
lainnya. Siapa pun yang tahu ID order bisa mengubah estimasi waktu tanpa login.

Ini **sudah ada sebelum aplikasi Flutter** dan bukan disebabkan olehnya, tapi
karena route tersebut akan dipakai aplikasi ini, sebaiknya ditutup sekalian saat
mengerjakan §4:

```ts
// app/api/orders/[id]/update-eta/route.ts
export async function PATCH(request: NextRequest, { params }) {
  if (!await requireStaff(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...sisanya tetap
}
```

---

## 13. Urutan Pengerjaan

| Tahap | Isi | Hasil yang bisa diuji |
|---|---|---|
| 0 | Backend: Bearer auth (§4) + tutup `update-eta` | `curl` dengan Bearer berhasil |
| 1 | Login + guard role staff | Kasir bisa masuk, non-staff ditolak |
| 2 | Board kasir (baca saja) + realtime | Order muncul & berubah sendiri |
| 3 | Verifikasi tunai, batalkan, selesai | Alur uang lengkap tanpa printer |
| 4 | **Modul printer** + layar pengaturan | Struk keluar dari PRJ-R58D |
| 5 | Dapur (ETA, proses, diantar) | Dashboard kitchen bisa ditinggalkan |
| 6 | Order manual (POS) | Web kasir tidak dipakai lagi |
| 7 | Riwayat, cetak ulang, penanganan offline | Siap produksi |

Tahap 4 sengaja ditaruh lebih awal — cetak Bluetooth adalah bagian dengan
ketidakpastian terbesar (perilaku SPP berbeda antar perangkat), jadi risikonya
sebaiknya dibuktikan sebelum fitur lain menumpuk.

---

## 14. Checklist Sebelum Dipakai di Warung

- [ ] Cetak berhasil setelah tablet **restart** (pairing bertahan?)
- [ ] Cetak berhasil setelah printer **dimatikan lalu dinyalakan**
- [ ] Struk **tidak** tercetak dua kali saat aplikasi ditutup paksa di tengah cetak
- [ ] Kertas habis → job jadi `FAILED`, bukan hilang diam-diam
- [ ] Wi-Fi dimatikan saat verifikasi tunai → tidak ada "lunas palsu" di layar
- [ ] Dua order QRIS bersamaan → dua struk, tidak tertukar
- [ ] Tablet dicas semalaman → aplikasi masih jalan & printer masih tersambung
- [ ] Nama menu terpanjang tidak merusak lebar 32 kolom
- [ ] Order tunai: struk **baru** keluar setelah tombol verifikasi ditekan
- [ ] Order QRIS: struk keluar **otomatis** tanpa disentuh kasir

---

## Rujukan

Berkas berikut disalin bersama dokumen ini ke repo Flutter, jadi rujukannya tetap
berlaku di sana:

* `PRINTER.md` — kontrak antrian cetak & siklus hidup job
  *(di repo web namanya `docs/BLUETOOTH-PRINTER.md`)*
* `API-CONTRACT.md` — seluruh endpoint, aturan bisnis, penanganan error
* `api-samples.json` — contoh respons **asli** dari server, untuk membuat model

Yang **hanya ada di repo web** (tidak perlu dibuka dari repo Flutter):

* `lib/receipt.ts` — kode yang menghasilkan `text_body` & `payload`. Bentuk
  keluarannya sudah terekam di `api-samples.json`.
* `README.md` — arsitektur sistem & skema database lengkap.
* `docs/flutter-handoff/BACKEND-PREREQ.md` — perubahan Bearer auth yang wajib
  dikerjakan di repo web sebelum aplikasi ini bisa memanggil API.
