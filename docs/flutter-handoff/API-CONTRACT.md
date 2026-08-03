# Kontrak API — Backend Rumipang

Rujukan lengkap untuk aplikasi kasir Flutter. **Dokumen ini mandiri** — tidak
perlu membuka repo web untuk memakainya.

* Base URL produksi: `https://rumipang.vercel.app`
* Contoh respons asli: [`api-samples.json`](api-samples.json)

---

## 1. Autentikasi

Backend memakai Supabase Auth. Alurnya:

1. Login lewat Supabase SDK → dapat `access_token` (JWT)
2. Kirim di tiap request: `Authorization: Bearer <access_token>`
3. Server memverifikasi JWT, lalu mencocokkan `user.id` dengan tabel `staff_users`

Akun harus ada di `staff_users` dengan `is_active = true`. Role yang berlaku
hanya **`cashier`** dan **`owner`** (role `koki` sudah dihapus).

Token berlaku ±1 jam dan disegarkan otomatis oleh SDK. **Ambil ulang
`accessToken` tepat sebelum tiap request**, jangan disimpan sekali saat login.

> Dukungan header `Authorization: Bearer` **sudah aktif** di backend — endpoint
> staff siap dipanggil dari aplikasi Flutter.

Endpoint printer punya alternatif: header `x-print-token: <PRINT_DEVICE_TOKEN>`
untuk alat cetak tanpa login. Aplikasi kasir **cukup pakai Bearer**.

---

## 2. Konsep Data yang Wajib Dipahami

### Dua status yang terpisah

```
status          -> siklus DAPUR    : QUEUED → PROCESSING → SERVED   (atau CANCELLED)
payment_status  -> siklus UANG     : UNPAID → PAID
```

Keduanya **tidak saling menyimpulkan**. Sebuah order bisa `SERVED` tapi masih
`UNPAID` (makanan sudah diantar, pelanggan belum bayar di kasir). Jangan pernah
menurunkan salah satu dari yang lain.

### Dua jalur pembayaran

| | CASH | QRIS |
|---|---|---|
| Kapan order dibuat | saat pelanggan checkout | **hanya setelah** pembayaran terkonfirmasi |
| `payment_status` awal | `UNPAID` | langsung `PAID` |
| Kapan struk dibuat | saat kasir menekan verifikasi | otomatis saat settle |
| Peran aplikasi kasir | **memicu** pelunasan | hanya mencetak |

Konsekuensi penting: order QRIS yang gagal bayar **tidak pernah muncul** di board
kasir — tidak ada "order hantu" yang perlu dibersihkan.

### Struk hanya untuk order lunas

`print_jobs` **tidak pernah** dibuat untuk order `UNPAID`. Aplikasi tidak boleh
mencetak struk atas inisiatif sendiri di luar antrian server.

---

## 3. Endpoint Order

### `GET /api/orders?mode=cashier` — board kasir
Order aktif: non-arsip, non-cancel. **Termasuk `SERVED` yang belum diarsipkan**,
supaya tagihan yang belum dibayar tidak hilang dari layar.

### `GET /api/orders` — board dapur
Hanya `QUEUED` & `PROCESSING`.

### `GET /api/orders/history`
Order yang sudah diarsipkan **atau** dibatalkan.

### `POST /api/orders` — order manual (POS)
```jsonc
{
  "table_id": "uuid | null",
  "payment_method": "CASH",        // CASH | QRIS
  "payment_status": "UNPAID",      // PAID | UNPAID
  "total_amount": 23000,
  "notes": "Order manual",
  "items": [{
    "menu_item_id": "uuid",
    "menu_item_name": "Es Kopi Susu",
    "menu_item_price": 18000,
    "quantity": 1,
    "variations": [{ "variation_type": "Ukuran", "label": "Large", "extra_price": 3000 }],
    "subtotal": 21000,
    "notes": null
  }]
}
```
Balasan `201` berisi order yang dibuat. Kalau `payment_status: "PAID"` dan
request membawa identitas staff, **struk otomatis diantrikan**.

> `total_amount` dan `subtotal` dihitung klien, server tidak memverifikasi ulang.
> Pastikan perhitungan di aplikasi benar: `(harga + total extra_price) × qty`.

### `PATCH /api/orders/{id}/mark-paid` — verifikasi tunai
Tanpa body. Ini **satu-satunya** cara melunasi order tunai.

```jsonc
// 200 — order + penanda antrian cetak
{ "id": "...", "payment_status": "PAID", "print_queued": true }

// 400 — sudah lunas sebelumnya
{ "error": "Order is already paid" }
```

`print_queued: false` berarti pelunasan berhasil tapi struk gagal diantrikan —
tampilkan peringatan dan tawarkan cetak ulang. Jangan gagalkan transaksinya.

### `PATCH /api/orders/{id}/status`
```jsonc
{ "status": "PROCESSING", "estimated_minutes": 10 }   // atau { "status": "SERVED" }
```
`estimated_minutes` opsional; kalau diisi, `estimated_ready_at` = sekarang + menit.

