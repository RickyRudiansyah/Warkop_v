'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { QRIS_ENABLED } from '@/lib/features';
import { PaymentMethod, Table } from '@/types';
import { Trash2, ArrowLeft, AlertTriangle, Check, QrCode, Wallet, X, Loader2, Armchair, ShoppingBag } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import { toast } from 'sonner';

type PayState = 'idle' | 'creating' | 'waiting' | 'paid' | 'expired' | 'failed';

/** Nilai penanda di `<select>`; '' sudah dipakai untuk "belum memilih". */
const TAKE_AWAY_OPTION = '__take_away__';

interface QrisData {
  intentId: string;
  /** Halaman pembayaran Snap milik Midtrans — QR-nya dirender di sana. */
  snapUrl: string | null;
  grossAmount: number;
}

export default function CheckoutPage() {
  const { items, removeItem, clearCart, totalPrice, tableId, tableNumber, setTable, takeAway, setTakeAway, tableDecided } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [qrisOpen, setQrisOpen] = useState(false);
  const [payState, setPayState] = useState<PayState>('idle');
  const [qris, setQris] = useState<QrisData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const router = useRouter();

  // Meja dipilih di header halaman menu dan disimpan di CartContext.
  const selectedTableId = tableId ?? '';

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

  // ---- CASH: order langsung dibuat sebagai UNPAID ----
  const submitCashOrder = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // `tableId`, bukan `selectedTableId`: yang terakhir jadi string kosong
          // saat take away, dan '' bukan UUID yang sah untuk kolom table_id.
          table_id: tableId, payment_method: 'CASH', payment_status: 'UNPAID',
          total_amount: totalPrice, notes: '', items: orderItemsPayload(),
        }),
      });
      if (res.ok) {
        const order = await res.json();
        clearCart();
        // Sengaja bukan "pembayaran berhasil" — order tunai baru lunas setelah
        // kasir memverifikasi uangnya diterima.
        toast.success('Pesanan dikirim ke dapur', { description: 'Silakan bayar di kasir' });
        router.push('/order-success?orderId=' + order.id + '&tableId=' + selectedTableId);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal membuat pesanan');
        setSubmitting(false);
      }
    } catch { toast.error('Gagal membuat pesanan'); setSubmitting(false); }
  };

  // ---- QRIS via Midtrans: charge, tampilkan QR, polling sampai settle ----
  const startQris = async () => {
    setPayState('creating');
    setQris(null);
    setQrisOpen(true);
    try {
      const res = await fetch('/api/payments/midtrans/charge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId, total_amount: totalPrice, notes: '', items: orderItemsPayload(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Gagal memproses pembayaran QRIS');
        setPayState('idle');
        setQrisOpen(false);
        return;
      }
      setQris({ intentId: data.intentId, snapUrl: data.snapUrl, grossAmount: data.grossAmount });
      setPayState('waiting');
    } catch {
      toast.error('Gagal memproses pembayaran QRIS');
      setPayState('idle');
      setQrisOpen(false);
    }
  };

  // Polling status selama menunggu pembayaran.
  useEffect(() => {
    if (payState !== 'waiting' || !qris) return;
    let active = true;
    const check = async () => {
      try {
        const res = await fetch('/api/payments/midtrans/status?intentId=' + qris.intentId, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (data.status === 'PAID') {
          setPayState('paid');
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
  }, [payState, qris, selectedTableId, router, clearCart]);

  // Hitung mundur lokal 15 menit untuk kode QRIS.
  useEffect(() => {
    if (payState !== 'waiting') return;
    setSecondsLeft(15 * 60);
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
    if (!tableDecided) { toast.error('Silakan pilih meja, atau pilih Take Away'); return; }
    if (!agreed) { toast.error('Silakan setujui ketentuan terlebih dahulu'); return; }
    // Radio QRIS-nya sudah dimatikan, tapi tab yang dibuka sebelum sakelar ini
    // berubah masih memegang UI lama — jangan sampai pelanggan terlempar ke
    // layar pembayaran yang endpointnya menolak.
    if (paymentMethod === 'QRIS' && !QRIS_ENABLED) {
      toast.error('Pembayaran QRIS belum tersedia. Pesanan dibayar tunai di kasir.');
      setPaymentMethod('CASH');
      return;
    }
    if (paymentMethod === 'QRIS') startQris();
    else submitCashOrder();
  };

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const header = (
    <header className="sticky top-0 z-20 bg-brown-900 text-on-dark shadow-sm">
      <div className="max-w-md mx-auto h-14 px-4 flex items-center gap-3">
        <Link href="/order" aria-label="Kembali ke menu"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-base font-semibold uppercase tracking-wide">Checkout</h1>
        <ThemeToggle className="ml-auto" />
      </div>
    </header>
  );

  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface-2">
        {header}
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
        {header}
        <div className="flex flex-col items-center justify-center p-12">
          <h2 className="text-xl font-bold mb-2">Keranjang Kosong</h2>
          <Link href="/order"><Button className="mt-3">Pilih Menu</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2">
      {header}
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <div className="card p-4">
          <h2 className="section-title text-base mb-3">Pesanan Anda</h2>
          {items.map((item, i) => (
            <div key={item.menu_item.id + '-' + i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-semibold uppercase text-[15px] leading-snug">{item.menu_item.name}</p>
                <p className="text-sm text-text-secondary">{item.quantity}x {formatCurrency(item.menu_item.price)}</p>
                {item.selectedVariations.length > 0 && <p className="text-xs text-text-secondary">{item.selectedVariations.map(v => v.label).join(', ')}</p>}
                {item.notes && <p className="text-xs text-text-secondary">Catatan: {item.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
                <button onClick={() => removeItem(i)} className="p-1 text-danger" aria-label="Hapus"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-4">
          <h2 className="section-title text-base mb-3">Meja / Take Away</h2>
          {loadingTables ? (
            <Skeleton variant="rectangular" height="44px" />
          ) : (
            <>
              <select
                value={takeAway ? TAKE_AWAY_OPTION : selectedTableId}
                onChange={e => {
                  if (e.target.value === TAKE_AWAY_OPTION) { setTakeAway(true); return; }
                  const t = tables.find(x => x.id === e.target.value);
                  setTable(t?.id ?? null, t?.table_number ?? null);
                }}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface text-text outline-none focus:border-ember-ink"
                aria-label="Pilih meja atau take away"
              >
                <option value="">— Pilih meja —</option>
                <option value={TAKE_AWAY_OPTION}>Take Away · Dibungkus</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.label || 'Meja ' + t.table_number}</option>
                ))}
              </select>
              {takeAway ? (
                <p className="flex items-center gap-1.5 text-sm text-text-secondary mt-2">
                  <ShoppingBag className="w-4 h-4 text-ember-ink" />
                  Pesanan <strong className="text-text">dibungkus</strong> untuk dibawa pulang
                </p>
              ) : selectedTableId ? (
                <p className="flex items-center gap-1.5 text-sm text-text-secondary mt-2">
                  <Armchair className="w-4 h-4 text-ember-ink" />
                  Diantar ke <strong className="text-text">Meja {tableNumber}</strong>
                </p>
              ) : (
                <p className="text-sm text-warning mt-2">
                  {tables.length === 0
                    ? 'Belum ada meja terdaftar — pilih Take Away, atau hubungi staff.'
                    : 'Pilih meja atau Take Away sebelum bisa memesan.'}
                </p>
              )}
            </>
          )}
        </div>

        <div className="card p-4">
          <h2 className="section-title text-base mb-3">Metode Pembayaran</h2>
          <div className="space-y-2">
            {(['CASH', 'QRIS'] as PaymentMethod[]).map(method => {
              // QRIS ditampilkan tapi dimatikan, bukan disembunyikan: pelanggan
              // yang mencarinya jadi tahu ini belum tersedia — bukan mengira
              // warungnya tidak menerima QRIS sama sekali, lalu bertanya ke kasir.
              const disabled = method === 'QRIS' && !QRIS_ENABLED;
              return (
                <label
                  key={method}
                  className={'flex items-center gap-3 p-3 border rounded-lg transition-colors ' +
                    (disabled
                      ? 'border-border bg-surface-3/60 cursor-not-allowed opacity-70'
                      : paymentMethod === method
                        ? 'border-ember-ink bg-ember-soft cursor-pointer'
                        : 'border-border hover:bg-surface-3 cursor-pointer')}
                >
                  <input
                    type="radio" name="payment" checked={paymentMethod === method}
                    disabled={disabled}
                    onChange={() => setPaymentMethod(method)}
                    className="accent-[color:var(--color-ember-600)] disabled:cursor-not-allowed"
                  />
                  {method === 'CASH'
                    ? <Wallet className="w-5 h-5 text-text-secondary" />
                    : <QrCode className="w-5 h-5 text-text-secondary" />}
                  <span className={'flex-1 ' + (disabled ? 'text-text-secondary' : '')}>
                    {method === 'CASH' ? 'Cash (Bayar di Kasir)' : 'QRIS (Bayar Sekarang)'}
                  </span>
                  {disabled && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-surface border border-border text-text-secondary">
                      Belum tersedia
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-text-secondary mt-2">
            {paymentMethod === 'CASH'
              ? 'Pesanan langsung masuk dapur. Bayar di kasir — pembayaran baru dianggap lunas setelah kasir memverifikasi, lalu struk dicetak.'
              : 'Scan QRIS & bayar. Pesanan otomatis diproses dan struk langsung dicetak setelah pembayaran terkonfirmasi.'}
          </p>
          {!QRIS_ENABLED && (
            <p className="text-xs text-text-secondary mt-1">
              Pembayaran QRIS sedang disiapkan dan belum bisa dipakai. Untuk
              sekarang, pesanan dibayar tunai di kasir.
            </p>
          )}
        </div>

        <div className="card p-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-ember-ink">{formatCurrency(totalPrice)}</span>
          </div>
        </div>

        <div className="card p-4 bg-gold-soft border-gold-500/40">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-1.5 rounded-full bg-warning/10 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="font-semibold text-sm text-text">Perhatian</p>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Setelah pesanan dikirim ke kasir, <strong>pesanan tidak dapat dibatalkan</strong> secara langsung oleh Anda.
              </p>
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ' + (agreed ? 'bg-ember-600 border-ember-ink' : 'border-text-secondary/40 group-hover:border-ember-ink')}>
              {agreed && <Check className="w-3.5 h-3.5 text-cream-50" />}
            </div>
            <span className="text-sm text-text/80">
              Saya setuju, pesanan saya akan segera diproses dan <strong>tidak dapat dibatalkan setelah checkout</strong>.
            </span>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="sr-only" aria-label="Setuju" />
          </label>
        </div>

        <Button
          size="lg"
          className="w-full h-[52px] uppercase tracking-wide"
          loading={submitting || payState === 'creating'}
          disabled={!agreed || !tableDecided || submitting || payState === 'creating'}
          onClick={handleCheckout}
        >
          {paymentMethod === 'QRIS' ? 'Bayar dengan QRIS' : 'Kirim Pesanan'}
        </Button>
      </div>

      {qrisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brown-950/55" onClick={() => payState !== 'creating' && closeQris()} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6" role="dialog" aria-modal="true" aria-labelledby="qris-title">
            <button onClick={closeQris} disabled={payState === 'creating'} className="absolute top-4 right-4 text-text-secondary disabled:opacity-40" aria-label="Tutup"><X className="w-5 h-5" /></button>
            <h3 id="qris-title" className="text-lg font-bold uppercase mb-1 text-center text-text">Pembayaran QRIS</h3>

            {payState === 'creating' && (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="w-8 h-8 text-ember-ink animate-spin" />
                <p className="text-sm text-[color:var(--color-text-secondary)]">Membuat kode QRIS...</p>
              </div>
            )}

            {payState === 'waiting' && qris && (
              <>
                {/* QR-nya ditampilkan di halaman Midtrans, bukan di sini: akun
                    ini hanya punya akses Snap, bukan Core API yang mengembalikan
                    qr_string mentah (lihat lib/midtrans.ts). Halamannya dibuka
                    di tab baru supaya polling di tab ini tetap hidup — begitu
                    pembayaran masuk, tab ini sendiri yang pindah ke order-success. */}
                <p className="text-sm text-[color:var(--color-text-secondary)] text-center mb-4">
                  Buka halaman pembayaran, lalu scan QRIS-nya dengan e-wallet /
                  m-banking apa pun. Jangan tutup halaman ini.
                </p>
                <div className="flex justify-center mb-4">
                  {qris.snapUrl ? (
                    <a
                      href={qris.snapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-[52px] rounded-[10px] bg-ember-600 text-cream-50 font-bold text-base uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-ember-500 active:scale-[0.98] transition"
                    >
                      <QrCode className="w-5 h-5" />
                      Buka Halaman QRIS
                    </a>
                  ) : (
                    <div className="w-full flex items-center justify-center border-2 border-dashed border-border rounded-xl text-center p-6">
                      <p className="text-sm text-[color:var(--color-text-secondary)]">Halaman pembayaran tidak tersedia</p>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-border p-3 mb-4 text-center bg-surface-3">
                  <p className="text-sm text-[color:var(--color-text-secondary)]">Total Pembayaran</p>
                  <p className="text-2xl font-bold text-ember-ink">{formatCurrency(qris.grossAmount)}</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-[color:var(--color-text-secondary)] mb-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menunggu pembayaran...</span>
                </div>
                <p className="text-xs text-[color:var(--color-text-secondary)] text-center mb-4">
                  Berlaku {mmss(secondsLeft)} • Struk otomatis dicetak setelah dibayar.
                </p>
                <Button variant="ghost" className="w-full" onClick={closeQris}>Batal</Button>
              </>
            )}

            {payState === 'expired' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center"><AlertTriangle className="w-7 h-7 text-warning" /></div>
                <p className="font-semibold text-text">Kode QRIS Kadaluarsa</p>
                <p className="text-sm text-[color:var(--color-text-secondary)]">Buat kode baru untuk melanjutkan pembayaran.</p>
                <Button className="w-full mt-2" onClick={startQris}>Buat Kode Baru</Button>
                <Button variant="ghost" className="w-full" onClick={closeQris}>Tutup</Button>
              </div>
            )}

            {payState === 'failed' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center"><X className="w-7 h-7 text-danger" /></div>
                <p className="font-semibold text-text">Pembayaran Dibatalkan</p>
                <p className="text-sm text-[color:var(--color-text-secondary)]">Silakan coba lagi.</p>
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
