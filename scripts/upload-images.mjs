import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const IMAGE_DIR = join(ROOT, 'image');

const envContent = readFileSync(join(ROOT, '.env'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const IMAGE_MAPPING = {
  'kopi': 'Kopi Hitam',
  'Es_Jeruk': 'Es Jeruk',
  'Es_Kopi_Susu': 'Kopi Susu',
  'Es_Teh': 'Es Teh Manis',
  'Indomie_Goreng': 'Mie Goreng',
  'Indomie_Goreng_Spesial': 'Mie Goreng',
  'Indomie_Kuah': 'Indomie Rebus',
  'Kentang': null,
  'Pisang_Goreng': 'Pisang Goreng',
  'Ropang': 'Roti Bakar',
  'Ropang_Keju': 'Roti Bakar',
  'Ropang_Coklat_Keju': 'Roti Bakar',
};

async function main() {
  console.log('Fetching menu items...');
  const { data: menuItems, error } = await supabase.from('menu_items').select('id, name');

  if (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }

  console.log(`Menu items (${menuItems.length}):`);
  menuItems.forEach(m => console.log(`  - ${m.name}`));
  console.log('');

  const files = readdirSync(IMAGE_DIR).filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f));
  let uploaded = 0;

  for (const file of files) {
    const fileName = file.replace(/\.[^.]+$/, '');
    const targetName = IMAGE_MAPPING[fileName];
    if (targetName === undefined) { console.warn(`[SKIP] ${file} — tidak ada di mapping`); continue; }
    if (targetName === null) { console.warn(`[SKIP] ${file} — tidak ada menu yang cocok di database`); continue; }

    const matched = menuItems.find(m => m.name === targetName);
    if (!matched) { console.warn(`[SKIP] ${file} — "${targetName}" tidak ditemukan di database`); continue; }

    const fileBuffer = readFileSync(join(IMAGE_DIR, file));
    const ext = file.split('.').pop();
    const storagePath = `${Date.now()}-${fileName.replace(/\s+/g, '_')}.${ext}`;
    const ct = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    console.log(`[UPLOAD] ${file} → "${matched.name}"`);

    const { error: upErr } = await supabase.storage
      .from('menu-images')
      .upload(storagePath, fileBuffer, { contentType: ct, upsert: true });

    if (upErr) { console.error(`  [ERROR] ${upErr.message}`); continue; }

    const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(storagePath);
    console.log(`  [OK] ${urlData.publicUrl}`);

    const { error: dbErr } = await supabase
      .from('menu_items')
      .update({ image_url: urlData.publicUrl })
      .eq('id', matched.id);

    if (dbErr) console.error(`  [DB ERROR] ${dbErr.message}`);
    else { console.log(`  [DB] tersimpan`); uploaded++; }
  }

  console.log(`\nSelesai! ${uploaded}/${files.length} berhasil.`);
}

main().catch(console.error);
