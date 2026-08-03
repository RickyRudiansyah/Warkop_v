// Uji coba pembayaran QRIS memakai Midtrans SANDBOX, sekalian memastikan
// struk otomatis masuk antrian printer.
//
//   node scripts/test-qris-sandbox.mjs            # lewat aplikasi (perlu `npm run dev`)
//   node scripts/test-qris-sandbox.mjs --pay      # sama, tapi bayar otomatis tanpa browser
//   node scripts/test-qris-sandbox.mjs --direct   # langsung ke Midtrans (cek server key saja)
//
// Alur mode default:
//   1. Ambil 1 menu + 1 meja dari API publik
//   2. POST /api/payments/midtrans/charge  -> dapat QR sandbox
//   3. Bayar QR-nya di simulator sandbox Midtrans (link dicetak di terminal),
//      atau otomatis kalau memakai --pay
//   4. Script polling status sampai PAID, lalu cek print job-nya terbentuk

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// WAJIB pakai path /v2/. Halaman lama (tanpa /v2/) masih bisa membaca QR dan
// menampilkan Reference ID, tapi form-nya memakai kontrak lama (`qrString`
// bukan `exploreData`) yang sudah tidak dilayani backend — tombol Pay di sana
// selalu berakhir "Transaction is unsuccessful" dan transaksi tetap pending.
const SIMULATOR_BASE = 'https://simulator.sandbox.midtrans.com/v2/qris';
const SIMULATOR_URL = SIMULATOR_BASE + '/index';

function loadEnv() {
  const env = {};
  for (const file of ['.env', '.env.local']) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const DIRECT = process.argv.includes('--direct');
const AUTO_PAY = process.argv.includes('--pay');
const APP_URL = (env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const SERVER_KEY = env.MIDTRANS_SERVER_KEY;

function fail(message) {
  console.error('\n  GAGAL: ' + message + '\n');
  process.exit(1);
}

function bar() { console.log('-'.repeat(64)); }

function unescapeHtml(s) {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/g, '/')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

// Bayar QR di simulator sandbox tanpa browser.
//
// Simulator tidak punya API resmi — script ini mengisi form HTML-nya persis
// seperti yang dilakukan browser: langkah "Scan QR" mengembalikan form berisi
// referenceId + exploreData, lalu keduanya dikirim balik ke /payment/gopay.
// Kalau Midtrans mengubah markup simulatornya, mode ini bisa berhenti bekerja —
// pembayaran manual lewat browser tetap jadi cadangan.
async function simulatorPay(qrUrl) {
  let scan;
  try {
    scan = await fetch(SIMULATOR_BASE + '/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ qrCodeUrl: qrUrl }),
    });
  } catch {
    return { ok: false, error: 'Tidak dapat menghubungi simulator sandbox' };
  }
  if (!scan.ok) return { ok: false, error: 'Simulator menolak scan (HTTP ' + scan.status + ')' };

  const html = await scan.text();
  const start = html.indexOf('<form');
  const end = html.indexOf('</form>');
  if (start === -1 || end === -1) return { ok: false, error: 'Form pembayaran tidak ditemukan di halaman simulator' };

  // Bawa semua hidden field apa adanya supaya tahan terhadap penambahan field baru.
  const body = new URLSearchParams();
  for (const m of html.slice(start, end).matchAll(/name="([a-zA-Z]+)"[^>]*value="([\s\S]*?)"\s*\/?>/g)) {
    body.set(m[1], unescapeHtml(m[2]));
  }
  if (!body.has('referenceId')) return { ok: false, error: 'Simulator tidak mengembalikan referenceId (QR tidak terbaca?)' };
  body.set('issuer', 'gopay');

  const pay = await fetch(SIMULATOR_BASE + '/payment/gopay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!pay.ok) return { ok: false, error: 'Pembayaran simulator gagal (HTTP ' + pay.status + ')' };
  if (/unsuccessful/i.test(await pay.text())) {
    return { ok: false, error: 'Simulator menjawab "Transaction is unsuccessful"' };
  }
  return { ok: true };
}

// ---- Pemeriksaan awal ----
if (!SERVER_KEY || SERVER_KEY === 'SB-Mid-server-xxxxxxxx') {
  fail('MIDTRANS_SERVER_KEY belum diisi di .env / .env.local');
}
if (env.MIDTRANS_IS_PRODUCTION === 'true') {
  fail('MIDTRANS_IS_PRODUCTION=true. Script ini khusus sandbox — set ke false dulu.');
}
// Sebagian akun Midtrans memberi server key sandbox TANPA awalan "SB-", jadi
// prefix tidak bisa dipakai sebagai penentu. Yang menentukan endpoint adalah
// MIDTRANS_IS_PRODUCTION (sudah dipastikan false di atas) — key yang salah
// lingkungan akan ditolak Midtrans dengan 401 dan terlihat jelas di output.
if (!SERVER_KEY.startsWith('SB-Mid-server-')) {
  console.warn('  Catatan: server key tidak berawalan "SB-Mid-server-".');
  console.warn('  Tetap dilanjutkan ke endpoint SANDBOX (MIDTRANS_IS_PRODUCTION=false).');
  console.warn('  Kalau ini ternyata key produksi, Midtrans akan menolak dengan 401.\n');
}

const authHeader = 'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64');

async function getJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { res, data };
}

