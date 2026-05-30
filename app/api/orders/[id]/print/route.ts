import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPrinter } from '@/lib/printer';

async function requireAuth() {
  const supabaseAuth = await createClient();
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return null;
  const { data: staff } = await supabaseAuth.from('staff_users').select('role').eq('id', session.user.id).maybeSingle();
  return staff || null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*), table:tables(*)')
    .eq('id', id)
    .single();

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  try {
    const printer = getPrinter();
    const result = await printer.printReceipt({
      order_id: order.id.slice(0, 8),
      table_number: order.table?.table_number || 0,
      items: (order.items || []).map((item: Record<string, unknown>) => ({
        name: item.menu_item_name as string,
        qty: item.quantity as number,
        price: item.menu_item_price as number,
        subtotal: item.subtotal as number,
        variations: item.variations ? JSON.stringify(item.variations) : '',
        notes: (item.notes as string) || '',
      })),
      total: order.total_amount,
      payment_method: order.payment_method,
      created_at: order.created_at,
    });

    if (result.success) {
      await supabase
        .from('orders')
        .update({ receipt_printed: true })
        .eq('id', id);
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
