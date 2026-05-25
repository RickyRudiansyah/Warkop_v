'use client';

import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CartFABProps {
  onClick: () => void;
}

export function CartFAB({ onClick }: CartFABProps) {
  const { totalItems, totalPrice } = useCart();

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.button
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          onClick={onClick}
          className="fixed bottom-6 left-4 right-4 z-40 bg-primary text-white rounded-2xl shadow-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
            </div>
          </div>
          <span className="font-bold text-lg">{formatCurrency(totalPrice)}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
