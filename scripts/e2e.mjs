// End-to-end test: menembak API yang SUNGGUHAN, lewat HTTP, dengan login staff
// sungguhan, di atas database yang sungguhan.
//
// Kenapa bukan unit test biasa: bug-bug yang pernah menyakitkan di proyek ini
// semuanya lolos dari unit test — order QRIS lunas yang tidak pernah muncul di
// mana pun, struk yang tercetak enam kali, refund yang mengurangi omzet hari
// yang salah. Semuanya hanya kelihatan kalau route, database, dan aturan
// arsipnya dijalankan berbarengan.
//
// Cara pakai:
//   node scripts/e2e.mjs                      # lawan http://localhost:3000
//   node scripts/e2e.mjs --base=https://…     # butuh --yes (server sungguhan)
//   node scripts/e2e.mjs --keep               # jangan hapus data uji
//
// Yang dijaga skrip ini supaya aman dijalankan di warung yang sedang buka:
//   * semua order uji ditandai `notes` khusus dan DIHAPUS di akhir;
//   * antrian cetak milik order uji dihapus segera setelah dibuat, sebelum
//     tablet sempat menariknya — kertas tidak ikut terbuang;
//   * akun staff uji dibuat sendiri lalu dihapus, jadi tidak perlu meminjam
//     kata sandi siapa pun;
//   * kalau ada langkah gagal di tengah, pembersihan tetap jalan.

import { loadEnv } from './load-env.mjs';

const env = loadEnv();

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const BASE = (opt('base', env.E2E_BASE_URL || 'http://localhost:3000')).replace(/\/$/, '');
const KEEP = flag('keep');
const MARKER = `E2E ${new Date().toISOString()}`;

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('❌ .env kurang: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE);
if (!isLocal && !flag('yes')) {
  console.error(`❌ ${BASE} bukan localhost.`);
  console.error('   Skrip ini menulis order dan refund sungguhan ke database.');
  console.error('   Kalau memang itu yang dimaui, ulangi dengan --yes.');
  process.exit(1);
}

// ---------------------------------------------------------------- kerangka uji

let passed = 0;
const failures = [];
let group = '';

const rp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

function section(name) {
  group = name;
  console.log(`\n── ${name}`);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`   ✓ ${name}`);
  } catch (e) {
    failures.push({ group, name, message: e.message });
    console.log(`   ✗ ${name}`);
    console.log(`     ${e.message}`);
  }
}

function eq(actual, expected, what) {
  if (actual !== expected) {
    throw new Error(`${what}: dapat ${JSON.stringify(actual)}, harusnya ${JSON.stringify(expected)}`);
  }
}

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

// ------------------------------------------------------------------- transport

/** Panggil API aplikasi. `auth: false` untuk menguji jalur pelanggan. */
async function api(method, path, { body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* biar mentah */ }
  return { status: res.status, body: json, raw: text };
}

/** Akses langsung ke database, untuk menyiapkan & membereskan — bukan untuk menguji. */
async function db(method, path, { body, prefer } = {}) {
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

// --------------------------------------------------------------- akun uji

let token = null;
let authUserId = null;
const createdOrders = [];
const createdExpenses = [];

const TEST_EMAIL = `e2e-${Date.now()}@rumipang.local`;
const TEST_PASSWORD = `e2e-${Math.random().toString(36).slice(2)}-Aa1!`;

async function createTestStaff() {
  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, email_confirm: true }),
  });
  const user = await created.json();
  if (!created.ok) throw new Error(`buat user uji gagal: ${JSON.stringify(user)}`);
  authUserId = user.id;

  // Punya akun saja tidak cukup — requireStaff mensyaratkan baris staff aktif.
  const staff = await db('POST', 'staff_users', {
    body: { id: authUserId, name: 'E2E Robot', role: 'owner', email: TEST_EMAIL, is_active: true },
    prefer: 'return=representation',
  });
  if (staff.status >= 300) throw new Error(`buat staff uji gagal: ${JSON.stringify(staff.body)}`);

  const signIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const session = await signIn.json();
  if (!signIn.ok) throw new Error(`login uji gagal: ${JSON.stringify(session)}`);
  token = session.access_token;
}

/**
 * Buang antrian cetak milik order uji.
 *
 * Dipanggil SEGERA setelah tiap langkah yang bisa memicu struk. Tablet menarik
 * antrian tiap beberapa detik; menunggu sampai akhir skrip berarti warung
 * mencetak struk palsu.
 */
async function dropPrintJobs(orderId) {
  await db('DELETE', `print_jobs?order_id=eq.${orderId}`);
}

