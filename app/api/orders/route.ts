import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { enqueueReceipt } from '@/lib/print';

async function requireAuth() {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabaseAuth.from('staff_users').select('role, name').eq('id', user.id).maybeSingle();
  return staff || null;
}

export async function GET(request: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const history = searchParams.get('history');
  const mode = searchParams.get('mode');
  let query = supabase.from('orders').select('*, table:tables(*), items:order_items(*)').order('created_at', { ascending: false });
  if (history) {
    // history: archived orders OR cancelled orders
    query = query.or('is_archived.eq.true,status.eq.CANCELLED');
  } else if (mode === 'cashier') {
    // cashier board: all non-archived, non-cancelled (includes SERVED until cashier presses Finish)
    query = query.eq('is_archived', false).neq('status', 'CANCELLED');
  } else {
    // kitchen board: non-archived, active kitchen statuses only
    query = query.eq('is_archived', false).not('status', 'in', '(SERVED,CANCELLED)');
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();
  const { items, table_id, payment_method, payment_status, total_amount, notes } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Items are required' }, { status: 400 });
  }
  if (!payment_method || !['CASH', 'QRIS'].includes(payment_method)) {
    return NextResponse.json({ error: 'Invalid payment_method' }, { status: 400 });
  }
  if (!payment_status || !['PAID', 'UNPAID'].includes(payment_status)) {
    return NextResponse.json({ error: 'Invalid payment_status' }, { status: 400 });
  }
  if (!total_amount || total_amount <= 0) {
    return NextResponse.json({ error: 'Invalid total_amount' }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase.from('orders').insert({ table_id, payment_method, payment_status, total_amount, notes, status: 'QUEUED' }).select().single();
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  const orderItems = items.map((item: { menu_item_id: string; menu_item_name: string; menu_item_price: number; quantity: number; variations?: unknown; subtotal: number; notes?: string }) => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    menu_item_name: item.menu_item_name,
    menu_item_price: item.menu_item_price,
    quantity: item.quantity,
    variations: item.variations || [],
    subtotal: item.subtotal,
    notes: item.notes || null,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Order manual kasir yang langsung lunas -> struk ikut dicetak.
  // Sengaja hanya untuk request ber-session staff: endpoint ini juga dipakai
  // pelanggan (selalu UNPAID), jadi antrian printer tidak bisa dipicu publik.
  if (payment_status === 'PAID') {
    const staff = await requireAuth();
    if (staff) {
      await enqueueReceipt(order.id, { trigger: 'CASHIER_PAID_ORDER', verifiedBy: staff.name });
    }
  }

  return NextResponse.json({ ...order, items: orderItems }, { status: 201 });
}
