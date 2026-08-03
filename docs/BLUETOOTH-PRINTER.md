# Cetak Struk ke Printer Bluetooth (Aplikasi Android)

Kontrak integrasi antara server Rumipang dan aplikasi Android yang memegang
printer thermal Bluetooth.

---

## 1. Kapan struk dicetak

Struk **hanya** dibuat untuk order yang sudah **LUNAS**:

| Metode | Pemicu | `trigger` |
|---|---|---|
| QRIS | Otomatis begitu Midtrans menyatakan `settlement` (webhook atau status poll) | `QRIS_SETTLED` |
| Cash | Kasir menekan **"Verifikasi & Cetak Struk"** di `/dashboard/cashier` | `CASH_VERIFIED` |
| Cash/QRIS (order manual kasir) | Order dibuat kasir dengan status lunas | `CASHIER_PAID_ORDER` |
| Apa pun | Tombol cetak ulang oleh staff | `STAFF_REPRINT` |

Order cash yang belum diverifikasi **tidak** menghasilkan struk — pesanannya
tetap masuk ke dapur, tapi struk baru keluar setelah uangnya diterima kasir.

Satu order hanya bisa punya **satu** struk otomatis (`kind = 'RECEIPT'`,
dijaga unique index). Webhook dan status poll boleh sama-sama memicu — yang
kedua diabaikan tanpa error. Cetak ulang memakai `kind = 'REPRINT'` dan
jumlahnya bebas.

## 2. Siklus hidup job

```
PENDING ──(GET ?claim=1)──> PRINTING ──(PATCH ack PRINTED)──> PRINTED
                                │
                                ├──(PATCH ack FAILED)──> FAILED ──(retry)──> PENDING
                                │
                                └──(tanpa ACK > 2 menit)──> PENDING  (otomatis)
```

Job `PRINTING` yang tidak di-ACK dalam 2 menit dikembalikan ke `PENDING`, jadi
aplikasi yang mati/keluar tidak membuat struk hilang.

## 3. Autentikasi

Aplikasi Android memakai token perangkat, bukan login staff:

```
x-print-token: <PRINT_DEVICE_TOKEN>     # wajib
x-print-device: kasir-tab-01            # opsional, dicatat di kolom device_id
```

Isi `PRINT_DEVICE_TOKEN` di `.env` server. Buat token acak:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Token ini setara kunci baca seluruh antrian struk. Simpan di
> `EncryptedSharedPreferences`, jangan di-hardcode dalam APK yang disebar publik.

## 4. Endpoint

### Ambil & kunci job — `GET /api/print/jobs?claim=1&limit=5`

Mengembalikan job `PENDING` sekaligus menguncinya jadi `PRINTING`. Aman untuk
banyak perangkat: satu job hanya bisa diklaim satu perangkat.

```json
{
  "jobs": [
    {
      "id": "8f3c...",
      "order_id": "1b9e...",
      "kind": "RECEIPT",
      "status": "PRINTING",
      "trigger": "QRIS_SETTLED",
      "text_body": "            RUMIPANG\n--------------------------------\nNo  ...",
      "payload": { "order_no": "A3F91C", "table_label": "Meja 4", "total": 27000, "items": [] },
      "attempts": 0,
      "created_at": "2026-08-03T04:12:55.120Z"
    }
  ]
}
```

* **`text_body`** — teks siap kirim ke printer ESC/POS. Lebar tetap 32 kolom
  (kertas 58mm, Font A). Cukup `outputStream.write(text_body.toByteArray(Charsets.US_ASCII))`
  lalu feed + cut. Ini jalur paling cepat untuk dipakai.
* **`payload`** — struk terstruktur (JSON) kalau ingin format sendiri, misalnya
  logo bitmap, nama toko dobel-tinggi, atau QR code order.

Tanpa `claim=1` endpoint ini mengembalikan 50 job terakhir (semua status) untuk
monitoring — dipakai halaman `/dashboard/printer`.

### Konfirmasi hasil cetak — `PATCH /api/print/jobs/{id}/ack`

```json
{ "status": "PRINTED" }
```
```json
{ "status": "FAILED", "error": "Printer tidak terhubung" }
```

**Wajib dipanggil.** Tanpa ACK, job akan diantrikan ulang setelah 2 menit dan
struk tercetak dua kali.

### Cetak ulang — `POST /api/print/jobs`

Butuh session staff (bukan token perangkat). Dipakai dashboard.

```json
{ "order_id": "1b9e...", "verified_by": "Kasir" }
```

## 5. Dua pilihan transport

**A. Polling (paling sederhana, disarankan untuk versi pertama)**

Foreground Service + `WorkManager`, panggil `GET /api/print/jobs?claim=1` tiap
3–5 detik. Tahan terhadap jaringan putus, tidak perlu koneksi persisten.

**B. Realtime Supabase (opsional)**

Tabel `print_jobs` sudah masuk publikasi `supabase_realtime`. Aplikasi bisa
subscribe event INSERT lalu langsung memanggil `?claim=1` saat ada job baru.
Gunakan polling sebagai jaring pengaman kalau websocket putus.

## 6. Kerangka implementasi Android

```kotlin
// 1. Pair printer via Bluetooth Settings, cari device-nya:
val printer = bluetoothAdapter.bondedDevices.first { it.name.contains("RPP02") }
val socket = printer.createRfcommSocketToServiceRecord(SPP_UUID) // 00001101-0000-1000-8000-00805F9B34FB
socket.connect()

// 2. Ambil job
val jobs = api.claimJobs(token = deviceToken, limit = 5).jobs

// 3. Cetak
jobs.forEach { job ->
    try {
        socket.outputStream.apply {
            write(byteArrayOf(0x1B, 0x40))                       // ESC @  -> reset
            write(job.textBody.toByteArray(Charsets.US_ASCII))
            write("\n\n\n".toByteArray())
            write(byteArrayOf(0x1D, 0x56, 0x00))                 // GS V 0 -> potong kertas
            flush()
        }
        api.ack(job.id, "PRINTED")
    } catch (e: IOException) {
        api.ack(job.id, "FAILED", e.message)
    }
}
```

Izin yang dibutuhkan (Android 12+):
`BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, `INTERNET`, `FOREGROUND_SERVICE`.

Karakter non-ASCII sebaiknya dihindari di nama menu — banyak printer thermal
murah hanya mendukung code page 437/850.

## 7. Uji tanpa printer fisik

1. Jalankan `npm run dev`
2. `npm run test:qris` — bayar di simulator sandbox Midtrans, script akan
   memastikan struk masuk antrian dan mencetak isinya ke terminal
3. Buka `/dashboard/printer` untuk melihat antrian & pratinjau struk
4. Simulasikan aplikasi Android dari terminal:

```bash
curl -H "x-print-token: $PRINT_DEVICE_TOKEN" \
     "http://localhost:3000/api/print/jobs?claim=1"

curl -X PATCH -H "x-print-token: $PRINT_DEVICE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"status":"PRINTED"}' \
     "http://localhost:3000/api/print/jobs/<JOB_ID>/ack"
```
