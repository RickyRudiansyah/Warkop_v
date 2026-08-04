# Bagian yang Dikerjakan Aplikasi (Flutter)

Pendamping dokumen kebutuhan backend. Isinya: **apa yang dibangun di aplikasi**,
dan yang sama pentingnya — **apa yang sebaiknya TIDAK dibangun di aplikasi**.

Aturan yang tidak berubah: aplikasi **tidak pernah menulis ke tabel Supabase
langsung**. Semua lewat REST API. Supabase SDK hanya untuk login & realtime.

---

## 0. Yang sudah beres di sisi web

**Bearer auth sudah aktif** (4 Agustus 2026). Endpoint staff sekarang menerima
`Authorization: Bearer <JWT>`. Terverifikasi: Bearer → 200, cookie web → 200,
tanpa auth → 401, token palsu → 401.

Jadi §0 di dokumen backend sudah tidak memblokir apa pun.

---

## 1. Yang sebaiknya TIDAK dibangun di aplikasi

### 1.1 CRUD menu lengkap — biarkan di web

Dashboard web **sudah punya** manajemen menu lengkap: tambah, edit, hapus,
unggah gambar, kelola variasi. Membangun ulang semuanya di tablet berarti dua
tempat yang harus dirawat, dan justru bagian yang paling menyiksa di layar
sentuh: mengetik deskripsi panjang dan mengunggah foto produk.

**Yang dibangun di aplikasi hanya operasi harian:**

| Aksi | Di aplikasi? | Alasan |
|---|---|---|
| Ubah harga | ✅ ya | Sering, mendesak, satu angka |
| Toggle sold out | ✅ ya | Paling sering dipakai, harus cepat |
| Isi/ubah HPP | ✅ ya | Owner mengisinya sambil melihat menu |
| Tambah menu baru | ❌ web | Butuh foto + deskripsi + variasi |
| Hapus menu | ❌ web | Jarang, berisiko, perlu layar lebar |
| Unggah gambar | ❌ web | Sudah jalan di web |
| Kelola variasi | ❌ web | Form bertingkat, tidak cocok di tablet |

Kalau nanti terbukti owner tidak pernah membuka web sama sekali, CRUD penuh bisa
ditambahkan belakangan — tapi jangan dibangun di awal atas dasar dugaan.

### 1.2 Jangan kirim `cost_price_snapshot` dari aplikasi

Kolom itu **diisi server** dengan menyalin `menu_items.cost_price` saat order
dibuat. Aplikasi cukup mengirim item seperti biasa.

Kalau klien yang mengirim nilai HPP, siapa pun yang bisa memanggil API bisa
memalsukan angka laba. Laporan keuntungan jadi tidak bisa dipercaya, dan
kesalahannya tidak akan pernah ketahuan karena datanya terlihat wajar.

Hal yang sama berlaku untuk `cost_snapshot` di jatah makan karyawan.

---

## 2. Yang dibangun di aplikasi

Semua di bawah ini **UI-nya di aplikasi**, **API & tabelnya di web**.

### 2.1 HPP & operasi menu harian

Layar daftar menu dengan aksi cepat per item:

```
┌──────────────────────────────────────────────────────────┐
│ Roti Panggang                                             │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ ROPOSU                          Rp 11.000   [ubah]   │ │
│ │ HPP  Rp 4.000     margin 64%                [ubah]   │ │
│ │ [ Tersedia ●───  ]                                    │ │
│ └──────────────────────────────────────────────────────┘ │
│ │ ROSISIR                         Rp 11.000   [ubah]   │ │
│ │ HPP  belum diisi ⚠              margin —    [ubah]   │ │
```

* Margin = `(price - cost_price) / price`. Tampilkan **merah** kalau
  `cost_price >= price`, dan tampilkan `—` kalau HPP masih 0.
* HPP `0` berarti **belum diisi**, bukan gratis. Bedakan tampilannya.
* Endpoint: `PATCH /api/menu/:id` dengan body parsial, mis. `{ "price": 12000 }`
  atau `{ "cost_price": 4000 }`.
