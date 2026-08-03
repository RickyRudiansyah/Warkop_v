'use client';

import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, Armchair, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface CartDrawerProps { open: boolean; onClose: () => void; }

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalPrice, tableNumber } = useCart();
  const router = useRouter();
  // Meja wajib dipilih dulu lewat table pill di header sebelum bisa checkout.
  const tableChosen = tableNumber !== null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleCheckout = () => { onClose(); router.push('/checkout'); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-brown-950/55"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} aria-hidden="true"
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-2xl max-h-[85vh] overflow-y-auto"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
            role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title"
          >
            <div className="sticky top-0 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
              <h2 id="cart-drawer-title" className="text-base font-semibold uppercase tracking-wide text-text">Keranjang</h2>
              <button onClick={onClose} className="p-1 text-text-secondary" aria-label="Tutup keranjang"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-8 text-[color:var(--color-text-secondary)]"><p>Keranjang kosong</p></div>
              ) : (
                <>
                  {items.map((item, i) => (
                    <div key={item.menu_item.id + '-' + i} className="flex items-start justify-between py-3 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="font-semibold text-[15px] uppercase text-text leading-snug">{item.menu_item.name}</p>
                        <p className="text-sm font-medium text-ember-ink mt-0.5">{formatCurrency(item.menu_item.price)}</p>
                        {item.selectedVariations.length > 0 && (
                          <p className="text-xs text-[color:var(--color-text-secondary)] mt-1">
                            {item.selectedVariations.map(v => v.label).join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-[color:var(--color-text-secondary)] mt-1">Catatan: {item.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => item.quantity > 1 ? updateQuantity(i, item.quantity - 1) : removeItem(i)}
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-text active:scale-95 transition"
                          aria-label="Kurangi"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums text-text">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(i, item.quantity + 1)}
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-text active:scale-95 transition"
                          aria-label="Tambah"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeItem(i)} className="p-1 text-danger ml-0.5" aria-label="Hapus item">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between text-lg font-bold mb-3 text-text">
                      <span>Total</span>
                      <span>{formatCurrency(totalPrice)}</span>
                    </div>

                    {tableChosen ? (
                      <p className="flex items-center gap-1.5 text-sm text-[color:var(--color-text-secondary)] mb-3">
                        <Armchair className="w-4 h-4 text-ember-ink" />
                        Diantar ke <strong className="text-text">Meja {tableNumber}</strong>
                      </p>
                    ) : (
                      <div className="flex items-start gap-2 rounded-lg bg-gold-soft text-text px-3 py-2.5 mb-3">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
                        <p className="text-sm leading-relaxed">
                          Pilih nomor meja dulu lewat tombol <strong>Pilih Meja</strong> di bagian atas layar.
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleCheckout}
                      disabled={!tableChosen}
                      className="w-full h-[52px] rounded-[10px] bg-ember-600 text-cream-50 font-bold text-base uppercase tracking-wide hover:bg-ember-500 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      Checkout
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
