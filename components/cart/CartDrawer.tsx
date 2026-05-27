'use client';

import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface CartDrawerProps { open: boolean; onClose: () => void; }

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();
  const router = useRouter();

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
          <motion.div className="fixed inset-0 z-50 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-2xl max-h-[85vh] overflow-y-auto"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
            role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title"
          >
            <div className="sticky top-0 bg-surface border-b px-4 py-3 flex items-center justify-between">
              <h2 id="cart-drawer-title" className="text-lg font-bold">Keranjang</h2>
              <button onClick={onClose} className="p-1" aria-label="Tutup keranjang"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-8 text-text-secondary"><p>Keranjang kosong</p></div>
              ) : (
                <>
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
                    <Button size="lg" className="w-full" onClick={handleCheckout}>Checkout</Button>
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
