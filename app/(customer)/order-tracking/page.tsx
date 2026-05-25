'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCountdown } from '@/hooks/useCountdown';
import { formatCurrency } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Clock, AlertCircle, ChefHat, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

const statusSteps = [
  { key: 'PENDING_CASH', label: 'Menunggu Pembayaran', icon: ShoppingCart },
  { key: 'PENDING_PAYMENT', label: 'Menunggu Pembayaran', icon: ShoppingCart },
  { key: 'CONFIRMED', label: 'Dikonfirmasi', icon: CheckCircle },
  { key: 'PROCESSING', label: 'Sedang Diproses', icon: ChefHat },
  { key: 'SERVED', label: 'Sudah Diantar', icon: CheckCircle },
  { key: 'CANCELLED', label: 'Dibatalkan', icon: AlertCircle },
];

export default function OrderTrackingPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { formatted: etaFormatted, isOverdue, isWarning, remaining } = useCountdown(order?.estimated_ready_at || null);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      const res = await fetch('/api/orders/' + orderId + '/track');
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
      setLoading(false);
    };
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center"><p>Pesanan tidak ditemukan</p></div>;

  const currentStatusIndex = statusSteps.findIndex(s => s.key === order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-surface-2">
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="card p-6 text-center">
          <h1 className="text-xl font-bold mb-1">Pesanan #{order.id.slice(0, 8)}</h1>
          {order.table && <p className="text-text-secondary">Meja {order.table.table_number}</p>}
          <p className="text-2xl font-bold text-primary mt-2">{formatCurrency(order.total_amount)}</p>
        </div>

        {isCancelled ? (
          <div className="card p-6 text-center">
            <AlertCircle className="w-12 h-12 text-danger mx-auto mb-3" />
            <h2 className="text-lg font-bold text-danger">Pesanan Dibatalkan</h2>
            {order.cancel_reason && <p className="text-text-secondary mt-2">{order.cancel_reason}</p>}
          </div>
        ) : (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Status Pesanan</h2>
            <div className="space-y-4">
              {statusSteps.filter(s => !['PENDING_CASH', 'PENDING_PAYMENT'].includes(s.key) || order.status === s.key).map((step, i) => {
                const stepIndex = statusSteps.findIndex(s => s.key === step.key);
                const isCompleted = stepIndex < currentStatusIndex || (order.status === 'SERVED' && stepIndex <= currentStatusIndex);
                const isCurrent = stepIndex === currentStatusIndex;
                const Icon = step.icon;
                const statusClass = isCompleted ? 'bg-success text-white' : isCurrent ? 'bg-primary text-white' : 'bg-surface-3 text-text-secondary';
                const textClass = isCurrent ? 'text-primary' : isCompleted ? 'text-success' : 'text-text-secondary';
                const etaClass = isOverdue ? 'text-danger' : isWarning ? 'text-warning' : 'text-text-secondary';

                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={'flex items-center justify-center w-8 h-8 rounded-full ' + statusClass}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className={'font-medium ' + textClass}>{step.label}</p>
                      {isCurrent && order.status === 'PROCESSING' && order.estimated_ready_at && (
                        <p className={'text-sm ' + etaClass}>
                          {isOverdue ? 'Terlambat ' + etaFormatted : 'Estimasi: ' + etaFormatted}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {order.items && order.items.length > 0 && (
          <div className="card p-4">
            <h2 className="font-semibold mb-3">Detail Pesanan</h2>
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between py-2 border-b last:border-0">
                <span>{item.quantity}x {item.menu_item_name}</span>
                <span>{formatCurrency(item.quantity * (item.menu_item_price || 0))}</span>
              </div>
            ))}
          </div>
        )}

        <Link href="/order">
          <Button variant="primary" size="lg" className="w-full">Kembali ke Menu</Button>
        </Link>
      </div>
    </div>
  );
}
