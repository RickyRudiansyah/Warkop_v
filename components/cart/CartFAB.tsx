'use client';

import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface CartFABProps { onClick: () => void; }

// Cart bar sticky di dasar layar (DESIGN.md §5.8): background brown-950,
// kiri jumlah item, tengah total, kanan tombol gold. Hanya tampil bila
// keranjang terisi — slide-up saat item pertama masuk.
export function CartFAB({ onClick }: CartFABProps) {
  const { totalItems, totalPrice } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
          transition={{ type: 'spring', damping: 24, duration: 0.2 }}
          className="fixed bottom-0 left-0 right-0 z-40 bar-dark pb-safe"
        >
          <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-ember-600 text-cream-50 text-[10px] font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide opacity-60 leading-none">
                  {totalItems} item
                </p>
                <p className="font-bold text-[15px] leading-tight mt-1 truncate">{formatCurrency(totalPrice)}</p>
              </div>
            </div>

            <button
              onClick={onClick}
              className="shrink-0 bg-gold-500 text-brown-900 font-bold text-sm uppercase tracking-wide rounded-lg px-6 h-11 hover:bg-gold-400 active:scale-[0.97] transition"
            >
              Lihat Pesanan
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
