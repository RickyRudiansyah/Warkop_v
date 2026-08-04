// Impor menu dari folder MenuVona/ ke Supabase.
//
//   node scripts/import-menu.mjs --dry-run   # lihat rencananya, tidak mengubah apa pun
//   node scripts/import-menu.mjs             # jalankan
//
// Yang dilakukan:
//   1. Cadangkan categories/menu_items/menu_variations ke scripts/backups/
//   2. Unggah semua gambar ke bucket menu-images
//   3. Ganti isi ketiga tabel dengan data dari CSV
//
// Catatan: menghapus menu_items membuat order_items.menu_item_id jadi NULL
// (ON DELETE SET NULL). Riwayat tetap terbaca karena order_items menyimpan
// menu_item_name & menu_item_price sebagai snapshot.

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'MenuVona');
const BUCKET = 'menu-images';
const DRY = process.argv.includes('--dry-run');

function loadEnv() {
  const env = {};
  for (const file of ['.env', '.env.local']) {
    const p = join(ROOT, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf-8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i > -1) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  }
  return { ...env, ...process.env };
}

// Parser CSV yang menghormati tanda kutip, supaya deskripsi ber-koma tidak pecah.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter(r => r.some(v => v !== '')).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const bool = v => String(v).toLowerCase() === 'true';
const int = v => parseInt(v, 10) || 0;

const categories = parseCsv(readFileSync(join(SRC, 'categories.csv'), 'utf-8'))
  .map(r => ({ id: r.id, name: r.name, sort_order: int(r.sort_order) }));

const items = parseCsv(readFileSync(join(SRC, 'menu_items.csv'), 'utf-8'))
  .map(r => ({
    id: r.id, category_id: r.category_id, name: r.name,
    description: r.description || null, price: int(r.price),
    image_url: r.image_url || null,
    is_available: bool(r.is_available), is_sold_out: bool(r.is_sold_out),
  }));

const variations = parseCsv(readFileSync(join(SRC, 'menu_variations.csv'), 'utf-8'))
  .map(r => ({
    id: r.id, menu_item_id: r.menu_item_id,
    variation_type: r.variation_type, label: r.label, extra_price: int(r.extra_price),
  }));

const images = readdirSync(SRC).filter(f => /\.(jpe?g|png|webp)$/i.test(f));

console.log('\n  Akan diimpor:');
console.log('    kategori : ' + categories.length);
console.log('    menu     : ' + items.length);
console.log('    variasi  : ' + variations.length);
console.log('    gambar   : ' + images.length);

// --- Validasi silang sebelum menyentuh database ---
const catIds = new Set(categories.map(c => c.id));
const itemIds = new Set(items.map(i => i.id));
const problems = [];
for (const i of items) if (!catIds.has(i.category_id)) problems.push(`menu "${i.name}" menunjuk category_id tak dikenal`);
for (const v of variations) if (!itemIds.has(v.menu_item_id)) problems.push(`variasi "${v.label}" menunjuk menu_item_id tak dikenal`);
for (const i of items) {
  const f = i.image_url?.split('/').pop();
  if (f && !images.includes(f)) problems.push(`gambar "${f}" untuk "${i.name}" tidak ada di folder`);
}
if (problems.length) {
  console.error('\n  GAGAL — data tidak konsisten:');
  problems.slice(0, 10).forEach(p => console.error('    - ' + p));
  process.exit(1);
}
console.log('    validasi silang: OK');

if (DRY) { console.log('\n  --dry-run: tidak ada yang diubah.\n'); process.exit(0); }

// --- 1. Cadangkan ---
const backupDir = join(ROOT, 'scripts', 'backups');
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = {};
for (const t of ['categories', 'menu_items', 'menu_variations']) {
  backup[t] = (await db.from(t).select('*')).data ?? [];
}
const backupPath = join(backupDir, `menu-${stamp}.json`);
writeFileSync(backupPath, JSON.stringify(backup, null, 2));
console.log('\n  1. Cadangan disimpan: scripts/backups/menu-' + stamp + '.json');
console.log('     (' + backup.categories.length + ' kategori, ' + backup.menu_items.length + ' menu, ' + backup.menu_variations.length + ' variasi)');

// --- 2. Unggah gambar ---
let uploaded = 0, failed = [];
for (const f of images) {
  const { error } = await db.storage.from(BUCKET).upload(f, readFileSync(join(SRC, f)), {
    contentType: f.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
    upsert: true,
  });
  if (error) failed.push(f + ': ' + error.message); else uploaded++;
}
console.log('  2. Gambar diunggah: ' + uploaded + '/' + images.length);
if (failed.length) { console.error('     GAGAL:'); failed.forEach(f => console.error('       ' + f)); process.exit(1); }

// --- 3. Ganti isi tabel (urutan aman terhadap foreign key) ---
const wipe = async (table) => {
  const { error } = await db.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) { console.error('  gagal mengosongkan ' + table + ': ' + error.message); process.exit(1); }
};
await wipe('menu_variations');
await wipe('menu_items');
await wipe('categories');
console.log('  3. Tabel lama dikosongkan');

const insert = async (table, rows) => {
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from(table).insert(rows.slice(i, i + 100));
    if (error) { console.error('  gagal menulis ' + table + ': ' + error.message); process.exit(1); }
  }
};
await insert('categories', categories);
await insert('menu_items', items);
await insert('menu_variations', variations);

// --- 4. Verifikasi ---
const count = async t => (await db.from(t).select('*', { count: 'exact', head: true })).count;
console.log('  4. Hasil di database:');
console.log('     categories      : ' + await count('categories') + ' (harusnya ' + categories.length + ')');
console.log('     menu_items      : ' + await count('menu_items') + ' (harusnya ' + items.length + ')');
console.log('     menu_variations : ' + await count('menu_variations') + ' (harusnya ' + variations.length + ')');
console.log('\n  Selesai.\n');