// ---- Mode --direct: charge langsung ke Midtrans sandbox ----
async function runDirect() {
  const orderId = 'test-' + Date.now();
  console.log('Charge QRIS langsung ke Midtrans sandbox (order_id: ' + orderId + ')...');

  const { res, data } = await getJson('https://api.sandbox.midtrans.com/v2/charge', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify({
      payment_type: 'qris',
      transaction_details: { order_id: orderId, gross_amount: 1000 },
      qris: { acquirer: 'gopay' },
    }),
  });

  if (!res.ok || !['200', '201'].includes(String(data.status_code))) {
    fail('Midtrans menolak charge: ' + (data.status_message || JSON.stringify(data)));
  }

  const qrUrl = (data.actions || []).find(a => a.name === 'generate-qr-code')?.url;
  bar();
  console.log('  Server key VALID & QRIS aktif.');
  console.log('  order_id   : ' + orderId);
  console.log('  status     : ' + data.transaction_status);
  console.log('  QR image   : ' + (qrUrl || '-'));
  console.log('  qr_string  : ' + (data.qr_string || '-'));
  bar();
  console.log('  Bayar di simulator: ' + SIMULATOR_URL);
  console.log('  Tempel "QR image" DI ATAS ke field "QR Code Image Url",');
  console.log('  klik "Scan QR", lalu "Pay". (Bukan qr_string — simulator');
  console.log('  hanya menerima URL gambar QR.)');
}

// ---- Mode default: lewat aplikasi, end-to-end sampai struk ----
async function runThroughApp() {
  console.log('Cek aplikasi di ' + APP_URL + ' ...');
  const health = await fetch(APP_URL + '/api/health').catch(() => null);
  if (!health || !health.ok) {
    fail('Aplikasi tidak merespons di ' + APP_URL + '. Jalankan `npm run dev` dulu, atau pakai --direct.');
  }

  const { data: menu } = await getJson(APP_URL + '/api/menu');
  if (!Array.isArray(menu) || menu.length === 0) fail('Menu kosong. Seed menu dulu (scripts/seed-menu.sql).');
  const item = menu.find(m => m.is_available && !m.is_sold_out) || menu[0];

  const { data: tables } = await getJson(APP_URL + '/api/tables');
  const table = Array.isArray(tables) && tables.length ? tables[0] : null;

  console.log('Membuat charge QRIS: ' + item.name + ' (' + item.price + ') di ' + (table?.label || 'tanpa meja') + '...');

  const { res, data: charge } = await getJson(APP_URL + '/api/payments/midtrans/charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table_id: table?.id ?? null,
      total_amount: item.price,
      notes: 'Test QRIS sandbox',
      items: [{
        menu_item_id: item.id,
        menu_item_name: item.name,
        menu_item_price: item.price,
        quantity: 1,
        variations: [],
        subtotal: item.price,
        notes: null,
      }],
    }),
  });

  if (!res.ok) fail('Charge gagal: ' + (charge.error || JSON.stringify(charge)));

  bar();
  console.log('  intentId  : ' + charge.intentId);
  console.log('  total     : Rp ' + charge.grossAmount);
  console.log('  QR image  : ' + (charge.qrUrl || '-'));
  console.log('  qr_string : ' + (charge.qrString || '-'));
  bar();

  if (AUTO_PAY) {
    console.log('  Membayar otomatis di simulator sandbox...');
    const paid = await simulatorPay(charge.qrUrl);
    if (!paid.ok) {
      console.log('  Gagal bayar otomatis: ' + paid.error);
      console.log('  Lanjutkan manual di ' + SIMULATOR_URL);
    } else {
      console.log('  Pembayaran simulator terkirim.');
    }
    bar();
  } else {
    console.log('  LANGKAH BAYAR (sandbox):');
    console.log('    1. Buka ' + SIMULATOR_URL);
    console.log('    2. Tempel "QR image" di atas ke field "QR Code Image Url"');
    console.log('    3. Klik "Scan QR", lalu klik "Pay"');
    console.log('');
    console.log('    Pastikan alamatnya mengandung "/v2/" — halaman lama');
    console.log('    (tanpa /v2/) selalu berakhir "unsuccessful".');
    console.log('    Simulator minta URL GAMBAR QR, bukan qr_string.');
    console.log('');
    console.log('    Atau jalankan ulang dengan  npm run test:qris:auto');
    console.log('    supaya dibayar otomatis tanpa browser.');
    bar();
  }

  console.log('Menunggu pembayaran... (Ctrl+C untuk batal)\n');

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

  console.log('\n\n  PEMBAYARAN LUNAS. Order dibuat: ' + orderId);

  // Verifikasi struk otomatis masuk antrian printer.
  if (!env.PRINT_DEVICE_TOKEN) {
    console.log('  (lewati cek printer: PRINT_DEVICE_TOKEN belum diisi di .env)');
    console.log('  Cek manual di ' + APP_URL + '/dashboard/printer');
    return;
  }

  await new Promise(r => setTimeout(r, 1000));
  const { data: queue } = await getJson(APP_URL + '/api/print/jobs', {
    headers: { 'x-print-token': env.PRINT_DEVICE_TOKEN, 'x-print-device': 'test-script' },
  });

  const job = (queue.jobs || []).find(j => j.order_id === orderId);
  if (!job) fail('Struk TIDAK masuk antrian printer untuk order ' + orderId);

  bar();
  console.log('  STRUK MASUK ANTRIAN (status: ' + job.status + ', trigger: ' + job.trigger + ')');
  bar();
  console.log(job.text_body);
  bar();
  console.log('  Aplikasi Android akan menarik job ini lewat:');
  console.log('    GET ' + APP_URL + '/api/print/jobs?claim=1');
}

(DIRECT ? runDirect() : runThroughApp()).catch(err => fail(err.message));
