'use client';

import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface CartFABProps { onClick: () => void; }

export function CartFAB({ onClick }: CartFABProps) {
  const { totalItems, totalPrice } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.button
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }} onClick={onClick}
          aria-label={totalItems + ' item di keranjang, total ' + formatCurrency(totalPrice)}
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
  );
}
