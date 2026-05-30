import { PrinterProvider, ReceiptData } from './types';

export class EscPosPrinter implements PrinterProvider {
  private endpoint: string;

  constructor() {
    this.endpoint = process.env.PRINTER_ENDPOINT || '';
  }

  async printReceipt(data: ReceiptData): Promise<{ success: boolean; error?: string }> {
    if (!this.endpoint) {
      return { success: false, error: 'Printer endpoint not configured' };
    }

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'receipt',
          data,
        }),
      });

      if (res.ok) return { success: true };
      return { success: false, error: 'Printer request failed' };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }
}
