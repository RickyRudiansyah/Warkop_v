# Design Documentation — Self-Order UI (Mobile Web)
### Dine-in QR Self-Order — Warm Brown Theme

Dokumen ini merangkum spesifikasi desain UI pemesanan mandiri berbasis QR code, hasil observasi terhadap referensi aplikasi self-order mobile (TabSquare) dan **arah visual baru bertema coklat kayu**, mengikuti identitas menu cetak Rumipang.

> **Perubahan utama dari versi sebelumnya:** target device berubah dari desktop/tablet ke **mobile-first**, layout produk berubah dari list horizontal ke **grid 2 kolom**, navigasi kategori berubah dari sidebar ke **icon pill horizontal + modal All Category**, dan palet warna bergeser dari kuning-putih ke **coklat kayu + gold**.

---

## 1. Overview

Halaman pemesanan mandiri untuk pelanggan dine-in, diakses lewat scan QR unik per meja. Seluruh UI dirancang **mobile-first** (viewport ~360–430px), karena diakses dari browser HP pelanggan.

Struktur halaman:

1. **Header** — hamburger, table pill, logo outlet (sticky)
2. **Search bar** — pencarian menu lintas kategori
3. **Category strip** — icon bulat horizontal + tombol expand ke modal "All Category"
4. **Section title** — nama kategori aktif
5. **Product grid** — kartu produk 2 kolom (scrollable)
6. **Cart bar** — ringkasan pesanan, sticky di bawah

Overlay/sheet yang tersedia:

- **Product detail sheet** (bottom sheet) — foto besar, deskripsi, CTA Add to Cart
- **All Category modal** — grid icon semua kategori
- **Side drawer** — Account + daftar kategori dalam bentuk teks

---

## 2. Color Palette — Warm Brown

Palet diturunkan dari desain menu cetak: latar kayu coklat gelap, aksen gold/amber, teks krem.

### 2.1 Brand & Surface

| Token | Hex | Penggunaan |
|---|---|---|
| `--brown-950` | `#1A1008` | Frame terluar, bottom bar, teks paling gelap |
| `--brown-900` | `#2B1D14` | Header background, side drawer header, overlay gelap |
| `--brown-800` | `#3B2A1C` | Panel gelap, kartu di atas background gelap |
| `--brown-700` | `#4E3826` | Border pada surface gelap, divider |
| `--brown-500` | `#7A5A3C` | Ikon sekunder, teks muted di atas terang |
| `--brown-200` | `#D9C4AC` | Border halus, outline tombol sekunder |
| `--brown-100` | `#EFE3D5` | Background halaman (pengganti abu-abu netral) |
| `--cream-50` | `#FAF4EC` | Background kartu produk, search bar, sheet |

### 2.2 Accent & Action

| Token | Hex | Penggunaan |
|---|---|---|
| `--gold-500` | `#F7B733` | Aksen utama: garis judul, badge, highlight kategori aktif |
| `--gold-400` | `#FFC845` | Hover/pressed gold, ring ikon kategori |
| `--gold-100` | `#FBEBC4` | Fill lembut untuk chip & badge |
| `--ember-600` | `#C2410C` | CTA utama (Add to Cart, ORDER), harga, tombol aktif |
| `--ember-500` | `#E2551A` | Hover CTA |
| `--ember-100` | `#FBE5D8` | Background lembut untuk state selected |

### 2.3 Text

| Token | Hex | Penggunaan |
|---|---|---|
| `--text-strong` | `#2B1D14` | Nama produk, judul section, harga |
| `--text-body` | `#5A4433` | Deskripsi produk, label |
| `--text-muted` | `#8B7460` | Placeholder, kategori non-aktif |
| `--text-on-dark` | `#F5EADD` | Teks di atas header/bottom bar coklat |
| `--text-on-gold` | `#3B2A1C` | Teks di atas fill gold |

### 2.4 Semantic

| Token | Hex | Penggunaan |
|---|---|---|
| `--success` | `#3B6D11` | Order confirmed, item tersedia |
| `--warning` | `#B45309` | ETA hampir habis |
| `--danger` | `#A32D2D` | Sold out, cancel |

**Prinsip warna:**

- **Coklat = struktur.** Semua elemen kerangka (header, bottom bar, drawer, border) memakai ramp coklat. Ini yang memberi karakter "warung kayu".
- **Gold = identitas.** Dipakai hemat: ring ikon kategori, garis di bawah judul section, badge promo. Jangan jadikan gold sebagai background luas — akan mengurangi keterbacaan.
- **Ember (oranye bata) = aksi.** Hanya untuk hal yang bisa diklik dan harga. Satu CTA dominan per layar.
- **Krem = kanvas.** Kartu produk dan sheet pakai krem, bukan putih murni — agar foto makanan menyatu dengan tema hangat dan tidak terasa "dingin".

