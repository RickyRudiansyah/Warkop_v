'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CheckCircle, ArrowLeft, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="glass sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3">
        <Link href="/order"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold text-primary">Warkop QR</h1>
        <ThemeToggle className="ml-auto" />
      </header>
      <div className="flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
        >
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6 mx-auto">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-2xl font-bold mb-2">Pesanan Berhasil!</h1>
          <p className="text-text-secondary mb-2">Pesanan Anda sedang diproses di dapur.</p>
          {orderId && (
            <p className="text-xs text-text-secondary font-mono mb-6">Order #{orderId.slice(0, 8)}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex flex-col gap-3 w-full"
        >
          <div className="card p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Printer className="w-4 h-4" />
              <span>Struk akan otomatis tercetak di dapur</span>
            </div>
            <p className="text-xs text-text-secondary/70">
              Pesanan Anda akan segera disiapkan. Silakan tunggu di meja, staff kami akan mengantarkan pesanan Anda.
            </p>
          </div>
          <Link href="/order" className="w-full"><Button variant="primary" size="lg" className="w-full">Pesan Lagi</Button></Link>
        </motion.div>
      </div>
    </div>
  );
}
