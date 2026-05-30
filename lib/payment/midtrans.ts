import { PaymentProvider, PaymentResult } from './types';

export class MidtransProvider implements PaymentProvider {
  private serverKey: string;
  private clientKey: string;
  private isProduction: boolean;

  constructor() {
    this.serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    this.clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
    this.isProduction = process.env.MIDTRANS_PRODUCTION === 'true';
  }

  private get baseUrl() {
    return this.isProduction
      ? 'https://app.midtrans.com/snap/v1'
      : 'https://app.sandbox.midtrans.com/snap/v1';
  }

  async createPayment(params: {
    order_id: string;
    amount: number;
    method: 'QRIS' | 'TRANSFER_BCA';
    customer_name?: string;
    table_number?: number;
  }): Promise<PaymentResult> {
    if (!this.serverKey) {
      return { success: false, error: 'Midtrans not configured' };
    }

    try {
      const paymentTypes = params.method === 'QRIS' ? ['gopay', 'qris', 'shopeepay'] : ['bank_transfer'];

      const body = {
        transaction_details: {
          order_id: params.order_id,
          gross_amount: params.amount,
        },
        customer_details: {
          first_name: params.customer_name || 'Customer',
        },
        enabled_payments: paymentTypes,
      };

      const res = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${btoa(this.serverKey + ':')}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.redirect_url) {
        return { success: true, transaction_id: data.token, redirect_url: data.redirect_url };
      }

      return { success: false, error: data.error_messages?.join(', ') || 'Payment failed' };
    } catch {
      return { success: false, error: 'Payment service unavailable' };
    }
  }

  async verifyPayment(transaction_id: string): Promise<{ success: boolean }> {
    if (!this.serverKey) return { success: false };

    try {
      const res = await fetch(
        `${this.isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'}/v2/${transaction_id}/status`,
        {
          headers: {
            'Authorization': `Basic ${btoa(this.serverKey + ':')}`,
          },
        }
      );

      const data = await res.json();
      const success = ['settlement', 'capture'].includes(data.transaction_status);
      return { success };
    } catch {
      return { success: false };
    }
  }
}
