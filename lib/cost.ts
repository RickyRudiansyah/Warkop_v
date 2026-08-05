import { createAdminClient } from '@/lib/supabase/server';

/**
 * Ambil HPP terkini tiap menu untuk disalin ke `order_items.cost_price_snapshot`.
 *
 * Nilainya SELALU diambil server dari `menu_items`, tidak pernah dari payload
 * klien. Kalau klien yang mengirim angka biaya, siapa pun yang bisa memanggil
 * API bisa memalsukan laporan laba — dan datanya akan terlihat wajar sehingga
 * tidak pernah ketahuan.
 *
 * Dipakai bersama oleh order pelanggan, order manual kasir, dan settleIntent.
 */
export async function fetchCostPrices(
  items: Array<{ menu_item_id?: string | null }>,
): Promise<Record<string, number>> {
  const ids = [...new Set(items.map(i => i.menu_item_id).filter(Boolean))] as string[];
  if (ids.length === 0) return {};

  const supabase = createAdminClient();
  const { data } = await supabase.from('menu_items').select('id, cost_price').in('id', ids);
  return Object.fromEntries((data ?? []).map(m => [m.id, m.cost_price ?? 0]));
}