**Rasio yang disarankan:** 60% krem/coklat muda (kanvas), 30% coklat gelap (struktur), 10% gold + ember (aksen & aksi).

**Kontras:** `--text-strong` di atas `--cream-50` ≈ 12:1, `--text-on-dark` di atas `--brown-900` ≈ 11:1, teks putih di atas `--ember-600` ≈ 4.8:1 — semua lolos WCAG AA.

---

## 3. Typography

| Elemen | Style |
|---|---|
| Nama outlet / table pill | Semi-bold, ~16px, uppercase, `--text-on-dark` |
| Judul section kategori | Bold, ~22px, uppercase, `--text-strong`, underline gold 3px |
| Tab kategori (aktif) | Semi-bold, ~14px, uppercase, `--text-strong` + underline `--ember-600` |
| Tab kategori (non-aktif) | Regular, ~14px, uppercase, `--text-muted` |
| Nama produk (kartu) | Semi-bold, ~15px, uppercase, `--text-strong`, max 2 baris |
| Harga | Bold, ~15px, `--text-strong`, format `IDR 48,000` |
| Tombol ADD (kartu) | Semi-bold, ~14px, uppercase, `--ember-600` |
| Judul produk (detail sheet) | Bold, ~20px, uppercase |
| Deskripsi produk (sheet) | Regular, ~15px, `--text-body`, line-height 1.6 |
| CTA Add To Cart | Bold, ~16px, teks krem di atas `--ember-600` |
| Search placeholder | Regular, ~15px, `--text-muted` |

Font: sans-serif geometris modern (Inter / Poppins / Plus Jakarta Sans). Untuk judul section dan logo, boleh memakai display font tebal berkarakter agar dekat dengan nuansa menu cetak — tapi **hanya untuk heading**, tidak untuk body.

Dua bobot saja: regular (400) dan semi-bold (600). Hindari bobot 700+ pada body text.

---

## 4. Layout Structure (Mobile)

```
┌───────────────────────────────────────┐
│ HEADER  (brown-900, sticky)            │
│ [☰]      ⌗ Table 39          [logo]    │
├───────────────────────────────────────┤
│ SEARCH BAR  (cream-50, rounded)        │
│ [🔍]  Try "TEMPONG AYAM PAHA"...       │
├───────────────────────────────────────┤
│ CATEGORY STRIP  (horizontal scroll)    │
│  (◍)      (◍)      (◍)          [ v ]  │
│ TEMPONGAN PENCOKAN SAMBEL...           │
│ ─────────                              │
├───────────────────────────────────────┤
│ TEMPONGAN                              │
│ ═══════                                │
│ ┌──────────┐   ┌──────────┐           │
│ │  image   │   │  image   │           │
│ ├──────────┤   ├──────────┤           │
│ │ NAMA     │   │ NAMA     │           │
│ │ IDR 48,000│  │ IDR 48,000│          │
│ │ [  ADD  ]│   │ [  ADD  ]│           │
│ └──────────┘   └──────────┘           │
│ ┌──────────┐   ┌──────────┐           │
│ │  ...     │   │  ...     │           │
│ (scrollable grid)                      │
├───────────────────────────────────────┤
│ CART BAR (brown-950, sticky)           │
│ [🛒 2 item]   IDR 96,000   [ LIHAT ]   │
└───────────────────────────────────────┘
```

### Grid & Spacing

- Kanvas halaman: `--brown-100`, kartu: `--cream-50`.
- Grid produk: **2 kolom**, gap 12px, padding horizontal 16px.
- Kartu: `border-radius: 12px`, shadow sangat halus (`0 1px 3px rgba(43,29,20,.08)`), border 1px `--brown-200`.
- Foto produk: rasio 1:1, `border-radius: 12px 12px 0 0`, object-fit cover.
- Padding dalam kartu: 12px.
- Jarak antar section: 24px.
- Category strip: icon 56px, ring 2px, gap 20px, scroll horizontal dengan snap.
- Tinggi header 56px, cart bar 64px + safe-area inset.

---

## 5. Components

### 5.1 Header (sticky)

- Background `--brown-900`, tinggi 56px.
- Kiri: hamburger (☰) membuka side drawer.
- Tengah: **table pill** — bentuk melengkung menonjol ke bawah, background `--ember-600`, isi ikon meja + "Table 39", teks krem. Ini identitas konteks paling penting di layar.
- Kanan: logo outlet, lingkaran 40px dengan border gold 2px.
- Saat modal/sheet terbuka: header tertutup overlay `rgba(26,16,8,.55)`.

### 5.2 Search Bar

