import { PrinterProvider, ReceiptData } from './types';

export class DummyPrinter implements PrinterProvider {
  async printReceipt(data: ReceiptData): Promise<{ success: boolean; error?: string }> {
    console.log('[DUMMY PRINTER] Receipt for order:', data.order_id);
    console.log('  Table:', data.table_number);
    console.log('  Items:', data.items.length);
    console.log('  Total:', data.total);
    console.log('  Payment:', data.payment_method);
    return { success: true };
  }
}
