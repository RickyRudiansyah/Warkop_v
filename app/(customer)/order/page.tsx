'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMenu } from '@/hooks/useMenu';
import { useCart } from '@/context/CartContext';
import { MenuItem, MenuVariation, VariationSelection, PaymentMethod } from '@/types';
import { MenuItemCard } from '@/components/menu/MenuItemCard';
import { MenuItemSheet } from '@/components/menu/MenuItemSheet';
import { CategoryPills } from '@/components/menu/CategoryPills';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Search, ShoppingCart, X, Plus, Minus, Trash2, AlertTriangle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function OrderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tableFromUrl = searchParams.get('table');
  const { menuItems, categories, loading } = useMenu();
  const { items, tableNumber, setTableNumber, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [variations, setVariations] = useState<MenuVariation[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Checkout state
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [pendingSessionData, setPendingSessionData] = useState<{ id: string; table_number: number } | null>(null);

  // Step: table input
  const [step, setStep] = useState<'table' | 'menu'>('menu');
  const [tableInput, setTableInput] = useState('');

  useEffect(() => {
    if (tableFromUrl) {
      const num = parseInt(tableFromUrl);
      if (!isNaN(num)) setTableNumber(num);
    } else if (!tableNumber) {
      setStep('table');
    }
  }, [tableFromUrl, tableNumber, setTableNumber]);

  useEffect(() => {
    if (!selectedItem) return;
    const fetchVariations = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('menu_variations').select('*').eq('menu_item_id', selectedItem.id);
      setVariations((data as MenuVariation[]) || []);
    };
    fetchVariations();
  }, [selectedItem]);

  useEffect(() => {
    if (tableNumber && step === 'menu') {
      checkTableSession();
    }
  }, [tableNumber, step]);

  const checkTableSession = async () => {
    if (!tableNumber) return;
    try {
      const res = await fetch('/api/table-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: tableNumber, action: 'join' }),
      });
      if (res.ok) {
        const session = await res.json();
        setPendingSessionData(session);
        setShowSessionModal(true);
      }
    } catch {
      // Ignore
    }
  };

  const handleStartOrder = () => {
    const num = parseInt(tableInput);
    if (isNaN(num) || num < 1) {
      toast.error('Masukkan nomor meja yang valid');
      return;
    }
    setTableNumber(num);
    setStep('menu');
  };

  const handleJoinSession = () => {
    if (pendingSessionData) {
      setSessionId(pendingSessionData.id);
    }
    setShowSessionModal(false);
  };

  const handleNewSession = () => {
    setSessionId(null);
    setShowSessionModal(false);
  };

  const filteredItems = menuItems.filter(item => {
    const matchCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleAddToCart = (item: MenuItem, quantity: number, selectedVariations: VariationSelection[], notes: string) => {
    addItem(item, quantity, selectedVariations, notes);
    toast.success('Ditambahkan ke keranjang', { description: item.name });
  };

  const openCart = () => {
    setCheckoutStep('cart');
    setAgreed(false);
    setPaymentMethod('CASH');
    setCartOpen(true);
  };

  const handleSubmitOrder = async () => {
    if (!tableNumber) { toast.error('Nomor meja tidak ditemukan'); return; }
    if (!agreed) { toast.error('Silakan setujui ketentuan terlebih dahulu'); return; }
    setSubmitting(true);
    try {
      const supabase = createClient();
      let tableId: string | null = null;

      const { data: tableData } = await supabase
        .from('tables')
        .select('id')
        .eq('table_number', tableNumber)
        .single();
      if (tableData) tableId = tableData.id;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId,
          session_id: sessionId,
          payment_method: paymentMethod,
          total_amount: totalPrice,
          notes: '',
          items: items.map(item => ({
            menu_item_id: item.menu_item.id,
            menu_item_name: item.menu_item.name,
            menu_item_price: item.menu_item.price,
            quantity: item.quantity,
            variations: item.selectedVariations,
            subtotal: item.subtotal,
            notes: item.notes || null,
          })),
        }),
      });

      if (res.ok) {
        const order = await res.json();

        // For digital payment, redirect to midtrans
        if (order.redirect_url) {
          clearCart();
          window.location.href = order.redirect_url;
          return;
        }

        clearCart();
        setCartOpen(false);
        toast.success('Pesanan berhasil! Silakan bayar ke kasir.');
        router.push('/order-success?orderId=' + order.id);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal membuat pesanan');
      }
    } catch {
      toast.error('Gagal membuat pesanan');
    }
    setSubmitting(false);
  };

  // Table input step
  if (step === 'table') {
    return (
      <div className="min-h-screen bg-surface-2 flex items-center justify-center p-4">
        <div className="card p-6 w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Warkop QR</h1>
          <p className="text-text-secondary mb-6">Masukkan nomor meja Anda</p>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Nomor Meja"
            value={tableInput}
            onChange={e => setTableInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStartOrder()}
            className="w-full text-center text-3xl font-bold p-4 border-2 border-primary/30 rounded-xl mb-4 focus:border-primary focus:outline-none"
            aria-label="Nomor meja"
            autoFocus
          />
          <Button size="lg" className="w-full" onClick={handleStartOrder}>
            Mulai Pesan
          </Button>
        </div>
      </div>
    );
  }

  // Menu step
  return (
    <div className="min-h-screen bg-surface-2 pb-24">
      <header className="glass sticky top-0 z-10 border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-primary">Warkop QR</h1>
            {tableNumber && <p className="text-sm text-text-secondary">Meja {tableNumber}</p>}
          </div>
          <ThemeToggle />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input type="text" placeholder="Cari menu..." aria-label="Cari menu" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg bg-surface" />
        </div>
      </header>

      <div className="px-4 py-3">
        <CategoryPills categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      </div>

      {loading ? (
        <div className="px-4 grid grid-cols-2 gap-3" aria-live="polite">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border overflow-hidden">
              <Skeleton variant="rectangular" height="160px" />
              <div className="p-4 space-y-2">
                <Skeleton width="80%" />
                <Skeleton width="60%" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton width="40%" />
                  <Skeleton width="20%" height="32px" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div className="px-4 grid grid-cols-2 gap-3" aria-live="polite" variants={container} initial="hidden" animate="show" key={selectedCategory + '-' + searchQuery}>
          {filteredItems.map(item => (
            <motion.div key={item.id} variants={itemAnim}>
              <MenuItemCard item={item} onAddToCart={() => setSelectedItem(item)} />
            </motion.div>
          ))}
        </motion.div>
      )}
      {!loading && filteredItems.length === 0 && <EmptyState title="Menu tidak ditemukan" description="Coba kata kunci lain" />}

      <MenuItemSheet item={selectedItem} variations={variations} onClose={() => setSelectedItem(null)} onAdd={handleAddToCart} />

      {/* Cart FAB */}
      <AnimatePresence>
        {totalItems > 0 && !cartOpen && (
          <motion.button
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            onClick={openCart}
            aria-label={`${totalItems} item di keranjang, total ${formatCurrency(totalPrice)}`}
            className="fixed bottom-6 left-0 right-0 mx-auto max-w-md z-40 bg-primary text-white rounded-2xl shadow-lg p-4 flex items-center justify-between animate-fab-pulse active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg"><ShoppingCart className="w-5 h-5" /></div>
              <span className="font-semibold">{totalItems} item</span>
            </div>
            <span className="font-bold text-lg">{formatCurrency(totalPrice)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart + Checkout Drawer */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCartOpen(false)} aria-hidden="true" />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-2xl max-h-[90vh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              role="dialog" aria-modal="true"
            >
              <div className="sticky top-0 bg-surface border-b px-4 py-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">{checkoutStep === 'cart' ? 'Keranjang' : 'Pembayaran'}</h2>
                <button onClick={() => { setCartOpen(false); setCheckoutStep('cart'); }} className="p-1" aria-label="Tutup"><X className="w-5 h-5" /></button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12 text-text-secondary"><p>Keranjang kosong</p></div>
              ) : checkoutStep === 'cart' ? (
                <div className="p-4 space-y-4">
                  {items.map((item, i) => (
                    <div key={item.menu_item.id + '-' + i} className="flex items-start justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{item.menu_item.name}</p>
                        <p className="text-sm text-text-secondary">{formatCurrency(item.menu_item.price)}</p>
                        {item.selectedVariations.length > 0 && <p className="text-xs text-text-secondary mt-1">{item.selectedVariations.map(v => v.label).join(', ')}</p>}
                        {item.notes && <p className="text-xs text-text-secondary mt-1">Catatan: {item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button onClick={() => item.quantity > 1 ? updateQuantity(i, item.quantity - 1) : removeItem(i)} className="p-1 border rounded-full" aria-label="Kurangi"><Minus className="w-3 h-3" /></button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(i, item.quantity + 1)} className="p-1 border rounded-full" aria-label="Tambah"><Plus className="w-3 h-3" /></button>
                        <button onClick={() => removeItem(i)} className="p-1 text-danger ml-1" aria-label="Hapus item"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold mb-3"><span>Total</span><span className="text-primary">{formatCurrency(totalPrice)}</span></div>
                    <Button size="lg" className="w-full" onClick={() => setCheckoutStep('payment')}>Lanjutkan ke Pembayaran</Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Order Summary */}
                  <div className="card p-4">
                    <h3 className="font-semibold mb-2 text-sm text-text-secondary">PESANAN ANDA</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <div>
                            <span>{item.menu_item.name}</span>
                            <span className="text-text-secondary ml-1">x{item.quantity}</span>
                            {item.selectedVariations.length > 0 && <p className="text-xs text-text-secondary">{item.selectedVariations.map(v => v.label).join(', ')}</p>}
                          </div>
                          <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-3 pt-3 border-t">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrency(totalPrice)}</span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="card p-4">
                    <h3 className="font-semibold mb-3">Metode Pembayaran</h3>
                    <div className="space-y-2">
                      {(['CASH', 'QRIS', 'TRANSFER_BCA'] as PaymentMethod[]).map(method => (
                        <label key={method} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-surface-3">
                          <input type="radio" name="payment" checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
                          <span>{method === 'CASH' ? 'Cash (Tunai)' : method === 'QRIS' ? 'QRIS' : 'Transfer BCA'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="card p-4 bg-warning/5 border-warning/20">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-1.5 rounded-full bg-warning/10 shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Perhatian</p>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          Setelah pesanan dikirim, <strong>pesanan tidak dapat dibatalkan</strong> secara langsung. Silakan hubungi staff untuk perubahan.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${agreed ? 'bg-primary border-primary' : 'border-text-secondary/40 group-hover:border-primary'}`}>
                        {agreed && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                        Saya setuju, pesanan saya akan segera diproses dan <strong>tidak dapat dibatalkan setelah checkout</strong>.
                      </span>
                      <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="sr-only" />
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={() => setCheckoutStep('cart')}>Kembali</Button>
                    <Button size="lg" className="flex-1" loading={submitting} disabled={!agreed} onClick={handleSubmitOrder}>
                      {paymentMethod === 'CASH' ? 'Pesan & Bayar ke Kasir' : 'Bayar Sekarang'}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Table Session Modal */}
      <AnimatePresence>
        {showSessionModal && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleNewSession} />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-[60] bg-surface rounded-t-2xl p-6"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              role="dialog" aria-modal="true"
            >
              <h2 className="text-lg font-bold mb-2">Meja {tableNumber}</h2>
              <p className="text-text-secondary mb-6">Ada pesanan aktif di meja ini. Mau gabung atau pesan sendiri?</p>
              <div className="space-y-3">
                <Button size="lg" className="w-full" variant="primary" onClick={handleJoinSession}>
                  Gabung ke Pesanan Meja
                </Button>
                <Button size="lg" className="w-full" variant="ghost" onClick={handleNewSession}>
                  Pesan Sendiri
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