* Setelah sukses, perbarui daftar dari respons — jangan optimistic update untuk
  angka uang.

### 2.2 Laporan menu terlaris & kurang laku

`GET /api/reports/menu-sales?from=<ISO>&to=<ISO>`

* Pemilih rentang: **Hari Ini / 7 Hari / 30 Hari / Kustom**.
* Dua daftar dari data yang sama: urut `qty_sold` menurun (terlaris) dan menaik
  (kurang laku).
* Menu dengan `qty_sold: 0` **wajib ditampilkan** di daftar kurang laku — justru
  itu yang paling ingin dilihat owner. Jangan disaring.
* Per baris tampilkan: qty, omzet, HPP, laba kotor. Beri tanda kalau
  `gross_profit <= 0`.
* Kalau ada menu dengan HPP 0, tampilkan catatan di atas laporan: *"N menu belum
  diisi HPP — angka laba belum lengkap."* Tanpa itu, owner akan mengira labanya
  besar padahal biayanya belum dihitung.

### 2.3 Stok bahan baku

`GET /api/ingredients` · `POST /api/ingredients` · `PATCH /api/ingredients/:id`
`POST /api/ingredients/:id/movements`

* Daftar bahan + stok + ambang peringatan. Bahan di bawah ambang tampil di atas
  dengan penanda merah.
* Penyesuaian stok **wajib** lewat `/movements` dengan `delta`, bukan menimpa
  `stock_qty`. Dua tablet yang menyesuaikan bersamaan akan saling menimpa kalau
  pakai nilai absolut.
* Form penyesuaian: `delta` (boleh negatif), `reason`
  (`PURCHASE` / `USAGE` / `WASTE` / `CORRECTION`), catatan opsional.
* Tampilkan riwayat pergerakan per bahan — inilah gunanya tabel audit itu.

> **Stok tidak berkurang otomatis saat ada penjualan.** Karena HPP diisi manual
> tanpa resep, sistem tidak tahu satu Roposu menghabiskan berapa gram roti.
> Tulis ini jelas di layar stok, supaya tidak ada yang mengira angkanya
> ter-update sendiri lalu kaget saat selisih.

### 2.4 Jatah makan karyawan

`GET /api/staff` · `GET /api/staff-meals?date=` · `POST /api/staff-meals`
· `DELETE /api/staff-meals/:id`

* Layar harian: 3 nama karyawan, masing-masing menunjukkan sudah/belum
  mengambil jatah hari ini.
* Server menegakkan aturan 1× sehari lewat unique constraint. Kalau dilanggar
  server membalas **409** dengan pesan siap tampil — **tampilkan pesan server
  apa adanya**, jangan mengarang pesan sendiri.
* Jangan mengandalkan pengecekan di aplikasi saja: dua tablet bisa mencatat
  bersamaan dan keduanya lolos pemeriksaan lokal.
* Sediakan hapus untuk koreksi salah input.

### 2.5 Pemilih tema event

`GET /api/settings/theme` · `PATCH /api/settings/theme`

* Lima preset: `NORMAL`, `NATAL`, `RAMADAN`, `KEMERDEKAAN`, `IMLEK`.
* Tampilkan sebagai kartu dengan pratinjau warna, bukan dropdown teks.
* Kalau server mengirim preset yang tidak dikenal aplikasi, **jatuh ke `NORMAL`
  tanpa error** — web bisa saja menambah preset lebih dulu.
* Ubah tema hanya untuk role `owner`.

### 2.6 Hapus layar dapur

Buang layar dapur, tombol ETA, "mulai proses", dan "sudah diantar" dari
aplikasi. Endpoint terkait boleh tetap ada di server — aplikasi berhenti
memanggilnya.

⚠️ **Sebelum ini dikerjakan, baca §3.1** — ada konsekuensi ke pelanggan yang
belum diputuskan.

---

## 3. Hal yang perlu diputuskan dulu

### 3.1 `status = SERVED` saat order dibuat — jangan langsung diterapkan

