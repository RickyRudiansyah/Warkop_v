import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPrinter } from '@/lib/printer';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { order_id, transaction_status, transaction_id } = body;

  if (!order_id) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*, items:order_items(*), table:tables(*)')
    .eq('id', order_id)
    .single();

  if (fetchError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Midtrans statuses: settlement, capture = success
  const isSuccess = transaction_status && ['settlement', 'capture'].includes(transaction_status);

  if (isSuccess && order.payment_status !== 'PAID') {
    const now = new Date().toISOString();

    await supabase
      .from('orders')
      .update({
        status: 'PAID',
        payment_status: 'PAID',
        paid_at: now,
        payment_ref: transaction_id || order.payment_ref,
      })
      .eq('id', order_id);

    // Auto-print receipt
    try {
      const printer = getPrinter();
      await printer.printReceipt({
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
      await supabase.from('orders').update({ receipt_printed: true }).eq('id', order_id);
    } catch {
      // Ignore printer errors
    }
  }

  return NextResponse.json({ success: true });
}
