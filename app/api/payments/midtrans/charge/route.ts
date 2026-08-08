import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isMidtransConfigured, midtransSnapQris } from '@/lib/midtrans';
import { QRIS_ENABLED } from '@/lib/features';

export const dynamic = 'force-dynamic';

interface ChargeBody {
  table_id?: string | null;
  total_amount?: number;
  notes?: string | null;
  items?: Array<{
    menu_item_id: string;
    menu_item_name: string;
    menu_item_price: number;
    quantity: number;
    variations?: unknown;
    subtotal: number;
    notes?: string | null;
  }>;
}

export async function POST(request: NextRequest) {
  // Inilah endpoint yang benar-benar dipakai checkout pelanggan — sakelar QRIS
  // harus di sini. Menaruhnya hanya di jalur Mayar membuat sakelarnya kosmetik:
  // UI-nya mati, tapi endpointnya tetap melayani siapa pun yang memanggilnya.
  if (!QRIS_ENABLED) {
    return NextResponse.json({ error: 'Pembayaran QRIS belum tersedia. Silakan pilih Cash (bayar di kasir).' }, { status: 503 });
  }
  if (!isMidtransConfigured()) {
    return NextResponse.json({ error: 'Pembayaran QRIS belum dikonfigurasi' }, { status: 503 });
  }

  const body: ChargeBody = await request.json().catch(() => ({}));
  const { table_id, total_amount, notes, items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Items are required' }, { status: 400 });
  }
  if (!total_amount || total_amount <= 0) {
    return NextResponse.json({ error: 'Invalid total_amount' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Store the full cart so the order can be created later, once payment settles.
  const { data: intent, error: intentError } = await supabase
    .from('payment_intents')
    .insert({
      status: 'PENDING',
      gross_amount: Math.round(total_amount),
      cart: { table_id: table_id ?? null, payment_method: 'QRIS', total_amount, notes: notes ?? null, items },
    })
    .select('id')
    .single();

  if (intentError || !intent) {
    return NextResponse.json({ error: intentError?.message || 'Gagal membuat pembayaran' }, { status: 500 });
  }

  // Alamat "selesai" dibuka di HP PELANGGAN, bukan di mesin ini. Mengirim
  // localhost berarti menyuruh HP itu membuka dirinya sendiri — pelanggan
  // mendarat di halaman error tepat setelah uangnya keluar. Lebih baik tidak
  // mengirim callback sama sekali: Snap menampilkan halaman hasilnya sendiri,
  // dan tab checkout yang masih polling tetap pindah ke order-success.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const reachable = /^https?:\/\//i.test(appUrl) && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(appUrl);
  if (appUrl && !reachable) {
    console.warn('[snap] NEXT_PUBLIC_APP_URL tidak bisa dijangkau pelanggan, callback finish dilewati:', appUrl);
  }

  const snap = await midtransSnapQris(intent.id, total_amount, {
    // `intentId`, bukan `orderId` — ordernya memang belum ada saat tautan ini
    // dibuat. order-success yang menukarnya lewat endpoint status.
    finishUrl: reachable ? appUrl + '/order-success?intentId=' + intent.id : undefined,
  });

  if (!snap.ok) {
    await supabase.from('payment_intents').update({ status: 'FAILED' }).eq('id', intent.id);
    return NextResponse.json({ error: snap.error }, { status: 502 });
  }

  // `qr_url` menyimpan halaman pembayaran Snap. Kolomnya dipakai ulang apa
  // adanya — isinya memang "ke mana pelanggan harus pergi untuk membayar".
  await supabase
    .from('payment_intents')
    .update({
      qr_url: snap.redirectUrl ?? null,
      midtrans_transaction_id: snap.token ?? null,
    })
    .eq('id', intent.id);

  return NextResponse.json({
    intentId: intent.id,
    snapUrl: snap.redirectUrl ?? null,
    grossAmount: Math.round(total_amount),
  });
}
