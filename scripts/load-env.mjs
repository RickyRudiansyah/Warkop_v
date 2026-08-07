// Pembaca .env untuk script CLI.
//
// Dibuat terpisah supaya semua script memakai aturan yang SAMA dengan Next.js.
// Yang paling gampang terlewat: **komentar inline**.
//
//   MIDTRANS_SERVER_KEY=Mid-server-abc123 #Production
//
// Next.js (lewat dotenv) membaca itu sebagai `Mid-server-abc123`. Pembaca naif
// yang cuma memotong di tanda `=` ikut membawa ` #Production`, lalu Midtrans
// membalas 401 "Unknown Merchant server_key/id" — dan yang dicurigai justru
// kuncinya, bukan pembacanya. Sudah pernah memakan waktu; jangan diulang.

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Buang komentar inline dari nilai yang TIDAK diapit kutip. */
function stripInlineComment(value) {
  if (/^["']/.test(value)) return value; // di dalam kutip, '#' itu isi
  return value.replace(/\s+#.*$/, '');
}

export function loadEnv() {
  const env = {};
  // .env.local menimpa .env — urutan yang sama dengan Next.js.
  for (const file of ['.env', '.env.local']) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const raw = stripInlineComment(trimmed.slice(idx + 1).trim());
      env[key] = raw.replace(/^["']|["']$/g, '');
    }
  }
  // Variabel dari shell tetap menang.
  return { ...env, ...process.env };
}