### `PATCH /api/orders/{id}/update-eta`
```jsonc
{ "estimated_minutes": 5 }   // 1–1440
```
**Menambah** dari ETA yang sedang berjalan (bukan menimpa dari waktu sekarang) —
kalau ETA lama sudah lewat, dihitung dari sekarang.

### `PATCH /api/orders/{id}/cancel`
```jsonc
{ "reason": "Pelanggan membatalkan" }
```
Ditolak `400` kalau status sudah `SERVED` atau `CANCELLED`.

### `PATCH /api/orders/{id}/archive`
Tanpa body → `is_archived = true`, order pindah ke history.

**Aturan UI (samakan dengan web):**

| Tombol | Syarat tampil |
|---|---|
| Verifikasi & Cetak Struk | `payment_status == UNPAID` |
| Batalkan | `status == QUEUED` |
| Mulai Proses | `status == QUEUED` |
| Sudah Diantar | `status == PROCESSING` |
| Selesai (arsip) | **semua** order di meja itu `SERVED` **dan** `PAID` |

---

## 4. Endpoint Printer

### `GET /api/print/jobs?claim=1&limit=5`
Mengambil job `PENDING` **sekaligus menguncinya** jadi `PRINTING`. Aman untuk
banyak perangkat — satu job hanya bisa diklaim satu perangkat.

```jsonc
{ "jobs": [ { "id": "...", "text_body": "...", "payload": { }, ... } ] }
```

### `GET /api/print/jobs`
50 job terakhir (semua status) untuk layar monitoring. **Tidak** mengunci apa pun.

### `PATCH /api/print/jobs/{id}/ack` — WAJIB
```jsonc
{ "status": "PRINTED" }
{ "status": "FAILED", "error": "Printer tidak terhubung" }
```
Job `PRINTING` yang tidak di-ACK dalam **2 menit** otomatis kembali ke `PENDING`.
Kalau aplikasi lupa ACK, struk yang sama akan tercetak dua kali.

### `POST /api/print/jobs` — cetak ulang
```jsonc
{ "order_id": "uuid", "verified_by": "Kasir 1" }
```

### `POST /api/print/jobs/{id}/retry`
Kembalikan job gagal ke antrian.

### Siklus hidup job

```
PENDING ──(GET ?claim=1)──▶ PRINTING ──(ack PRINTED)──▶ PRINTED
                                │
                                ├──(ack FAILED)──▶ FAILED ──(retry)──▶ PENDING
                                └──(tanpa ACK >2 menit)──▶ PENDING  (otomatis)
```

### Isi struk

Server menyediakan dua bentuk — **pakai `text_body`**, tidak perlu menyusun
format sendiri:

* **`text_body`** — teks siap kirim, **32 kolom** (kertas 58 mm), sudah rata
  kiri-kanan dan terpotong sesuai lebar.
* **`payload`** — struk terstruktur, kalau nanti mau format kustom/logo.

`kind`: `RECEIPT` (struk otomatis, **satu per order**, dijaga unique index) atau
`REPRINT` (cetak ulang manual, boleh berkali-kali).

`trigger`: `QRIS_SETTLED` | `CASH_VERIFIED` | `CASHIER_PAID_ORDER` | `STAFF_REPRINT`.

---

## 5. Endpoint Pendukung

| Method | Endpoint | Auth | Catatan |
|---|---|---|---|
| GET | `/api/tables` | publik | Meja aktif, urut nomor |
| GET | `/api/menu` | publik | Termasuk `is_sold_out` & `is_available` |
| GET | `/api/menu/variations` | publik | Semua variasi; saring sendiri per `menu_item_id` |
| POST | `/api/activity-logs` | staff | `{ actor_email, actor_role, action, target_type, target_id, detail }` |
| GET | `/api/health` | publik | Cek koneksi |

---

## 6. Realtime (Supabase)

Tabel yang sudah masuk publikasi realtime: **`orders`**, **`order_items`**,
**`print_jobs`**.

Perlakukan event realtime **hanya sebagai pemicu refetch**, bukan sumber data —
payload-nya tidak membawa relasi (`table`, `items`), jadi tetap ambil ulang lewat
REST.

Websocket bisa putus tanpa pemberitahuan saat pindah WiFi ↔ 4G. Sediakan polling
cadangan (15–30 detik) dan refetch saat aplikasi kembali ke foreground.

---

## 7. Penanganan Error

| Kode | Arti | Tindakan |
|---|---|---|
| 401 | Token tidak valid/kedaluwarsa | `refreshSession()` sekali, lalu ke layar login |
| 400 | Aturan bisnis dilanggar | Tampilkan `error` dari server apa adanya |
| 404 | Order/job tidak ada | Refresh daftar |
| 500 | Kesalahan server | Coba lagi dengan backoff |

Bentuk error selalu: `{ "error": "pesan" }`.

**Jangan optimistic update untuk uang.** Baru tandai lunas di UI setelah server
membalas 200 — sumber kebenaran ada di database, bukan di tablet.
