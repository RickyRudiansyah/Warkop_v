import { PaymentMethod } from '@/types';
import { PaymentProvider, getPaymentFactory } from './types';
import { CashProvider } from './cash';
import { MidtransProvider } from './midtrans';

const providers: Record<string, PaymentProvider> = {};

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  const factory = getPaymentFactory();

  if (method === 'CASH') {
    if (!providers.CASH) providers.CASH = new CashProvider();
    return providers.CASH;
  }

  if (factory === 'MIDTRANS') {
    if (!providers.MIDTRANS) providers.MIDTRANS = new MidtransProvider();
    return providers.MIDTRANS;
  }

  if (!providers.CASH) providers.CASH = new CashProvider();
  return providers.CASH;
}
