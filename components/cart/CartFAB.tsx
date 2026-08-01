'use client';

import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface CartFABProps { onClick: () => void; }

// Sticky dark bottom bar (design §5.7): cart total on the left, yellow ORDER button on the right.
export function CartFAB({ onClick }: CartFABProps) {
  const { totalItems, totalPrice } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 22 }}
          className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2 pointer-events-none"
        >
          <div className="mx-auto max-w-md bar-dark rounded-2xl shadow-xl flex items-center justify-between gap-3 p-2.5 pointer-events-auto">
            <button
              onClick={onClick}
              aria-label={'Lihat keranjang, ' + totalItems + ' item'}
              className="flex items-center gap-3 pl-2 pr-1 py-1 min-w-0 active:scale-[0.98] transition"
            >
              <div className="relative">
                <div className="bg-white/10 p-2 rounded-xl"><ShoppingCart className="w-5 h-5" /></div>
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-primary text-[color:var(--color-on-primary)] text-xs font-bold flex items-center justify-center">{totalItems}</span>
              </div>
              <div className="text-left min-w-0">
                <p className="text-[11px] text-white/60 leading-none">Order Total</p>
                <p className="font-bold text-[15px] leading-tight mt-0.5 truncate">{formatCurrency(totalPrice)}</p>
              </div>
            </button>
            <button
              onClick={onClick}
              className="shrink-0 bg-primary text-[color:var(--color-on-primary)] font-bold rounded-xl px-6 py-3 text-sm tracking-wide hover:bg-primary-dark active:scale-[0.97] transition shadow-sm"
            >
              ORDER
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
