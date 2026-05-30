export interface PrinterProvider {
  printReceipt(data: ReceiptData): Promise<{ success: boolean; error?: string }>;
}

export interface ReceiptData {
  order_id: string;
  table_number: number;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    subtotal: number;
    variations?: string;
    notes?: string;
  }>;
  total: number;
  payment_method: string;
  created_at: string;
}
