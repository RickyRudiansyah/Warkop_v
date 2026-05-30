import { PaymentMethod } from '@/types';

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  redirect_url?: string;
  error?: string;
}

export interface PaymentProvider {
  createPayment(params: {
    order_id: string;
    amount: number;
    method: PaymentMethod;
    customer_name?: string;
    table_number?: number;
  }): Promise<PaymentResult>;
  verifyPayment(transaction_id: string): Promise<{ success: boolean }>;
}

export type PaymentProviderType = 'CASH' | 'MIDTRANS';

export function getPaymentFactory(): PaymentProviderType {
  return (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER as PaymentProviderType) || 'CASH';
}
