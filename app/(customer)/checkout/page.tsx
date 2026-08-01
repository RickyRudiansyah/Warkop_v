'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { PaymentMethod, Table } from '@/types';
import { Trash2, ArrowLeft, AlertTriangle, Check, QrCode, Wallet, X, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import { toast } from 'sonner';

type PayState = 'idle' | 'creating' | 'waiting' | 'paid' | 'expired' | 'failed';

interface QrisData {
  intentId: string;
  link: string;
  grossAmount: number;
}

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
  const [payState, setPayState] = useState<PayState>('idle');
  const [qris, setQris] = useState<QrisData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('/api/tables')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { setTables(Array.isArray(data) ? data : []); setLoadingTables(false); })
      .catch(() => setLoadingTables(false));
  }, []);

  const orderItemsPayload = () => items.map(item => ({
    menu_item_id: item.menu_item.id,
    menu_item_name: item.menu_item.name,
    menu_item_price: item.menu_item.price,
    quantity: item.quantity,
    variations: item.selectedVariations,
    subtotal: item.subtotal,
    notes: item.notes || null,
  }));

  // ---- CASH: create the order immediately as UNPAID ----
  const submitCashOrder = async () => {
    setSubmitting(true);
    try {
      const selectedTable = tables.find(t => t.id === selectedTableId);
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTableId, payment_method: 'CASH', payment_status: 'UNPAID',
          total_amount: totalPrice, notes: '', items: orderItemsPayload(),
        }),
      });
      if (res.ok) {
        const order = await res.json();
        if (selectedTable) setTableNumber(selectedTable.table_number);
        clearCart();
        toast.success('Pesanan berhasil dibuat!');
        router.push('/order-success?orderId=' + order.id + '&tableId=' + selectedTableId);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal membuat pesanan');
        setSubmitting(false);
      }
    } catch { toast.error('Gagal membuat pesanan'); setSubmitting(false); }
  };

  // ---- QRIS via Mayar: create payment request, open pay page, poll until paid ----
  const startQris = async () => {
    setPayState('creating');
    setQris(null);
    setQrisOpen(true);
    try {
      const res = await fetch('/api/payments/mayar/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTableId, total_amount: totalPrice, notes: '', items: orderItemsPayload(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.link) {
        toast.error(data.error || 'Gagal memproses pembayaran QRIS');
        setPayState('idle');
        setQrisOpen(false);
        return;
      }
      setQris({ intentId: data.intentId, link: data.link, grossAmount: totalPrice });
      setPayState('waiting');
      // Open the Mayar QRIS page in a new tab (user gesture -> not popup-blocked).
      window.open(data.link, '_blank', 'noopener');
    } catch {
      toast.error('Gagal memproses pembayaran QRIS');
      setPayState('idle');
      setQrisOpen(false);
    }
  };

  // Poll payment status while waiting.
  useEffect(() => {
    if (payState !== 'waiting' || !qris) return;
    let active = true;
    const check = async () => {
      try {
        const res = await fetch('/api/payments/mayar/status?intentId=' + qris.intentId, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (data.status === 'PAID') {
          setPayState('paid');
          const selectedTable = tables.find(t => t.id === selectedTableId);
          if (selectedTable) setTableNumber(selectedTable.table_number);
          clearCart();
          toast.success('Pembayaran berhasil!');
          router.push('/order-success?orderId=' + data.orderId + '&tableId=' + selectedTableId);
        } else if (data.status === 'EXPIRED') {
          setPayState('expired');
        } else if (data.status === 'FAILED') {
          setPayState('failed');
        }
      } catch { /* keep polling */ }
    };
    const id = setInterval(check, 3000);
    check();
    return () => { active = false; clearInterval(id); };
  }, [payState, qris, selectedTableId, tables, router, clearCart, setTableNumber]);

  // 30-minute local countdown (matches the Mayar payment expiry).
  useEffect(() => {
    if (payState !== 'waiting') return;
    setSecondsLeft(30 * 60);
    const id = setInterval(() => {
      setSecondsLeft(s => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [payState]);

  const closeQris = () => {
    setQrisOpen(false);
    setPayState('idle');
    setQris(null);
  };

  const handleCheckout = () => {
    if (!selectedTableId) { toast.error('Silakan pilih nomor meja'); return; }
    if (!agreed) { toast.error('Silakan setujui ketentuan terlebih dahulu'); return; }
    if (paymentMethod === 'QRIS') startQris();
    else submitCashOrder();
  };

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface-2">
        <header className="sticky top-0 z-20 bg-primary text-[color:var(--color-on-primary)] px-4 py-3 flex items-center gap-3 shadow-sm">
          <Link href="/order"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-bold text-text">Rumipang</h1>
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

  if (items.length === 0 && !submitting && payState === 'idle') {
    return (
      <div className="min-h-screen bg-surface-2">
        <header className="sticky top-0 z-20 bg-primary text-[color:var(--color-on-primary)] px-4 py-3 flex items-center gap-3 shadow-sm">
          <Link href="/order"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-bold text-text">Rumipang</h1>
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
        <h1 className="text-lg font-bold text-text">Rumipang</h1>
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
              : 'Scan QRIS & bayar. Pesanan otomatis diproses setelah pembayaran terkonfirmasi.'}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-text">{formatCurrency(totalPrice)}</span>
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
              {agreed && <Check className="w-3.5 h-3.5 text-[color:var(--color-on-primary)]" />}
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
          loading={submitting || payState === 'creating'}
          disabled={!agreed || !selectedTableId || submitting || payState === 'creating'}
          onClick={handleCheckout}
        >
          {paymentMethod === 'QRIS' ? 'Bayar dengan QRIS' : 'Pesan Sekarang'}
        </Button>
      </div>

      {qrisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => payState !== 'creating' && closeQris()} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6" role="dialog" aria-modal="true" aria-labelledby="qris-title">
            <button onClick={closeQris} disabled={payState === 'creating'} className="absolute top-4 right-4 text-text-secondary disabled:opacity-40" aria-label="Tutup"><X className="w-5 h-5" /></button>
            <h3 id="qris-title" className="text-lg font-bold mb-1 text-center">Pembayaran QRIS</h3>

            {payState === 'creating' && (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="w-8 h-8 text-text animate-spin" />
                <p className="text-sm text-text-secondary">Membuat kode QRIS...</p>
              </div>
            )}

            {payState === 'waiting' && qris && (
              <>
                <div className="flex flex-col items-center gap-2 my-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"><QrCode className="w-7 h-7 text-text" /></div>
                  <p className="text-sm text-text-secondary text-center">Halaman pembayaran QRIS terbuka di tab baru. Scan & bayar di sana, lalu kembali ke halaman ini.</p>
                </div>
                <div className="card p-3 mb-4 text-center bg-surface-2">
                  <p className="text-sm text-text-secondary">Total Pembayaran</p>
                  <p className="text-2xl font-bold text-text">{formatCurrency(qris.grossAmount)}</p>
                </div>
                <a href={qris.link} target="_blank" rel="noopener noreferrer" className="block w-full mb-3">
                  <Button className="w-full"><QrCode className="w-4 h-4 mr-2" />Buka Halaman Pembayaran</Button>
                </a>
                <div className="flex items-center justify-center gap-2 text-sm text-text-secondary mb-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menunggu pembayaran...</span>
                </div>
                <p className="text-xs text-text-secondary text-center mb-4">Berlaku {mmss(secondsLeft)} • Pesanan otomatis diproses setelah dibayar.</p>
                <Button variant="ghost" className="w-full" onClick={closeQris}>Batal</Button>
              </>
            )}

            {payState === 'expired' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center"><AlertTriangle className="w-7 h-7 text-warning" /></div>
                <p className="font-semibold">Kode QRIS Kadaluarsa</p>
                <p className="text-sm text-text-secondary">Buat kode baru untuk melanjutkan pembayaran.</p>
                <Button className="w-full mt-2" onClick={startQris}>Buat Kode Baru</Button>
                <Button variant="ghost" className="w-full" onClick={closeQris}>Tutup</Button>
              </div>
            )}

            {payState === 'failed' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center"><X className="w-7 h-7 text-danger" /></div>
                <p className="font-semibold">Pembayaran Dibatalkan</p>
                <p className="text-sm text-text-secondary">Silakan coba lagi.</p>
                <Button className="w-full mt-2" onClick={startQris}>Coba Lagi</Button>
                <Button variant="ghost" className="w-full" onClick={closeQris}>Tutup</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
