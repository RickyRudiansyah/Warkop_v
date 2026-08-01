# Design Documentation — POS Self-Order UI
### Dine-in Self-Order Ordering System

Dokumen ini merangkum spesifikasi desain berdasarkan hasil observasi terhadap UI aplikasi self-order (halaman `products`).

---

## 1. Overview

Aplikasi ini adalah **halaman pemesanan mandiri (self-order) untuk pelanggan dine-in**, diakses melalui link/QR code yang unik per meja. Struktur halaman terdiri dari 4 bagian tetap:

1. Header (info outlet & meja)
2. Search bar
3. Navigasi kategori (2 level: tab utama + sidebar sub-kategori)
4. Daftar produk (scrollable)
5. Bottom bar (order summary, sticky)

---

## 2. Color Palette

| Nama | Hex (perkiraan) | Penggunaan |
|---|---|---|
| Primary Yellow | `#F2D94E` / `#EEDB5E` | Header background, tab underline, tombol "+", tombol back, aksen ikon aktif |
| Dark / Near-black | `#1A1A1A` | Bottom bar background, teks judul produk, teks header |
| White | `#FFFFFF` | Background utama konten & search bar |
| Gray (secondary text) | `#8A8A8A` | Deskripsi produk, sub-kategori tidak aktif |
| Black text on yellow | `#111111` | Teks di atas bottom bar / tombol ORDER |

**Prinsip warna:** kuning sebagai warna brand/aksen utama, hitam sebagai warna kontras untuk CTA & teks penting, putih sebagai kanvas netral agar foto produk menonjol.

---

## 3. Typography

| Elemen | Style |
|---|---|
| Nama outlet/meja (header) | Bold, uppercase, ukuran medium (~16px) |
| Label "Dine-in" | Regular, kecil (~12px) |
| Nama kategori (judul section, mis. "Inspirasi", "Croissant") | Bold, ukuran besar (~20px), warna gelap |
| Nama produk | Semi-bold (~15px), warna hitam |
| Deskripsi produk | Regular, warna abu-abu (~14px), line-height longgar |
| Harga produk | Bold, hitam (~15px) |
| Tab kategori utama | Uppercase, letter-spacing sedang, aktif = bold + underline |
| Sub-kategori (sidebar) | Regular kecil, aktif = warna lebih gelap + ikon kuning |
| Order Total / ORDER button | Bold, kontras tinggi |

Font terlihat sans-serif modern (kemungkinan Inter, Poppins, atau sejenis — geometris, mudah dibaca).

---

