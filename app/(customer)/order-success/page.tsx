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
          <p className="text-text-secondary mb-6">Pesanan Anda sedang diproses. Silakan tunggu di meja.</p>
        </motion.div>
        <motion.div className="flex flex-col gap-3 w-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          {orderId && (
            <Link href={'/order-tracking?orderId=' + orderId} className="w-full">
              <Button variant="primary" size="lg" className="w-full"><MapPin className="w-4 h-4 mr-2" />Lacak Pesanan</Button>
            </Link>
          )}
          <Link href="/order" className="w-full"><Button variant="secondary" size="lg" className="w-full">Kembali ke Menu</Button></Link>
        </motion.div>
      </div>
    </div>
  );
}