async function cleanup() {
  if (KEEP) {
    console.log('\n⚠  --keep: data uji DIBIARKAN.');
    console.log(`   order: ${createdOrders.join(', ') || '-'}`);
    console.log(`   akun : ${TEST_EMAIL}`);
    return;
  }
  for (const id of createdOrders) {
    // order_items, print_jobs, dan refunds ikut terhapus lewat ON DELETE CASCADE.
    await db('DELETE', `orders?id=eq.${id}`);
  }
  for (const id of createdExpenses) {
    await db('DELETE', `expenses?id=eq.${id}`);
  }
  if (authUserId) {
    await db('DELETE', `staff_users?id=eq.${authUserId}`);
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
  }
}

/** Buat order lewat API sungguhan; `lines` = [{ item, quantity, subtotal }]. */
async function makeOrder({
  lines,
  paymentMethod = 'CASH',
  paymentStatus = 'UNPAID',
  tableId = null,
  // Order tunai TIDAK diarsipkan otomatis (lihat lib/archive.ts). Kalau uji
  // butuh order itu ada di riwayat, di sinilah tombol "Selesai" ditirukan.
  archive = null,
}) {
  const total = lines.reduce((s, l) => s + l.subtotal, 0);
  const res = await api('POST', '/api/orders', {
    body: {
      table_id: tableId,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      total_amount: total,
      notes: MARKER,
      items: lines.map((l) => ({
        menu_item_id: l.item.id,
        menu_item_name: l.item.name,
        menu_item_price: l.item.price,
        quantity: l.quantity,
        subtotal: l.subtotal,
        variations: l.variations ?? [],
      })),
    },
  });
  if (res.status !== 201) throw new Error(`buat order gagal (${res.status}): ${res.raw.slice(0, 200)}`);
  createdOrders.push(res.body.id);
  await dropPrintJobs(res.body.id);

  const shouldArchive = archive ?? (paymentStatus === 'PAID');
  if (shouldArchive && !res.body.is_archived) {
    await api('PATCH', `/api/orders/${res.body.id}/archive`);
  }
  return res.body;
}

async function readOrder(id) {
  const res = await db('GET', `orders?id=eq.${id}&select=*,items:order_items(*)`);
  return res.body?.[0] ?? null;
}

// ------------------------------------------------------------------ skenario

