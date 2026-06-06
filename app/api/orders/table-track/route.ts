import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Public endpoint — no auth required. Returns all non-cancelled orders for a table.
export async function GET(request: NextRequest) {
  const tableId = new URL(request.url).searchParams.get('tableId');
  if (!tableId) return NextResponse.json({ error: 'tableId required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, payment_method, payment_status, cancel_reason, total_amount, created_at, estimated_ready_at, items:order_items(id, menu_item_name, menu_item_price, quantity, subtotal, notes)')
    .eq('table_id', tableId)
    .neq('status', 'CANCELLED')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