Dokumen backend meminta server menandai order `SERVED` begitu dibuat, supaya
order bisa diarsipkan (aturan arsip mensyaratkan `SERVED` + lunas).

Masalahnya: **halaman lacak pesanan milik pelanggan menampilkan status dapur.**
Di web sekarang bentuknya tiga langkah:

```
Pesanan Diterima  →  Sedang Diproses  →  Sudah Diantar
```

Kalau setiap order langsung `SERVED`, pelanggan yang membuka tautan lacak akan
melihat **"Sudah Diantar" dengan semua langkah tercentang** padahal makanannya
belum dibuat. Ini bukan sekadar tidak rapi di internal — ini menampilkan
informasi yang salah ke pelanggan.

Dua jalan keluar:

| | Cara | Konsekuensi |
|---|---|---|
| **A** (disarankan) | Order tetap `QUEUED`; **ubah aturan arsip** jadi cukup `payment_status = PAID` | Status tetap jujur, alur dapur bisa dihidupkan lagi kapan saja. Perlu ubah satu baris di board kasir web + aturan yang sama di aplikasi |
| **B** | Server set `SERVED` saat dibuat (sesuai dokumen) | Halaman lacak pesanan **wajib** diubah juga: buang langkah dapur, sisakan status pembayaran saja. Kalau tidak, pelanggan dibohongi |

Yang **tidak boleh** dilakukan adalah menerapkan B tanpa mengubah halaman lacak
pesanan. Itu pilihan yang paling mudah dilewatkan karena di sisi kasir semuanya
terlihat normal — yang melihat kejanggalan cuma pelanggan.

Keputusan ini menyangkut web **dan** aplikasi, jadi tetapkan dulu sebelum layar
dapur dihapus.

---

## 4. Koreksi terhadap dokumen backend

Hal-hal yang kalau dituruti apa adanya akan gagal diam-diam:

| Di dokumen | Kenyataannya |
|---|---|
| `staff_meals.staff_id references staff(id)` | Tabelnya bernama **`staff_users`**, bukan `staff` |
| Soft delete pakai `is_active` di `menu_items` | Kolom `is_active` **tidak ada** di `menu_items` (adanya di `tables` & `staff_users`). Perlu kolom baru — jangan pakai `is_available`, artinya beda: "habis hari ini" ≠ "dihapus" |
| `PATCH /api/menu/:id` | Yang ada sekarang **`PUT`**. Perlu ditambah PATCH, atau aplikasi memakai PUT |
| Endpoint `start-processing` & `mark-served` | Tidak ada dengan nama itu — yang ada `PATCH /api/orders/:id/status` |
| Tambah `cost_price` ke `menu_items` | **Belum cukup.** Ada whitelist `ALLOWED_MENU_FIELDS` di `app/api/menu/route.ts`; field di luar daftar itu **dibuang diam-diam tanpa error**. `cost_price` harus ditambahkan ke sana, kalau tidak POST/PUT akan balas 200 tapi HPP-nya tidak tersimpan |

Yang terakhir itu jenis kesalahan paling mahal: API membalas sukses, aplikasi
menampilkan "tersimpan", tapi datanya hilang.

---

## 5. Urutan pengerjaan aplikasi

Mengikuti urutan backend, karena tiap layar butuh endpointnya lebih dulu.

| Tahap | Layar | Menunggu backend |
|---|---|---|
| 1 | Harga & sold-out cepat + isi HPP | `cost_price` + `PATCH /api/menu/:id` |
| 2 | Pemilih tema | `app_settings` + endpoint tema |
| 3 | Stok bahan + peringatan | `ingredients` + `stock_movements` |
| 4 | Jatah makan karyawan | `staff_meals` + `GET /api/staff` |
| 5 | Laporan menu | `GET /api/reports/menu-sales` |
| 6 | Hapus layar dapur | setelah §3.1 diputuskan |

Tahap 6 sengaja paling akhir: menghapus fitur itu mudah, tapi mengembalikannya
setelah alurnya terlanjur diubah tidak.
