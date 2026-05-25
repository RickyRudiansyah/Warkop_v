import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const history = searchParams.get('history');
  let query = supabase.from('orders').select('*, table:tables(*), items:order_items(*)').order('created_at', { ascending: false });
  if (!history) {
    query = query.not('status', 'in', '(SERVED,CANCELLED)');
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();
  const { items, table_id, payment_method, total_amount, notes } = body;
  const { data: order, error: orderError } = await supabase.from('orders').insert({ table_id, payment_method, total_amount, notes, status: payment_method === 'CASH' ? 'PENDING_CASH' : 'PENDING_PAYMENT' }).select().single();
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });
  const orderItems = items.map((item: any) => ({
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
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });
  return NextResponse.json({ ...order, items: orderItems }, { status: 201 });
}