- Full width, background `--cream-50`, `border-radius: 12px`, border 1px `--brown-200`.
- Ikon search kiri berwarna `--ember-600`.
- Placeholder rotasi contoh menu populer: `Try "TEMPONG AYAM PAHA"...`.
- Filter instan lintas kategori saat mengetik.

### 5.3 Category Strip (horizontal)

- Item: ikon bulat 56px, ring luar 2px `--ember-600`, ring dalam tipis `--gold-500`, isi `--cream-50` dengan ilustrasi line-art kategori.
- Label di kanan/bawah ikon, uppercase.
- **Aktif**: label `--text-strong` semi-bold + underline `--ember-600` 3px di bawah item.
- **Non-aktif**: label `--text-muted`, ikon opacity 0.7.
- Tombol chevron (⌄) di ujung kanan membuka **All Category modal**.

### 5.4 All Category Modal

- Bottom sheet tinggi ~70vh, background `--cream-50`, radius atas 16px.
- Header: judul "All Category" + tombol close (×).
- Grid **3 kolom** icon kategori + label di bawahnya, gap 16px.
- Kategori aktif diberi background `--gold-100`.
- Klik kategori → tutup modal + scroll ke section terkait.

### 5.5 Side Drawer

- Slide dari kiri, lebar ~85vw, background `--cream-50`.
- Section "Account" di atas (login/nama pelanggan bila ada).
- Divider bertuliskan "Menu" di tengah.
- Daftar kategori dalam bentuk teks vertikal, uppercase, `--text-strong`, tap area 48px.
- Footer: "Powered by" + logo.

### 5.6 Product Card

```
┌──────────────────┐
│                  │  ← foto 1:1
│      image       │
│                  │
├──────────────────┤
│ TEMPONG AYAM     │  ← nama, uppercase, max 2 baris
│ PAHA             │
│ IDR 48,000       │  ← harga, bold
│ ┌──────────────┐ │
│ │     ADD      │ │  ← outline button
│ └──────────────┘ │
└──────────────────┘
```

- Tombol **ADD**: full-width dalam kartu, tinggi 40px, `border: 1.5px solid --ember-600`, teks `--ember-600`, background transparan, `border-radius: 8px`.
- Setelah item masuk keranjang, tombol berubah jadi **stepper** `[–] 1 [+]` dengan fill `--ember-100`.
- **Sold out**: foto di-overlay `rgba(26,16,8,.5)` + badge "HABIS" (`--danger`), tombol ADD disabled abu-coklat.
- Badge promo (opsional): pill `--gold-500` di pojok kiri atas foto.

### 5.7 Product Detail Sheet

- Bottom sheet, background `--cream-50`, radius atas 16px, muncul dengan slide-up 250ms.
- Foto besar rasio 1:1 di atas, radius 12px, dengan tombol close (×) bulat putih di pojok kanan atas foto.
- Nama produk (bold, uppercase) + deskripsi lengkap.
- **Bagian variasi** (jika ada): grup radio/checkbox — misal Level Pedas, Ukuran, Tambahan — masing-masing menampilkan extra price.
- Input catatan (opsional): textarea "Catatan untuk dapur".
- Stepper quantity.
- CTA **Add To Cart**: full-width, tinggi 52px, background `--ember-600`, teks krem, `border-radius: 10px`, sticky di dasar sheet.

### 5.8 Cart Bar (sticky footer)

- Background `--brown-950`, teks `--text-on-dark`.
- Kiri: ikon keranjang + jumlah item.
- Tengah: total harga (update realtime).
- Kanan: tombol "Lihat Pesanan" / "ORDER", fill `--gold-500`, teks `--text-on-gold`.
- Hanya tampil bila keranjang tidak kosong (slide-up saat item pertama ditambahkan).

---

## 6. Interaction Notes

- Tap kartu produk (area foto/nama) → buka **detail sheet**. Tap tombol ADD → langsung tambah 1 qty tanpa membuka sheet (kecuali produk punya variasi wajib → sheet tetap dibuka).
- Category strip dan section title tersinkron: scroll grid akan meng-highlight kategori aktif di strip (scroll-spy), dan tap kategori akan scroll ke section-nya.
- Search memfilter lintas kategori secara instan; hasil kosong menampilkan empty state ilustratif.
- Cart bar muncul dari bawah saat item pertama masuk, dengan animasi 200ms.
- Semua sheet & modal: tutup dengan tap overlay, tombol ×, swipe-down, atau tombol back perangkat.
- Nomor meja tidak pernah hilang dari layar — table pill selalu terlihat di header.

---

## 7. Content Pattern

### 7.1 Kartu produk

```
[Gambar 1:1]
NAMA PRODUK (uppercase, maks 2 baris)
IDR 48,000
[ ADD ]
```

