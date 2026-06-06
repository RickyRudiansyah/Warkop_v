import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, payment_method, payment_status, cancel_reason, table:tables(table_number, label), total_amount, notes, created_at, confirmed_at, estimated_ready_at, items:order_items(id, menu_item_name, menu_item_price, quantity, subtotal, notes, variations)')
    .eq('id', id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
