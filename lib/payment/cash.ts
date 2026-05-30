import { PaymentProvider, PaymentResult } from './types';

export class CashProvider implements PaymentProvider {
  async createPayment(params: {
    order_id: string;
    amount: number;
    method: 'CASH';
    table_number?: number;
  }): Promise<PaymentResult> {
    return {
      success: true,
      transaction_id: `CASH-${params.order_id}`,
    };
  }

  async verifyPayment(transaction_id: string): Promise<{ success: boolean }> {
    return { success: true };
  }
}
