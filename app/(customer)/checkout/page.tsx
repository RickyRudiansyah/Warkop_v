'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { PaymentMethod } from '@/types';
import { Trash2, ArrowLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const { items, tableNumber, removeItem, clearCart, totalPrice } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [tableId, setTableId] = useState<string | null>(null);
  const [loadingTable, setLoadingTable] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!tableNumber) { setLoadingTable(false); return; }
    const fetchTable = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('tables').select('id').eq('table_number', tableNumber).single();
      if (!error && data) setTableId(data.id);
      setLoadingTable(false);
    };
    fetchTable();
  }, [tableNumber]);

  const handleSubmit = async () => {
    if (!tableNumber) { toast.error('Nomor meja tidak ditemukan'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId, payment_method: paymentMethod, total_amount: totalPrice, notes: '',
          items: items.map(item => ({
            menu_item_id: item.menu_item.id, menu_item_name: item.menu_item.name,
            menu_item_price: item.menu_item.price, quantity: item.quantity,
            variations: item.selectedVariations, subtotal: item.subtotal, notes: item.notes || null,
          })),
        }),
      });
      if (res.ok) {
        const order = await res.json();
        clearCart();
        toast.success('Pesanan berhasil dibuat!');
        router.push('/order-success?orderId=' + order.id);
      } else toast.error('Gagal membuat pesanan');
    } catch { toast.error('Gagal membuat pesanan'); }
    setSubmitting(false);
  };

  if (items.length === 0 && !submitting) {
    return (
      <div className="min-h-screen bg-surface-2">
        <header className="glass sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3">
          <Link href="/order"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-bold text-primary">Warkop QR</h1>
          {tableNumber && <p className="text-sm text-text-secondary ml-auto">Meja {tableNumber}</p>}
        </header>
        <div className="flex flex-col items-center justify-center p-12">
          <h2 className="text-xl font-bold mb-2">Keranjang Kosong</h2>
          <Link href="/order"><Button className="mt-3">Pilih Menu</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="glass sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3">
        <Link href="/order"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold text-primary">Warkop QR</h1>
        {tableNumber && <p className="text-sm text-text-secondary ml-auto">Meja {tableNumber}</p>}
      </header>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        {loadingTable ? (
          <div className="card p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} variant="rectangular" height="48px" />))}
          </div>
        ) : (
          <>
            <div className="card p-4">
              <h2 className="font-semibold mb-3">Pesanan Anda</h2>
              {items.map((item, i) => (
                <div key={item.menu_item.id + '-' + i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.menu_item.name}</p>
                    <p className="text-sm text-text-secondary">{item.quantity}x {formatCurrency(item.menu_item.price)}</p>
                    {item.selectedVariations.length > 0 && <p className="text-xs text-text-secondary">{item.selectedVariations.map(v => v.label).join(', ')}</p>}
                    {item.notes && <p className="text-xs text-text-secondary">Catatan: {item.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                    <button onClick={() => removeItem(i)} className="p-1 text-danger" aria-label="Hapus"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="card p-4">
              <h2 className="font-semibold mb-3">Metode Pembayaran</h2>
              <div className="space-y-2">
                {(['CASH', 'QRIS', 'TRANSFER_BCA'] as PaymentMethod[]).map(method => (
                  <label key={method} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-surface-3">
                    <input type="radio" name="payment" checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
                    <span>{method === 'CASH' ? 'Cash (Tunai)' : method === 'QRIS' ? 'QRIS' : 'Transfer BCA'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="card p-4"><div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{formatCurrency(totalPrice)}</span></div></div>
            <Button size="lg" className="w-full" loading={submitting} onClick={handleSubmit}>Pesan Sekarang</Button>
          </>
        )}
      </div>
    </div>
  );
}
