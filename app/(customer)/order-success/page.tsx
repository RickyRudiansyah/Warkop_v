'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckCircle, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-surface-2">
      <CheckCircle className="w-16 h-16 text-success mb-4" />
      <h1 className="text-2xl font-bold text-center mb-2">Pesanan Berhasil!</h1>
      <p className="text-text-secondary text-center mb-2">Pesanan Anda sedang diproses.</p>
      <p className="text-text-secondary text-center mb-6">Silakan tunggu di meja.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {orderId && (
          <Link href={'/order-tracking?orderId=' + orderId} className="w-full">
            <Button variant="primary" size="lg" className="w-full">
              <MapPin className="w-4 h-4 mr-2" />
              Lacak Pesanan
            </Button>
          </Link>
        )}
        <Link href="/order" className="w-full">
          <Button variant="secondary" size="lg" className="w-full">Kembali ke Menu</Button>
        </Link>
      </div>
    </div>
  );
}
