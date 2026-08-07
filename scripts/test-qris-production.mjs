// Uji QRIS di PRODUKSI — UANG ASLI.
//
// Kembaran `test-qris-sandbox.mjs`, dengan pengaman yang dibalik: yang itu
// menolak jalan saat MIDTRANS_IS_PRODUCTION=true, yang ini justru menuntutnya.
//
// Alurnya sama persis dengan yang dilalui pelanggan sungguhan:
//   1. POST /api/payments/midtrans/charge   -> payment_intent + QR produksi
//   2. Anda scan QR-nya dengan e-wallet ASLI dan membayar
//   3. Script polling status sampai settle -> order dibuat + struk diantrikan
//   4. Verifikasi struknya benar-benar masuk antrian printer
//
// TIDAK ADA SIMULATOR di produksi. Simulator sandbox Midtrans tidak berlaku di
// sini, jadi langkah 2 harus dilakukan manusia dengan uang sungguhan.
//
// Berhenti sebelum langkah 2 (Ctrl+C setelah QR muncul) sudah membuktikan hal
// yang paling sering rusak: kredensial produksi diterima, QRIS aktif di akun
// Midtrans, dan endpoint charge aplikasi berfungsi. Intent yang tidak dibayar
// kedaluwarsa sendiri dan tidak pernah menjadi order.
//
//   node scripts/test-qris-production.mjs --yes-real-money
//   node scripts/test-qris-production.mjs --yes-real-money --amount=1000

import { loadEnv } from './load-env.mjs';

const env = loadEnv();

const APP_URL = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CONFIRMED = process.argv.includes('--yes-real-money');
const amountArg = process.argv.find(a => a.startsWith('--amount='));
// Rp 1.000: cukup untuk membuktikan seluruh rantai, cukup kecil untuk direlakan
// kalau refund-nya merepotkan. Sebagian penerbit e-wallet menolak nominal di
// bawah ini, jadi jangan diturunkan lagi.
const AMOUNT = amountArg ? parseInt(amountArg.split('=')[1], 10) : 1000;

const bar = () => console.log('  ' + '-'.repeat(64));

function fail(message) {
  console.error('\n  GAGAL: ' + message + '\n');
  process.exit(1);
}

