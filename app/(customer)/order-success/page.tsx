'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CheckCircle, MapPin, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const tableId = searchParams.get('tableId');
  const trackHref = tableId
    ? '/order-tracking?tableId=' + tableId
    : orderId ? '/order-tracking?orderId=' + orderId : null;

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="sticky top-0 z-20 bg-brown-900 text-on-dark shadow-sm">
        <div className="max-w-md mx-auto h-14 px-4 flex items-center gap-3">
          <Link href="/order" aria-label="Kembali ke menu"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-base font-semibold uppercase tracking-wide">Rumipang</h1>
          <ThemeToggle className="ml-auto" />
        </div>
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
          <p className="text-text-secondary mb-6">Pesanan Anda sedang diproses. Silakan tunggu di meja.</p>
        </motion.div>
        <motion.div className="flex flex-col gap-3 w-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          {trackHref && (
            <Link href={trackHref} className="w-full">
              <Button variant="primary" size="lg" className="w-full"><MapPin className="w-4 h-4 mr-2" />Lacak Pesanan</Button>
            </Link>
          )}
          <Link href="/order" className="w-full"><Button variant="secondary" size="lg" className="w-full">Kembali ke Menu</Button></Link>
        </motion.div>
      </div>
    </div>
  );
}