async function main() {
  console.log(`Rumipang E2E → ${BASE}`);
  console.log(`penanda: ${MARKER}`);

  // Server harus hidup dulu; kalau tidak, semua uji gagal karena alasan yang sama.
  const health = await api('GET', '/api/health', { auth: false }).catch(() => null);
  if (!health || health.status >= 500) {
    console.error(`\n❌ ${BASE} tidak menjawab. Jalankan \`npm run build && npm start\` dulu.`);
    process.exit(1);
  }

  await createTestStaff();

  // --- prasyarat data -------------------------------------------------------
  const menuRes = await api('GET', '/api/menu', { auth: false });
  const menu = (menuRes.body ?? []).filter((m) => m.is_available !== false && m.price > 0);
  if (menu.length < 2) {
    console.error('\n❌ Butuh minimal 2 menu aktif berharga untuk diuji.');
    await cleanup();
    process.exit(1);
  }
  const [itemA, itemB] = menu;

  const tablesRes = await api('GET', '/api/tables', { auth: false });
  const table = (tablesRes.body ?? [])[0] ?? null;

  // =========================================================== penjagaan akses
  section('Penjagaan akses');

  await test('tanpa token, board kasir ditolak 401', async () => {
    const res = await api('GET', '/api/orders?mode=cashier', { auth: false });
    eq(res.status, 401, 'status');
  });

  await test('token asal-asalan tetap ditolak 401', async () => {
    const res = await fetch(`${BASE}/api/orders?mode=cashier`, {
      headers: { Authorization: 'Bearer bukan-token-beneran' },
    });
    eq(res.status, 401, 'status');
  });

  await test('menu terbuka untuk pelanggan tanpa login', async () => {
    eq(menuRes.status, 200, 'status');
    ok(Array.isArray(menuRes.body), 'balasan harus berupa daftar');
  });

  // ============================================================ alur order tunai
  section('Alur order tunai');

  let cashOrder = null;

  await test('order pelanggan tercipta lengkap dengan itemnya', async () => {
    cashOrder = await makeOrder({
      lines: [{ item: itemA, quantity: 2, subtotal: itemA.price * 2 }],
      tableId: table?.id ?? null,
    });
    eq(cashOrder.payment_status, 'UNPAID', 'payment_status');
    eq(cashOrder.total_amount, itemA.price * 2, 'total_amount');
  });

  await test('order UNPAID muncul di board kasir', async () => {
    const res = await api('GET', '/api/orders?mode=cashier');
    eq(res.status, 200, 'status');
    ok(res.body.some((o) => o.id === cashOrder.id), 'order tidak ada di board kasir');
  });

  await test('metode bayar boleh ditukar selama belum lunas', async () => {
    const res = await api('PATCH', `/api/orders/${cashOrder.id}/payment-method`, {
      body: { payment_method: 'QRIS' },
    });
    eq(res.status, 200, 'status');
    eq(res.body.payment_method, 'QRIS', 'payment_method');

    const back = await api('PATCH', `/api/orders/${cashOrder.id}/payment-method`, {
      body: { payment_method: 'CASH' },
    });
    eq(back.body.payment_method, 'CASH', 'payment_method kembali');
  });

  await test('order UNPAID tidak bisa direfund', async () => {
    const res = await api('PATCH', `/api/orders/${cashOrder.id}/refund`, { body: {} });
    eq(res.status, 400, 'status');
  });

  await test('tandai lunas → PAID dan struk masuk antrian', async () => {
    const res = await api('PATCH', `/api/orders/${cashOrder.id}/mark-paid`, {
      body: { verified_by: 'E2E' },
    });
    await dropPrintJobs(cashOrder.id);
    eq(res.status, 200, 'status');
    eq(res.body.payment_status, 'PAID', 'payment_status');
    eq(res.body.print_queued, true, 'struk harusnya masuk antrian');
    // Tunai TIDAK diarsipkan otomatis — permintaan warung: "yg langsung ke
    // history ini pembayaran yang pake qris, kalo untuk yang cash harus manual
    // pencet selesai". Kalau ini berubah, uang tunai bisa hilang dari board
    // sebelum kasir sempat menghitungnya.
    eq(res.body.is_archived, false, 'is_archived');
  });

  await test('lunas dua kali ditolak 400', async () => {
    const res = await api('PATCH', `/api/orders/${cashOrder.id}/mark-paid`, { body: {} });
    await dropPrintJobs(cashOrder.id);
    eq(res.status, 400, 'status');
  });

  await test('metode bayar terkunci setelah lunas (409)', async () => {
    const res = await api('PATCH', `/api/orders/${cashOrder.id}/payment-method`, {
      body: { payment_method: 'QRIS' },
    });
    eq(res.status, 409, 'status');
  });

  await test('order tunai lunas menunggu di board kasir sampai ditekan Selesai', async () => {
    const board = await api('GET', '/api/orders?mode=cashier');
    ok(board.body.some((o) => o.id === cashOrder.id), 'order lunas hilang dari board kasir');

    const res = await api('PATCH', `/api/orders/${cashOrder.id}/archive`);
    eq(res.status, 200, 'status arsip');

    const after = await api('GET', '/api/orders?mode=cashier');
    ok(!after.body.some((o) => o.id === cashOrder.id), 'order masih di board setelah Selesai');

    const history = await api('GET', '/api/orders?history=1');
    ok(history.body.some((o) => o.id === cashOrder.id), 'order tidak ada di riwayat');
  });

  await test('order QRIS lunas langsung masuk riwayat tanpa ditekan Selesai', async () => {
    const qris = await makeOrder({
      paymentMethod: 'QRIS',
      paymentStatus: 'PAID',
      archive: false, // sengaja tidak dibantu — auto-arsip yang harus bekerja
      lines: [{ item: itemB, quantity: 1, subtotal: itemB.price }],
      tableId: table?.id ?? null,
    });
    eq(qris.is_archived, true, 'is_archived');

    const board = await api('GET', '/api/orders?mode=cashier');
    ok(!board.body.some((o) => o.id === qris.id), 'order QRIS lunas menyangkut di board kasir');
  });

  // ================================================================ refund
  section('Refund');

  // Dibuat baru dan langsung lunas: dua baris dengan pembagian yang berbeda,
  // supaya perhitungan per porsi benar-benar diuji.
  //   A: 2 porsi, ada topping berbayar  -> per porsi = harga + topping
  //   B: 1 porsi polos
  const extra = 3000;
  let order = null;
  const unitA = itemA.price + extra;

  await test('siapkan order lunas dengan variasi berbayar', async () => {
    order = await makeOrder({
      paymentStatus: 'PAID',
      lines: [
        {
          item: itemA,
          quantity: 2,
          subtotal: unitA * 2,
          variations: [{ variation_type: 'topping', label: 'E2E Topping', extra_price: extra }],
        },
        { item: itemB, quantity: 1, subtotal: itemB.price },
      ],
      tableId: table?.id ?? null,
    });
    eq(order.total_amount, unitA * 2 + itemB.price, 'total_amount');
  });

  await test('refund per item memakai harga per porsi dari subtotal (bukan harga menu)', async () => {
    const fresh = await readOrder(order.id);
    const lineA = fresh.items.find((i) => i.menu_item_id === itemA.id);
    const res = await api('PATCH', `/api/orders/${order.id}/refund`, {
      body: { items: [{ order_item_id: lineA.id, quantity: 1 }], reason: 'E2E per item' },
    });
    eq(res.status, 200, 'status');
    // Kalau server memakai menu_item_price, angkanya akan itemA.price — dan
    // topping yang sudah dibayar pelanggan hilang begitu saja.
    eq(res.body.refunded_now, unitA, `refunded_now (${rp(unitA)} = harga + topping)`);
    eq(res.body.refunded_total, unitA, 'refunded_total');
  });

  await test('nominal tidak diambil dari klien', async () => {
    const fresh = await readOrder(order.id);
    const lineB = fresh.items.find((i) => i.menu_item_id === itemB.id);
    const res = await api('PATCH', `/api/orders/${order.id}/refund`, {
      // "amount" palsu yang besar sekali — server harus mengabaikannya total.
      body: { items: [{ order_item_id: lineB.id, quantity: 1 }], amount: 99_000_000 },
    });
    eq(res.status, 200, 'status');
    eq(res.body.refunded_now, itemB.price, 'refunded_now');
  });

  await test('jumlah melebihi porsi yang dipesan ditolak 400', async () => {
    const fresh = await readOrder(order.id);
    const lineA = fresh.items.find((i) => i.menu_item_id === itemA.id);
    const res = await api('PATCH', `/api/orders/${order.id}/refund`, {
      body: { items: [{ order_item_id: lineA.id, quantity: 99 }] },
    });
    eq(res.status, 400, 'status');
  });

  await test('item milik order lain ditolak 400', async () => {
    const other = await readOrder(cashOrder.id);
    const res = await api('PATCH', `/api/orders/${order.id}/refund`, {
      body: { items: [{ order_item_id: other.items[0].id, quantity: 1 }] },
    });
    eq(res.status, 400, 'status');
  });

  await test('refund sisa order menutup tepat di total, tidak lebih', async () => {
    const before = await readOrder(order.id);
    const remaining = before.total_amount - before.refunded_amount;
    const res = await api('PATCH', `/api/orders/${order.id}/refund`, { body: {} });
    eq(res.status, 200, 'status');
    eq(res.body.refunded_now, remaining, 'refunded_now');
    eq(res.body.refunded_total, before.total_amount, 'refunded_total');

    const after = await readOrder(order.id);
    eq(after.refunded_amount, after.total_amount, 'refunded_amount di database');
  });

  await test('refund keempat ditolak 409 (sudah penuh)', async () => {
    const res = await api('PATCH', `/api/orders/${order.id}/refund`, { body: {} });
    eq(res.status, 409, 'status');
  });

  await test('setiap refund tercatat beserta alasan dan pelakunya', async () => {
    const res = await db('GET', `refunds?order_id=eq.${order.id}&select=*&order=created_at.asc`);
    eq(res.body.length, 3, 'jumlah baris refund');
    eq(res.body[0].reason, 'E2E per item', 'alasan refund pertama');
    eq(res.body[0].created_by, 'E2E Robot', 'created_by');
    ok(Array.isArray(res.body[0].items) && res.body[0].items.length === 1, 'rincian item refund kosong');
    const sum = res.body.reduce((s, r) => s + r.amount, 0);
    eq(sum, order.total_amount, 'jumlah seluruh refund');
  });

  await test('refund tidak pernah melebihi total (dijaga constraint database)', async () => {
    const res = await db('PATCH', `orders?id=eq.${order.id}`, {
      body: { refunded_amount: order.total_amount + 1 },
    });
    ok(res.status >= 400, `database menerima refund berlebih (status ${res.status})`);
  });

  await test('refund order yang tidak ada → 404', async () => {
    const res = await api('PATCH', '/api/orders/00000000-0000-0000-0000-000000000000/refund', {
      body: {},
    });
    eq(res.status, 404, 'status');
  });

  await test('refund tanpa login ditolak 401', async () => {
    const res = await api('PATCH', `/api/orders/${order.id}/refund`, { body: {}, auth: false });
    eq(res.status, 401, 'status');
  });

  // ===================================================== omzet setelah refund
  section('Omzet setelah refund');

  await test('riwayat membawa refunded_amount, dan bersihnya nol', async () => {
    const res = await api('GET', '/api/orders?history=1');
    const found = res.body.find((o) => o.id === order.id);
    ok(found, 'order refund tidak ada di riwayat');
    eq(found.refunded_amount, found.total_amount, 'refunded_amount');
    // Rumus yang sama persis dipakai aplikasi kasir (OrderModel.netAmount) dan
    // dashboard owner. Kalau salah satunya bergeser, angka warung berselisih.
    eq(found.total_amount - found.refunded_amount, 0, 'omzet bersih order ini');
  });

  await test('refund sebagian hanya memotong sebagian omzet', async () => {
    const partial = await makeOrder({
      paymentStatus: 'PAID',
      lines: [{ item: itemA, quantity: 2, subtotal: itemA.price * 2 }],
      tableId: table?.id ?? null,
    });
    const fresh = await readOrder(partial.id);
    const res = await api('PATCH', `/api/orders/${partial.id}/refund`, {
      body: { items: [{ order_item_id: fresh.items[0].id, quantity: 1 }] },
    });
    eq(res.status, 200, 'status');
    eq(res.body.refunded_now, itemA.price, 'refunded_now');

    const after = await readOrder(partial.id);
    eq(after.total_amount - after.refunded_amount, itemA.price, 'omzet bersih sisa');
  });

  await test('refund pembulatan tidak pernah melampaui total', async () => {
    // 3 porsi dengan total 10.000: per porsi 3.333,33 → dibulatkan 3.333.
    // Refund 3 porsi = 9.999, lalu sisa 1 rupiah harus masih bisa ditutup.
    const odd = await makeOrder({
      paymentStatus: 'PAID',
      lines: [{ item: itemA, quantity: 3, subtotal: 10_000 }],
      tableId: table?.id ?? null,
    });
    const fresh = await readOrder(odd.id);
    const first = await api('PATCH', `/api/orders/${odd.id}/refund`, {
      body: { items: [{ order_item_id: fresh.items[0].id, quantity: 3 }] },
    });
    eq(first.status, 200, 'status refund per item');
    ok(first.body.refunded_now <= 10_000, 'refund melebihi total order');

    const rest = await api('PATCH', `/api/orders/${odd.id}/refund`, { body: {} });
    eq(rest.status, 200, 'status refund sisa');
    const after = await readOrder(odd.id);
    eq(after.refunded_amount, after.total_amount, 'refunded_amount akhir');
  });

  // ============================================================== pengeluaran
  section('Pengeluaran (rekap kas)');

  let expense = null;

  await test('pengeluaran tercatat atas nama yang login', async () => {
    const res = await api('POST', '/api/expenses', {
      body: { amount: 12_500, note: `${MARKER} galon` },
    });
    eq(res.status, 201, 'status');
    eq(res.body.amount, 12_500, 'amount');
    eq(res.body.created_by, 'E2E Robot', 'created_by');
    expense = res.body;
    createdExpenses.push(expense.id);
  });

  await test('nominal nol atau minus ditolak', async () => {
    const zero = await api('POST', '/api/expenses', { body: { amount: 0, note: 'x' } });
    eq(zero.status, 400, 'status nol');
    const minus = await api('POST', '/api/expenses', { body: { amount: -5000, note: 'x' } });
    eq(minus.status, 400, 'status minus');
  });

  await test('keterangan kosong ditolak', async () => {
    const res = await api('POST', '/api/expenses', { body: { amount: 5000, note: '   ' } });
    eq(res.status, 400, 'status');
  });

  await test('penyaringan tanggal memakai batas yang dikirim klien', async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const res = await api('GET', `/api/expenses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    eq(res.status, 200, 'status');
    ok(res.body.some((e) => e.id === expense.id), 'pengeluaran hari ini tidak ikut terbawa');

    const kemarin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const past = await api('GET', `/api/expenses?from=${encodeURIComponent(kemarin)}&to=${encodeURIComponent(from)}`);
    ok(!past.body.some((e) => e.id === expense.id), 'pengeluaran bocor ke tanggal lain');
  });

  await test('tanggal ngawur ditolak 400', async () => {
    const res = await api('GET', '/api/expenses?from=kemarin-sore');
    eq(res.status, 400, 'status');
  });

  await test('pengeluaran bisa dihapus', async () => {
    const res = await api('DELETE', `/api/expenses/${expense.id}`);
    ok(res.status === 200 || res.status === 204, `status ${res.status}`);
    const after = await db('GET', `expenses?id=eq.${expense.id}&select=id`);
    eq(after.body.length, 0, 'baris pengeluaran masih ada');
  });

  // ================================================================ antrian cetak
  section('Antrian cetak');

  await test('struk kasir dan dapur diantrikan terpisah per stasiun', async () => {
    const printed = await makeOrder({
      paymentStatus: 'PAID',
      lines: [{ item: itemA, quantity: 1, subtotal: itemA.price }],
      tableId: table?.id ?? null,
    });
    // makeOrder sudah membuang antriannya supaya tablet tidak ikut mencetak;
    // dibuat ulang lewat mark-paid akan gagal (sudah lunas), jadi yang diperiksa
    // adalah kolom station-nya lewat satu order tambahan.
    const fresh = await api('POST', '/api/orders', {
      body: {
        table_id: table?.id ?? null,
        payment_method: 'CASH',
        payment_status: 'PAID',
        total_amount: itemA.price,
        notes: MARKER,
        items: [{
          menu_item_id: itemA.id,
          menu_item_name: itemA.name,
          menu_item_price: itemA.price,
          quantity: 1,
          subtotal: itemA.price,
          variations: [],
        }],
      },
    });
    createdOrders.push(fresh.body.id);

    const jobs = await db('GET', `print_jobs?order_id=eq.${fresh.body.id}&select=station,status,text_body`);
    await dropPrintJobs(fresh.body.id);
    await dropPrintJobs(printed.id);

    ok(jobs.body.length >= 1, 'tidak ada struk yang diantrikan');
    const stations = jobs.body.map((j) => j.station);
    ok(new Set(stations).size === stations.length, `stasiun kembar: ${stations.join(', ')}`);
    // Struk dapur tidak boleh memuat rupiah — itu untuk juru masak, bukan kasir.
    for (const job of jobs.body) {
      if (job.station === 'KITCHEN') {
        ok(!/Rp/i.test(job.text_body), 'struk dapur memuat harga');
      }
    }
  });

  // ========================================================= beban server
  section('Beban server');

  await test('ringkasan antrian cetak jauh lebih ringan dari daftarnya', async () => {
    const counts = await api('GET', '/api/print/jobs?counts=1');
    eq(counts.status, 200, 'status');
    ok(typeof counts.body.pending === 'number', 'pending bukan angka');
    ok(Array.isArray(counts.body.pending_stations), 'pending_stations bukan daftar');

    const list = await api('GET', '/api/print/jobs');
    eq(list.status, 200, 'status daftar');

    // Inilah alasan mode ini ada: loop cetak memanggilnya tiap 4 detik.
    ok(
      counts.raw.length * 10 < list.raw.length,
      `ringkasan ${counts.raw.length} byte vs daftar ${list.raw.length} byte - '
      + 'harusnya jauh lebih kecil`,
    );
  });

  await test('daftar antrian cetak tidak lagi membawa isi struk', async () => {
    const res = await api('GET', '/api/print/jobs');
    for (const job of res.body.jobs) {
      ok(job.text_body === undefined, 'text_body masih ikut di daftar');
      ok(job.payload !== undefined, 'payload hilang - dashboard butuh ini');
    }
  });

  await test('isi struk tetap bisa diambil satu per satu', async () => {
    const list = await api('GET', '/api/print/jobs');
    if (list.body.jobs.length === 0) return; // tidak ada job untuk diperiksa
    const id = list.body.jobs[0].id;
    const res = await api('GET', `/api/print/jobs?id=${id}`);
    eq(res.status, 200, 'status');
    ok(typeof res.body.job.text_body === 'string', 'text_body tidak ada');
  });

  await test('riwayat menghormati limit yang diminta', async () => {
    const res = await api('GET', '/api/orders/history?limit=3');
    eq(res.status, 200, 'status');
    ok(res.body.length <= 3, `dapat ${res.body.length} order, minta 3`);
  });

  await test('riwayat TIDAK memotong diam-diam pada pemakaian normal', async () => {
    // Uji yang paling penting di berkas ini.
    //
    // Batas bawaan pernah disetel 200, dan pada 723 order itu menyembunyikan
    // 523 di antaranya - riwayat warung terpotong jadi hanya dua hari terakhir,
    // tanpa satu pun pesan di layar. Yang menemukannya karyawan warung, bukan
    // sistem, dan baru berhari-hari kemudian.
    //
    // Jadi: seluruh riwayat harus muat dalam sekali panggil bawaan. Kalau suatu
    // hari warung ini melewati batasnya, uji inilah yang gagal duluan - bukan
    // Vona yang mencari rekap dan tidak menemukannya.
    const count = await api('GET', '/api/orders/history?count=1');
    eq(count.status, 200, 'status hitungan');

    const all = await api('GET', '/api/orders/history');
    eq(all.status, 200, 'status daftar');
    eq(
      all.body.length,
      count.body.count,
      `riwayat terpotong: ${count.body.count} order ada di database, ` +
        `tapi hanya ${all.body.length} yang dikembalikan tanpa parameter`,
    );
  });

  await test('riwayat menghormati batas tanggal dari klien', async () => {
    const now = new Date();
    const besok = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const lusa = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    const res = await api(
      'GET',
      `/api/orders/history?from=${encodeURIComponent(besok.toISOString())}&to=${encodeURIComponent(lusa.toISOString())}`,
    );
    eq(res.status, 200, 'status');
    eq(res.body.length, 0, 'order dari masa depan');
  });

  await test('hitungan riwayat cocok dengan daftarnya', async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const q = `from=${encodeURIComponent(from)}`;
    const count = await api('GET', `/api/orders/history?count=1&${q}`);
    const list = await api('GET', `/api/orders/history?limit=500&${q}`);
    eq(count.status, 200, 'status hitungan');
    eq(count.body.count, list.body.length, 'hitungan vs jumlah baris');
  });

  await test('tanggal ngawur di riwayat ditolak 400', async () => {
    const res = await api('GET', '/api/orders/history?from=kemarin-sore');
    eq(res.status, 400, 'status');
  });

  // ==================================================== filter per tanggal
  section('Filter per tanggal');

  // Semua layar berangka di aplikasi memakai pola yang sama: preset cepat, plus
  // SATU TANGGAL TERTENTU yang menimpanya. Yang diuji di sini bukan tombolnya,
  // melainkan janji yang dipegang server: batas `from`/`to` dari klien dihormati
  // apa adanya, karena tengah malam di warung adalah tengah malam WIB.

  const hariIni = new Date();
  const awalHari = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate());
  const akhirHari = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate() + 1);
  const iso = (d) => encodeURIComponent(d.toISOString());

  await test('laporan penjualan bisa dibatasi satu tanggal', async () => {
    const res = await api(
      'GET',
      `/api/reports/menu-sales?from=${iso(awalHari)}&to=${iso(akhirHari)}`,
    );
    eq(res.status, 200, 'status');
    ok(res.body !== null, 'balasan kosong');
  });

  await test('laporan tanggal di masa depan: semua menu nol, bukan kosong', async () => {
    const besok = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate() + 1);
    const lusa = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate() + 2);
    const res = await api('GET', `/api/reports/menu-sales?from=${iso(besok)}&to=${iso(lusa)}`);
    eq(res.status, 200, 'status');

    // Daftarnya sengaja TETAP berisi seluruh menu dengan qty 0 - itulah yang
    // dipakai owner untuk melihat "kurang laku". Yang harus nol adalah
    // angkanya, bukan panjang daftarnya.
    const items = res.body.items ?? [];
    ok(items.length > 0, 'daftar menu tidak boleh kosong');
    const terjual = items.reduce((n, i) => n + i.qty_sold, 0);
    const omzet = items.reduce((n, i) => n + i.revenue, 0);
    eq(terjual, 0, 'porsi terjual di masa depan');
    eq(omzet, 0, 'omzet di masa depan');
  });

  await test('jatah makan bisa dibatasi satu tanggal', async () => {
    const hari = awalHari.toISOString().slice(0, 10);
    const res = await api('GET', `/api/staff-meals?from=${hari}&to=${hari}`);
    eq(res.status, 200, 'status');
    ok(Array.isArray(res.body), 'balasan harus berupa daftar');
  });

  await test('riwayat satu tanggal hanya berisi tanggal itu', async () => {
    const res = await api(
      'GET',
      `/api/orders/history?from=${iso(awalHari)}&to=${iso(akhirHari)}`,
    );
    eq(res.status, 200, 'status');
    for (const o of res.body) {
      const at = new Date(o.created_at);
      ok(
        at >= awalHari && at < akhirHari,
        `order ${o.id} bertanggal ${o.created_at}, di luar rentang yang diminta`,
      );
    }
  });

  // ============================================== ringkasan rekap owner
  section('Ringkasan rekap');

  await test('ringkasan owner jauh lebih ringan daripada menarik order mentah', async () => {
    const q = `from=${iso(new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate() - 6))}`;
    const ringkas = await api('GET', `/api/reports/summary?${q}`);
    const mentah = await api('GET', `/api/orders?history=1&limit=500&${q}`);

    eq(ringkas.status, 200, 'status');
    ok(
      ringkas.raw.length * 20 < mentah.raw.length,
      `ringkasan ${ringkas.raw.length} byte vs order mentah ${mentah.raw.length} byte`,
    );
  });

  await test('omzet ringkasan memakai rumus yang sama dengan aplikasi kasir', async () => {
    // total_amount - refunded_amount, hanya SERVED, batal tidak ikut.
    // Kalau ini bergeser, dashboard owner dan tablet menampilkan angka berbeda
    // untuk hari yang sama - dan tidak ada yang tahu mana yang benar.
    const q = `from=${iso(new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate() - 29))}`;
    const ringkas = await api('GET', `/api/reports/summary?${q}`);
    // limit 5000, bukan 500: ringkasan menghitung SELURUH order dalam rentang,
    // jadi pembandingnya harus lengkap juga. Versi pertama uji ini memakai 500
    // dan gagal dengan selisih Rp 10,8 juta - bukan karena kodenya salah, tapi
    // karena pembandingnya sendiri terpotong. Persis jebakan yang sama dengan
    // batas riwayat 200 (v3.7).
    const mentah = await api('GET', `/api/orders?history=1&limit=5000&${q}`);

    const harusnya = mentah.body
      .filter((o) => o.status === 'SERVED')
      .reduce((n, o) => n + o.total_amount - (o.refunded_amount ?? 0), 0);

    eq(ringkas.body.revenue, harusnya, 'omzet');
    eq(ringkas.body.orders, mentah.body.length, 'jumlah order');
    eq(
      ringkas.body.cancelled,
      mentah.body.filter((o) => o.status === 'CANCELLED').length,
      'jumlah batal',
    );
  });

  await test('ringkasan hanya mengembalikan 10 order terbaru, berapa pun rentangnya', async () => {
    const res = await api('GET', '/api/reports/summary');
    eq(res.status, 200, 'status');
    ok(res.body.recent.length <= 10, `dapat ${res.body.recent.length} order terbaru`);
    ok(res.body.top_menu.length <= 10, `dapat ${res.body.top_menu.length} menu teratas`);
  });

  // ================================================================ pembatalan
  section('Pembatalan');

  await test('order yang sudah SERVED tidak bisa dibatalkan', async () => {
    // Alur dapur sudah dipensiunkan: POST /api/orders langsung membuat SERVED.
    // Jadi tombol batal memang tidak berlaku lagi lewat API — yang salah harus
    // dikoreksi dengan refund, bukan dibatalkan. Ini menjaga agar aturan itu
    // tidak diam-diam berubah.
    const doomed = await makeOrder({
      lines: [{ item: itemB, quantity: 1, subtotal: itemB.price }],
      tableId: table?.id ?? null,
    });
    const res = await api('PATCH', `/api/orders/${doomed.id}/cancel`, {
      body: { reason: `${MARKER} dibatalkan` },
    });
    eq(res.status, 400, 'status');
  });

  await test('order batal muncul di riwayat, bukan di board kasir', async () => {
    const doomed = await makeOrder({
      lines: [{ item: itemB, quantity: 1, subtotal: itemB.price }],
      tableId: table?.id ?? null,
    });
    // Disetel langsung: ini penyiapan keadaan, bukan bagian yang diuji.
    await db('PATCH', `orders?id=eq.${doomed.id}`, {
      body: { status: 'CANCELLED', cancel_reason: `${MARKER} dibatalkan` },
    });

    const board = await api('GET', '/api/orders?mode=cashier');
    ok(!board.body.some((o) => o.id === doomed.id), 'order batal masih di board kasir');

    const history = await api('GET', '/api/orders?history=1');
    ok(history.body.some((o) => o.id === doomed.id), 'order batal tidak ada di riwayat');
  });
}

// ---------------------------------------------------------------------- jalan

let exitCode = 0;
try {
  await main();
} catch (e) {
  console.error(`\n💥 Berhenti di tengah: ${e.message}`);
  exitCode = 1;
} finally {
  await cleanup();
}

console.log(`\n${'─'.repeat(52)}`);
if (failures.length === 0) {
  console.log(`✅ ${passed} uji lolos.`);
} else {
  console.log(`❌ ${failures.length} gagal, ${passed} lolos.\n`);
  for (const f of failures) console.log(`   [${f.group}] ${f.name}\n     ${f.message}`);
  exitCode = 1;
}
process.exit(exitCode);
