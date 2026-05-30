import { PrinterProvider, ReceiptData } from './types';
import { DummyPrinter } from './dummy';
import { EscPosPrinter } from './escpos';

let instance: PrinterProvider | null = null;

export function getPrinter(): PrinterProvider {
  if (!instance) {
    const endpoint = process.env.PRINTER_ENDPOINT;
    if (endpoint) {
      instance = new EscPosPrinter();
    } else {
      instance = new DummyPrinter();
    }
  }
  return instance;
}

export type { PrinterProvider, ReceiptData };
