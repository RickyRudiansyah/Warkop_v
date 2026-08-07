import { Order, PaymentMethod, PaymentStatus } from '@/types';
import { tableLabel } from '@/lib/utils';

// Kertas thermal 58mm, Font A = 32 karakter per baris.
// Untuk printer 80mm set RECEIPT_COLUMNS=48 di env.
export const RECEIPT_COLUMNS = Number(process.env.RECEIPT_COLUMNS) || 32;

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  variations: string[];
  notes: string | null;
}

// Snapshot struk. Disimpan apa adanya di print_jobs.payload supaya struk yang
// dicetak tetap sama walaupun order/menu berubah setelahnya.
export interface Receipt {
  version: 1;
  store_name: string;
  store_address: string | null;
  store_phone: string | null;
  order_id: string;
  order_no: string;
  table_label: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paid_via: string;
  verified_by: string | null;
  ordered_at: string;
  issued_at: string;
  items: ReceiptItem[];
  total: number;
  footer: string;
  is_reprint: boolean;
}

// Kode order pendek untuk pelanggan: 6 karakter terakhir UUID.
export function orderNo(orderId: string): string {
  return orderId.replace(/-/g, '').slice(-6).toUpperCase();
}

function rupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(amount));
}

function jakartaTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jakarta',
    hour12: false,
  }).format(new Date(iso));
}

export interface BuildReceiptOptions {
  isReprint?: boolean;
  verifiedBy?: string | null;
  issuedAt?: string;
}

export function buildReceipt(order: Order, options: BuildReceiptOptions = {}): Receipt {
  const items: ReceiptItem[] = (order.items ?? []).map(item => ({
    name: item.menu_item_name,
    quantity: item.quantity,
    unit_price: item.menu_item_price,
    subtotal: item.subtotal,
    variations: (item.variations ?? []).map(v => v.label),
    notes: item.notes,
  }));

  // Struk pelanggan ikut memakai kata yang sama dengan layar kasir — pesanan
  // bungkus tercetak "Take Away", bukan "Tanpa Meja".
  const label = tableLabel(order.table);

  return {
    version: 1,
    store_name: process.env.RECEIPT_STORE_NAME || 'Rumipang',
    store_address: process.env.RECEIPT_STORE_ADDRESS || null,
    store_phone: process.env.RECEIPT_STORE_PHONE || null,
    order_id: order.id,
    order_no: orderNo(order.id),
    table_label: label,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    paid_via: order.payment_method === 'QRIS' ? 'QRIS (Midtrans)' : 'Tunai di Kasir',
    verified_by: options.verifiedBy ?? null,
    ordered_at: order.created_at,
    issued_at: options.issuedAt ?? new Date().toISOString(),
    items,
    total: order.total_amount,
    footer: process.env.RECEIPT_FOOTER || 'Terima kasih atas kunjungan Anda!',
    is_reprint: options.isReprint ?? false,
  };
}

// ---- Text renderer (ESC/POS friendly, monospace fixed width) ----

function center(text: string, width: number): string {
  const t = text.slice(0, width);
  const pad = Math.max(0, Math.floor((width - t.length) / 2));
  return ' '.repeat(pad) + t;
}

// Kiri-kanan dalam satu baris. Kalau tidak muat, kanan tetap utuh dan kiri dipotong.
function columns(left: string, right: string, width: number): string {
  const maxLeft = Math.max(0, width - right.length - 1);
  const l = left.length > maxLeft ? left.slice(0, maxLeft) : left;
  const gap = Math.max(1, width - l.length - right.length);
  return l + ' '.repeat(gap) + right;
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line) { line = word.slice(0, width); continue; }
    if (line.length + 1 + word.length <= width) { line += ' ' + word; }
    else { lines.push(line); line = word.slice(0, width); }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export function renderReceiptText(receipt: Receipt, width: number = RECEIPT_COLUMNS): string {
  const rule = '-'.repeat(width);
  const lines: string[] = [];

  lines.push(center(receipt.store_name.toUpperCase(), width));
  if (receipt.store_address) wrap(receipt.store_address, width).forEach(l => lines.push(center(l, width)));
  if (receipt.store_phone) lines.push(center(receipt.store_phone, width));
  if (receipt.is_reprint) lines.push(center('** CETAK ULANG **', width));
  lines.push(rule);

  lines.push(columns('No', receipt.order_no, width));
  // "Meja        Take Away" terbaca ganjil di kertas 32 kolom. Untuk pesanan
  // bungkus, label kirinya yang berganti — isinya tetap satu kolom kanan.
  lines.push(receipt.table_label === 'Take Away'
    ? columns('Jenis', 'TAKE AWAY', width)
    : columns('Meja', receipt.table_label, width));
  lines.push(columns('Waktu', jakartaTime(receipt.ordered_at), width));
  lines.push(columns('Bayar', receipt.paid_via, width));
  if (receipt.verified_by) lines.push(columns('Kasir', receipt.verified_by, width));
  lines.push(rule);

  for (const item of receipt.items) {
    wrap(item.name, width).forEach(l => lines.push(l));
    if (item.variations.length) {
      wrap('+ ' + item.variations.join(', '), width - 2).forEach(l => lines.push('  ' + l));
    }
    if (item.notes) {
      wrap('* ' + item.notes, width - 2).forEach(l => lines.push('  ' + l));
    }
    lines.push(columns(
      '  ' + item.quantity + ' x ' + rupiah(item.unit_price),
      rupiah(item.subtotal),
      width,
    ));
  }

  lines.push(rule);
  lines.push(columns('TOTAL', 'Rp ' + rupiah(receipt.total), width));
  lines.push(columns('STATUS', receipt.payment_status === 'PAID' ? 'LUNAS' : 'BELUM BAYAR', width));
  lines.push(rule);
  wrap(receipt.footer, width).forEach(l => lines.push(center(l, width)));
  lines.push(center(jakartaTime(receipt.issued_at) + ' WIB', width));

  return lines.join('\n');
}
