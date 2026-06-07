'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { PaymentMethod, Table } from '@/types';
import { Trash2, ArrowLeft, AlertTriangle, Check, QrCode, Wallet, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const { items, removeItem, clearCart, totalPrice, setTableNumber } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [loadingTables, setLoadingTables] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [qrisOpen, setQrisOpen] = useState(false);
  const [qrisImgError, setQrisImgError] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('/api/tables')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { setTables(Array.isArray(data) ? data : []); setLoadingTables(false); })
      .catch(() => setLoadingTables(false));
  }, []);

  const submitOrder = async (payment_status: 'PAID' | 'UNPAID') => {
    if (!selectedTableId) { toast.error('Silakan pilih nomor meja'); return; }
    if (!agreed) { toast.error('Silakan setujui ketentuan terlebih dahulu'); return; }
    setSubmitting(true);
    try {
      const selectedTable = tables.find(t => t.id === selectedTableId);
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTableId, payment_method: paymentMethod, payment_status,
          total_amount: totalPrice, notes: '',
          items: items.map(item => ({
            menu_item_id: item.menu_item.id, menu_item_name: item.menu_item.name,
            menu_item_price: item.menu_item.price, quantity: item.quantity,
            variations: item.selectedVariations, subtotal: item.subtotal, notes: item.notes || null,
          })),
        }),
      });
      if (res.ok) {
        const order = await res.json();
        if (selectedTable) setTableNumber(selectedTable.table_number);
        clearCart();
        setQrisOpen(false);
        toast.success('Pesanan berhasil dibuat!');
        router.push('/order-success?orderId=' + order.id + (selectedTableId ? '&tableId=' + selectedTableId : ''));
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal membuat pesanan');
        setSubmitting(false);
      }
    } catch { toast.error('Gagal membuat pesanan'); setSubmitting(false); }
  };

  const handleCheckout = () => {
    if (!selectedTableId) { toast.error('Silakan pilih nomor meja'); return; }
    if (!agreed) { toast.error('Silakan setujui ketentuan terlebih dahulu'); return; }
    if (paymentMethod === 'QRIS') {
      setQrisOpen(true);
    } else {
      submitOrder('UNPAID');
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface-2">
        <header className="glass sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3">
          <Link href="/order"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-bold text-primary">Warkop QR</h1>
          <ThemeToggle className="ml-auto" />
        </header>
        <div className="p-4 space-y-4 max-w-md mx-auto">
          <div className="card p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} variant="rectangular" height="48px" />))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !submitting) {
    return (
      <div className="min-h-screen bg-surface-2">
        <header className="glass sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3">
          <Link href="/order"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-bold text-primary">Warkop QR</h1>
          <ThemeToggle className="ml-auto" />
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
        <ThemeToggle className="ml-auto" />
      </header>
      <div className="p-4 space-y-4 max-w-md mx-auto">
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
          <h2 className="font-semibold mb-3">Nomor Meja</h2>
          {loadingTables ? (
            <Skeleton variant="rectangular" height="44px" />
          ) : tables.length === 0 ? (
            <p className="text-sm text-text-secondary">Belum ada meja tersedia. Hubungi staff.</p>
          ) : (
            <select
              value={selectedTableId}
              onChange={e => setSelectedTableId(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg bg-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              aria-label="Pilih nomor meja"
            >
              <option value="">— Pilih meja —</option>
              {tables.map(t => (
                <option key={t.id} value={t.id}>{t.label || 'Meja ' + t.table_number}</option>
              ))}
            </select>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-3">Metode Pembayaran</h2>
          <div className="space-y-2">
            {(['CASH', 'QRIS'] as PaymentMethod[]).map(method => (
              <label key={method} className={'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ' + (paymentMethod === method ? 'border-primary bg-primary/5' : 'hover:bg-surface-3')}>
                <input type="radio" name="payment" checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
                {method === 'CASH' ? <Wallet className="w-5 h-5 text-text-secondary" /> : <QrCode className="w-5 h-5 text-text-secondary" />}
                <span className="flex-1">{method === 'CASH' ? 'Cash (Bayar di Kasir)' : 'QRIS (Bayar Sekarang)'}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-2">
            {paymentMethod === 'CASH'
              ? 'Pesanan langsung diproses. Bayar di kasir.'
              : 'Scan QRIS & bayar dulu, lalu konfirmasi. Pesanan diproses setelah pembayaran.'}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(totalPrice)}</span>
          </div>
        </div>

        <div className="card p-4 bg-warning/5 border-warning/20">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-1.5 rounded-full bg-warning/10 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="font-semibold text-sm">Perhatian</p>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Setelah pesanan dikirim ke kasir, <strong>pesanan tidak dapat dibatalkan</strong> secara langsung oleh Anda.
              </p>
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ' + (agreed ? 'bg-primary border-primary' : 'border-text-secondary/40 group-hover:border-primary')}>
              {agreed && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
              Saya setuju, pesanan saya akan segera diproses dan <strong>tidak dapat dibatalkan setelah checkout</strong>.
            </span>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="sr-only" aria-label="Setuju" />
          </label>
        </div>

        <Button
          size="lg"
          className="w-full"
          loading={submitting}
          disabled={!agreed || !selectedTableId || submitting}
          onClick={handleCheckout}
        >
          {paymentMethod === 'QRIS' ? 'Bayar dengan QRIS' : 'Pesan Sekarang'}
        </Button>
      </div>

      {qrisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && setQrisOpen(false)} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6" role="dialog" aria-modal="true" aria-labelledby="qris-title">
            <button onClick={() => !submitting && setQrisOpen(false)} className="absolute top-4 right-4 text-text-secondary" aria-label="Tutup"><X className="w-5 h-5" /></button>
            <h3 id="qris-title" className="text-lg font-bold mb-1 text-center">Pembayaran QRIS</h3>
            <p className="text-sm text-text-secondary text-center mb-4">Scan kode di bawah, lalu tekan tombol setelah membayar.</p>
            <div className="flex justify-center mb-4">
              {qrisImgError ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center border-2 border-dashed rounded-xl text-center p-4">
                  <QrCode className="w-12 h-12 text-text-secondary mb-2" />
                  <p className="text-sm font-medium">QRIS (placeholder)</p>
                  <p className="text-xs text-text-secondary mt-1">Letakkan gambar QRIS di <code>/public/qris.png</code></p>
                </div>
              ) : (
                <img
                  src="/qris.png"
                  alt="Kode QRIS"
                  className="w-56 h-56 object-contain bg-white rounded-xl p-2"
                  onError={() => setQrisImgError(true)}
                />
              )}
            </div>
            <div className="card p-3 mb-4 text-center bg-surface-2">
              <p className="text-sm text-text-secondary">Total Pembayaran</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalPrice)}</p>
            </div>
            <Button size="lg" className="w-full" loading={submitting} onClick={() => submitOrder('PAID')}>
              <Check className="w-4 h-4 mr-2" />Saya Sudah Bayar
            </Button>
            <Button variant="ghost" className="w-full mt-2" disabled={submitting} onClick={() => setQrisOpen(false)}>Batal</Button>
          </div>
        </div>
      )}
    </div>
  );
}
