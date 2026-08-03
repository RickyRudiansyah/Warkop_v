# Paket Serah-Terima — Aplikasi Kasir Flutter

Isi folder ini adalah **bekal lengkap** untuk membangun aplikasi kasir Flutter di
**repo terpisah**. Semuanya mandiri: AI/developer di repo baru tidak perlu akses
ke repo web ini.

---

## Yang harus kamu salin ke repo Flutter baru

Buat folder `docs/` di repo Flutter, lalu salin **4 berkas** ini:

| Berkas | Isi | Dari |
|---|---|---|
| `SPEC.md` | Spesifikasi aplikasi: ruang lingkup, perangkat, arsitektur, layar, printer, tahapan | salin dari `docs/FLUTTER-KASIR-APP.md` |
| `API-CONTRACT.md` | Semua endpoint + aturan bisnis + penanganan error | folder ini |
| `PRINTER.md` | Kontrak antrian cetak & siklus hidup job | salin dari `docs/BLUETOOTH-PRINTER.md` |
| `api-samples.json` | Contoh respons **asli** dari server, untuk bikin model | folder ini |

Perintah cepat (jalankan dari root repo web ini):

```bash
NEW_REPO=../rumipang-kasir-flutter     # sesuaikan
mkdir -p "$NEW_REPO/docs"
cp docs/FLUTTER-KASIR-APP.md            "$NEW_REPO/docs/SPEC.md"
cp docs/BLUETOOTH-PRINTER.md            "$NEW_REPO/docs/PRINTER.md"
cp docs/flutter-handoff/API-CONTRACT.md "$NEW_REPO/docs/"
cp docs/flutter-handoff/api-samples.json "$NEW_REPO/docs/"
```

`BACKEND-PREREQ.md` **tidak** disalin — isinya catatan pekerjaan di repo web,
dan pekerjaan itu sudah selesai (lihat bagian berikutnya).

---

## Yang TIDAK boleh masuk repo Flutter

| Jangan salin | Alasan |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass semua RLS. Server-only, mutlak |
| `MIDTRANS_SERVER_KEY` | Bisa dipakai membuat transaksi atas nama tokomu |
| `PRINT_DEVICE_TOKEN` | Aplikasi kasir sudah punya identitas staff sendiri |
| Berkas `.env` repo web | Berisi ketiga rahasia di atas |

Yang **boleh** masuk aplikasi hanya dua, dan keduanya lewat `--dart-define`
(bukan ditulis di kode):

```
SUPABASE_URL       = https://<ref>.supabase.co
SUPABASE_ANON_KEY  = eyJhbG...            (anon, bukan service_role)
API_BASE_URL       = https://rumipang.vercel.app
```

Anon key memang dirancang untuk dipasang di klien — keamanannya dijaga RLS
di Supabase, bukan dengan menyembunyikan key-nya.

---

## ✅ Prasyarat backend — SUDAH SELESAI

Dukungan `Authorization: Bearer` sudah ditambahkan di repo web (4 Agustus 2026),
jadi repo Flutter **tidak terblokir**. [`BACKEND-PREREQ.md`](BACKEND-PREREQ.md)
disimpan sebagai catatan apa yang berubah.

Hasil verifikasi di server lokal:

| Cara | Endpoint staff |
|---|---|
| `Authorization: Bearer <JWT>` — aplikasi Flutter | **200** |
| Cookie sesi — dashboard web | **200** (tidak ada yang rusak) |
| Tanpa autentikasi | **401** |
| Token palsu / kedaluwarsa | **401** |

Alur tunai lengkap juga sudah diuji lewat Bearer: order dibuat → kasir verifikasi
→ struk masuk antrian dengan nama kasir terisi.

---

## Prompt awal untuk AI di repo baru

Salin-tempel ini setelah keempat berkas ada di `docs/`:

> Aku mau membangun aplikasi kasir Android dengan Flutter untuk kedai kopi
> "Rumipang". Aplikasi ini menggantikan dashboard kasir berbasis web dan sekaligus
> menjadi jembatan ke printer termal Bluetooth.
>
> Baca dulu keempat berkas di `docs/` sebelum menulis kode:
> - `docs/SPEC.md` — spesifikasi lengkap: ruang lingkup, perangkat target,
>   arsitektur, rancangan layar, modul printer, dan tahapan pengerjaan
> - `docs/API-CONTRACT.md` — seluruh endpoint, aturan bisnis, penanganan error
> - `docs/PRINTER.md` — kontrak antrian cetak dan siklus hidup job
> - `docs/api-samples.json` — contoh respons asli dari server untuk membuat model
>
> Konteks penting:
> - Perangkat target: ADVAN Tab VX Lite (10,4", Android 13). Layout **tablet
>   landscape**, bukan layout ponsel yang di-stretch.
> - Printer: Panda PRJ-R58D, kertas 58 mm, **Bluetooth Classic (SPP)** — BUKAN
>   BLE. Jangan pakai `flutter_blue_plus`, printer tidak akan terdeteksi.
> - Backend sudah menyediakan struk siap cetak di field `text_body` (32 kolom).
>   Jangan menyusun format struk sendiri.
> - `status` (dapur) dan `payment_status` (uang) adalah dua hal terpisah. Jangan
>   menyimpulkan salah satu dari yang lain.
> - Semua perubahan status order **harus** lewat REST API, tidak boleh update
>   tabel Supabase langsung — logika bisnisnya (mis. membuat job cetak) ada di
>   server.
>
> Mulai dari Tahap 1 di SPEC.md (login + guard role staff). Sebelum menulis kode,
> jelaskan dulu rencanamu: struktur folder, paket yang dipilih beserta alasannya,
> dan pendekatan state management.

---

## Yang perlu kamu siapkan sendiri

Hal-hal yang tidak bisa disiapkan dari repo ini:

1. **Kredensial Supabase** — `SUPABASE_URL` + `SUPABASE_ANON_KEY` dari dashboard
   Supabase (Project Settings → API). Ambil yang **anon**, bukan service_role.
2. **Akun staff untuk pengujian** — email & password kasir yang sudah terdaftar
   di `staff_users` dengan `is_active = true`.
3. **Printer sudah ter-pair** ke tablet lewat Pengaturan Bluetooth Android.
   Aplikasi hanya memilih dari daftar perangkat yang sudah dipasangkan, tidak
   melakukan pairing sendiri.
4. **Tablet fisik.** Emulator Android **tidak punya Bluetooth Classic** — modul
   printer mustahil diuji di emulator. Siapkan tablet + kabel USB debugging sejak
   awal.

---

## Alur data singkat

```
        login (JWT) + realtime WS          ┌──────────────┐
   ┌────────────────────────────────────▶ │   Supabase   │
   │        (tablet yang memulai)          └──────────────┘
   │                                              ▲
┌──┴───────────┐                                  │ service_role
│   Tablet     │   HTTPS + Bearer          ┌──────┴────────┐
│  (Flutter)   │ ────────────────────────▶ │    Vercel     │
└──────┬───────┘   baca data & semua aksi  │  API Routes   │
       │                                    └──────────────┘
       │ Bluetooth SPP
       ▼
┌──────────────┐
│ Panda        │
│ PRJ-R58D     │
└──────────────┘
```

Server **tidak bisa** menghubungi tablet (tidak ada IP publik, di balik NAT
operator). Karena itu tablet selalu yang memulai koneksi: polling ke REST API,
dan websocket keluar ke Supabase untuk notifikasi realtime.