## 4. Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ HEADER (yellow bg)                                       │
│  Dine-in                                    Hi, rr  [👤] │
│  POS ENAM DUA MKB - LT1 INDOOR / 309                     │
├─────────────────────────────────────────────────────────┤
│ SEARCH BAR (white, rounded)                        [🔍]  │
├─────────────────────────────────────────────────────────┤
│ TAB UTAMA: COMBO | BEVERAGES | PASTRY | FOOD    [scroll] │
├────────────┬────────────────────────────────────────────┤
│  SIDEBAR   │  SECTION TITLE (mis. "Inspirasi")           │
│  (icon +   │  ┌────────┐  Nama Produk                 [+]│
│   label)   │  │ image  │  Deskripsi produk...             │
│            │  └────────┘  Rp xx.000.00                   │
│  item 1    │  ┌────────┐  Nama Produk                 [+]│
│  item 2    │  │ image  │  Deskripsi produk...             │
│  item 3    │  └────────┘  Rp xx.000.00                   │
│  ...       │  (scrollable list)                          │
├────────────┴────────────────────────────────────────────┤
│ BOTTOM BAR (dark bg, sticky)                              │
│ [◀]  [🛒 Order Total]      Rp 0.00           [ ORDER ]   │
└─────────────────────────────────────────────────────────┘
```

### Grid & Spacing
- Sidebar sub-kategori: kolom sempit tetap (~80–100px), item disusun vertikal dengan jarak konsisten.
- Card produk: layout horizontal (image kiri, teks kanan), full-width terhadap kolom konten.
- Padding antar section cukup lega, memberi ruang napas antar produk.
- Tombol "+" ditempatkan di ujung kanan sejajar dengan harga (align dengan gambar produk secara vertikal).

---

## 5. Components

### 5.1 Header
- Background kuning solid.
- Info kiri: label kecil "Dine-in" + judul bold nama toko & posisi meja.
- Info kanan: greeting user + icon avatar.

### 5.2 Search Bar
- Full width, rounded corner, background putih dengan sedikit shadow.
- Icon search di kanan dalam lingkaran kuning.

### 5.3 Category Tabs (Level 1)
- Horizontal tab list: COMBO, BEVERAGES, PASTRY, FOOD.
- State aktif: bold + underline hitam.
- State non-aktif: regular, warna lebih pudar.

### 5.4 Sub-category Sidebar (Level 2)
- Vertikal, tiap item = icon + label kecil di bawahnya.
- State aktif: icon berwarna kuning terang, label lebih gelap/bold.
- State non-aktif: icon outline/pucat.

### 5.5 Product Card
- Gambar produk (rounded square, ~230x230px).
- Nama produk (bold), kadang dengan icon kecil prefix (mis. 🥐 untuk pastry).
- Deskripsi singkat (abu-abu, 1–2 baris).
- Harga (bold, format `Rp xx.000.00`).
- Tombol tambah "+" (bulat, kuning, di kanan card), muncul tooltip nama produk saat hover.

### 5.6 Scroll Control
- Panah atas/bawah kecil + scrollbar tipis di sisi kanan list produk.

### 5.7 Bottom Bar (Sticky Footer)
- Background gelap (near-black), selalu terlihat di bawah layar.
- Kiri: tombol back bulat kuning (ikon panah kiri).
- Tengah-kiri: icon keranjang + label "Order Total" + nominal total (update real-time).
- Kanan: tombol CTA besar "ORDER" (kuning, rounded, bold).

---

## 6. Interaction Notes

- Klik tombol "+" pada produk → menambah item ke keranjang → `Order Total` di bottom bar ter-update otomatis.
- Tab kategori & sub-kategori sinkron: memilih tab utama akan mereset/menampilkan sub-kategori yang sesuai di sidebar.
- Search bar kemungkinan melakukan filter real-time terhadap seluruh produk lintas kategori.
- Tombol "ORDER" di bottom bar kemungkinan mengarah ke halaman ringkasan keranjang/checkout.
- Tombol back (◀) di bottom bar kemungkinan untuk kembali ke halaman sebelumnya (mis. landing/welcome page meja).

---

## 7. Content Pattern (per produk)

Setiap entri produk konsisten mengikuti pola:
```
[Gambar] Nama Produk
         Deskripsi singkat (1–2 kalimat, storytelling ringan)
         Rp harga.000.00                     [+]
```

Deskripsi produk ditulis dengan gaya bahasa promosi ringan (bukan hanya daftar bahan), contoh nada: *"Perpaduan kopi dan susu segar dengan manis alami dari gula aren khas Indonesia."*

---

## 8. Observed Categories & Sample Items

| Tab Utama | Sub-kategori | Contoh Produk |
|---|---|---|
| Beverages | Inspirasi | Kopinya Warga +62 (Rp 29.000), Aren Frappe (Rp 35.000) |
| Pastry | Croissant | Croissant Almond (Rp 35.000), Croissant Blueberry Danish (Rp 28.000) |
| Food | Fried Rice | Nasi Goreng Kampung (Rp 40.000), Nasi Goreng +62 (Rp 45.000) |

*(Kategori lain seperti Combo, Classic, Sparkling & Smoothies, Tea & Powders, Roll Cake, Roti Sobek, Slice Cake, Noodle, Soto, Pasta, Rice Bowl, Snack, Others belum di-capture isinya — hanya nama kategori dari sidebar.)*

---

## 9. Open Questions / Belum Teramati

- Tampilan detail produk saat card diklik (modal/halaman baru?) — belum terlihat di screenshot.
- Tampilan keranjang/checkout setelah klik "ORDER".
- Behavior search bar saat mengetik (dropdown suggestion / instant filter).
- Responsif di layar mobile — screenshot yang ada tampak versi desktop/tablet lebar.
- Ada/tidaknya varian produk (size, topping, level pedas, dll) saat menambah ke keranjang.