### 7.2 Detail sheet

```
[Gambar besar]
NAMA PRODUK
Deskripsi isi paket — daftar komponen + catatan aturan.
```

Contoh nada deskripsi yang dipakai:

> *"Nasi putih, ayam goreng, tahu, tempe, lalapan matang, ikan asin dan sambal tempong (untuk isian paket tidak bisa ditukar)."*

Pola deskripsi: **daftar komponen dulu, baru catatan/aturan dalam kurung.** Ringkas, faktual, tanpa bahasa marketing berlebihan — sesuai karakter warung.

---

## 8. Observed Categories & Sample Items

| Kategori | Contoh produk | Harga |
|---|---|---|
| Tempongan | Tempong Ayam Paha / Dada | IDR 48,000 |
| Tempongan | Tempong Bebek Paha / Dada | IDR 52,000 |
| Pencokan | Pencok Ayam Paha / Dada | IDR 48,000 |
| Pencokan | Pencok Bebek Paha / Dada | IDR 52,000 |
| Sambel Bakar | — | — |
| Sambel Embe | — | — |
| Sambel Rampai | — | — |
| Add On | — | — |
| Sayuran | — | — |
| Sambel | — | — |
| Kerupuk | — | — |
| Minuman | — | — |

**Pola penamaan produk:** `[JENIS MASAKAN] [PROTEIN] [BAGIAN]` — mis. `TEMPONG AYAM PAHA`, `PENCOK BEBEK DADA`. Varian paha/dada dibuat sebagai **produk terpisah**, bukan variasi — konsisten dengan referensi. Namun untuk implementasi kita, ini bisa dipertimbangkan sebagai variasi agar daftar produk lebih ringkas.

### 8.1 Referensi palet dari menu cetak (Rumipang)

| Elemen menu cetak | Warna | Padanan token |
|---|---|---|
| Latar kayu | Coklat gelap bertekstur | `--brown-900` / `--brown-800` |
| Judul section ("ROTI PANGGANG", "DRINKS") | Gold terang | `--gold-500` |
| Nama item | Krem/putih hangat | `--text-on-dark` |
| Harga | Gold | `--gold-400` |
| Panel "EXTRA TOPPINGS" | Blok gold penuh | `--gold-500` + `--text-on-gold` |
| Pill topping | Coklat gelap di atas gold | `--brown-900` |

Tekstur kayu **tidak** direplikasi sebagai background di aplikasi (mengganggu keterbacaan dan menambah berat halaman). Cukup gunakan warna solid dari ramp coklat.

---

## 9. Implementation Notes (Tailwind v4)

Definisikan token di `globals.css` agar konsisten dengan komponen yang sudah ada:

```css
@theme {
  --color-brown-950: #1A1008;
  --color-brown-900: #2B1D14;
  --color-brown-800: #3B2A1C;
  --color-brown-700: #4E3826;
  --color-brown-500: #7A5A3C;
  --color-brown-200: #D9C4AC;
  --color-brown-100: #EFE3D5;
  --color-cream-50:  #FAF4EC;

  --color-gold-500: #F7B733;
  --color-gold-400: #FFC845;
  --color-gold-100: #FBEBC4;

  --color-ember-600: #C2410C;
  --color-ember-500: #E2551A;
  --color-ember-100: #FBE5D8;
}
```

Dark mode: tukar kanvas ke `--brown-950`, kartu ke `--brown-800`, teks ke `--text-on-dark`. Gold dan ember tetap sama — keduanya sudah kontras di kedua mode.

Komponen yang perlu disesuaikan dari implementasi saat ini:

- `components/menu/MenuItemCard.tsx` — grid 2 kolom, tombol ADD outline
- `components/menu/CategoryPills.tsx` — ganti pill teks jadi icon bulat + ring
- `components/menu/MenuItemSheet.tsx` — foto besar di atas, CTA sticky
- `components/cart/CartFAB.tsx` — ganti FAB jadi cart bar full-width
- `components/ui/Button.tsx` — tambah variant `outline-ember` dan `gold`
- `app/globals.css` — ganti palet ungu (`#6B3FA0`) ke ramp coklat di atas

---

## 10. Open Questions

- Perlukah tombol ADD langsung menambah ke keranjang, atau selalu membuka detail sheet? (referensi memakai pendekatan pertama)
- Apakah varian paha/dada tetap dibuat sebagai produk terpisah, atau digabung jadi satu produk dengan variasi?
- Tampilan halaman keranjang/checkout dengan tema coklat — belum dispesifikasikan.
- Apakah tekstur kayu halus (opacity rendah) diinginkan di header saja, sebagai sentuhan brand?
- Perlukah mode gelap penuh untuk kondisi warung malam hari?