async function getJson(url, init) {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// ---- Pengaman ------------------------------------------------------------

if (env.MIDTRANS_IS_PRODUCTION !== 'true') {
  fail('MIDTRANS_IS_PRODUCTION bukan "true". Untuk sandbox pakai `npm run test:qris`.');
}
if (env.NEXT_PUBLIC_QRIS_ENABLED !== 'true') {
  fail('NEXT_PUBLIC_QRIS_ENABLED bukan "true" — endpoint charge akan membalas 503.');
}
if ((env.MIDTRANS_SERVER_KEY || '').startsWith('SB-')) {
  fail('MIDTRANS_SERVER_KEY masih kunci sandbox (SB-…) padahal IS_PRODUCTION=true. Pasti 401.');
}
if (!Number.isInteger(AMOUNT) || AMOUNT < 1) {
  fail('--amount harus bilangan bulat rupiah, mis. --amount=1000');
}
if (!CONFIRMED) {
  console.log('');
  bar();
  console.log('  UJI QRIS PRODUKSI — INI MEMAKAI UANG ASLI');
  bar();
  console.log('  Script ini membuat tagihan QRIS sungguhan sebesar Rp ' + AMOUNT.toLocaleString('id-ID') + '.');
  console.log('  Uangnya benar-benar berpindah kalau Anda membayarnya, dan');
  console.log('  refund harus dilakukan sendiri lewat dashboard Midtrans.');
  console.log('');
  console.log('  Kalau sadar dan tetap mau lanjut, jalankan ulang dengan:');
  console.log('    node scripts/test-qris-production.mjs --yes-real-money');
  bar();
  console.log('');
  process.exit(2);
}

// ---- Jalan ---------------------------------------------------------------

async function run() {
  console.log('Cek aplikasi di ' + APP_URL + ' ...');
  const health = await fetch(APP_URL + '/api/health').catch(() => null);
  if (!health || !health.ok) {
    fail('Aplikasi tidak merespons di ' + APP_URL + '. Jalankan `npm run start` (atau arahkan NEXT_PUBLIC_APP_URL ke domain produksi).');
  }

  const { data: menu } = await getJson(APP_URL + '/api/menu');
  if (!Array.isArray(menu) || menu.length === 0) fail('Menu kosong.');
  const item = menu.find(m => m.is_available && !m.is_sold_out) || menu[0];

  console.log('Membuat tagihan QRIS Rp ' + AMOUNT.toLocaleString('id-ID') + ' (take away, uji produksi)...');

  // Sengaja take away (table_id null): uji ini tidak boleh menempati meja yang
  // mungkin sedang dipakai pelanggan sungguhan.
  const { res, data: charge } = await getJson(APP_URL + '/api/payments/midtrans/charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table_id: null,
      total_amount: AMOUNT,
      notes: 'UJI QRIS PRODUKSI — abaikan / batalkan',
      items: [{
        menu_item_id: item.id,
        menu_item_name: '[UJI] ' + item.name,
        menu_item_price: AMOUNT,
        quantity: 1,
        variations: [],
        subtotal: AMOUNT,
        notes: 'uji produksi',
      }],
    }),
  });

  if (!res.ok) fail('Charge ditolak (HTTP ' + res.status + '): ' + (charge.error || JSON.stringify(charge)));

  if (!charge.snapUrl) fail('Charge sukses tapi tidak mengembalikan snapUrl: ' + JSON.stringify(charge));

  bar();
  console.log('  TRANSAKSI SNAP TERBIT — gateway produksi hidup.');
  bar();
  console.log('  intentId  : ' + charge.intentId);
  console.log('  total     : Rp ' + Number(charge.grossAmount).toLocaleString('id-ID'));
  console.log('  halaman   : ' + charge.snapUrl);
  bar();
  console.log('');
  console.log('  Sampai sini saja sudah membuktikan gatewaynya hidup.');
  console.log('  Ctrl+C sekarang kalau tidak mau membayar — tagihan yang');
  console.log('  dibiarkan akan kedaluwarsa sendiri dan tidak jadi order.');
  console.log('');
  console.log('  Untuk uji penuh: buka "halaman" di atas, scan QRIS-nya');
  console.log('  dengan e-wallet ASLI (GoPay/OVO/DANA/m-banking), lalu bayar.');
  bar();

  console.log('\nMenunggu pembayaran... (Ctrl+C untuk batal)\n');

  const deadline = Date.now() + 10 * 60 * 1000;
  let orderId = null;

  while (Date.now() < deadline) {
    const { data: status } = await getJson(APP_URL + '/api/payments/midtrans/status?intentId=' + charge.intentId);
    if (status.status === 'PAID') { orderId = status.orderId; break; }
    if (status.status === 'EXPIRED' || status.status === 'FAILED') fail('Pembayaran ' + status.status);
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, 3000));
  }

  if (!orderId) fail('Timeout 10 menit — pembayaran belum masuk.');

  console.log('\n\n  PEMBAYARAN LUNAS (UANG ASLI). Order dibuat: ' + orderId);
  console.log('  Order ini QRIS + lunas, jadi langsung masuk RIWAYAT (lib/archive.ts),');
  console.log('  bukan board kasir. Hapus lewat halaman Riwayat kalau mengganggu.');

  if (!env.PRINT_DEVICE_TOKEN) {
    console.log('  (lewati cek printer: PRINT_DEVICE_TOKEN belum diisi)');
    console.log('  Cek manual di ' + APP_URL + '/dashboard/printer');
    return;
  }

  await new Promise(r => setTimeout(r, 1000));
  const { data: queue } = await getJson(APP_URL + '/api/print/jobs', {
    headers: { 'x-print-token': env.PRINT_DEVICE_TOKEN, 'x-print-device': 'test-script-prod' },
  });

  const job = (queue.jobs || []).find(j => j.order_id === orderId);
  if (!job) fail('Struk TIDAK masuk antrian printer untuk order ' + orderId);

  bar();
  console.log('  STRUK MASUK ANTRIAN (status: ' + job.status + ', trigger: ' + job.trigger + ')');
  bar();
  console.log(job.text_body);
  bar();
  console.log('  Jangan lupa refund Rp ' + AMOUNT.toLocaleString('id-ID') + ' lewat dashboard Midtrans kalau perlu.');
}

run().catch(err => fail(err.message));
