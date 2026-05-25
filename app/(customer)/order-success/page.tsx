'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckCircle, MapPin, ArrowLeft, Coffee } from 'lucide-react';
import Link from 'next/link';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="glass sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3">
        <Link href="/order"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold text-primary">Warkop QR</h1>
      </header>
      <div className="flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
        <CheckCircle className="w-16 h-16 text-success mb-4" />
        <h1 className="text-2xl font-bold mb-2">Pesanan Berhasil!</h1>
        <p className="text-text-secondary mb-6">Pesanan Anda sedang diproses. Silakan tunggu di meja.</p>
        <div className="flex flex-col gap-3 w-full">
          {orderId && (
            <Link href={'/order-tracking?orderId=' + orderId} className="w-full">
              <Button variant="primary" size="lg" className="w-full"><MapPin className="w-4 h-4 mr-2" />Lacak Pesanan</Button>
            </Link>
          )}
          <Link href="/order" className="w-full"><Button variant="secondary" size="lg" className="w-full">Kembali ke Menu</Button></Link>
        </div>
      </div>
    </div>
  );
}
