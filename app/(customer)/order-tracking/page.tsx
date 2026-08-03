'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCountdown } from '@/hooks/useCountdown';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CheckCircle, AlertCircle, ChefHat, ShoppingCart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Order, OrderItem } from '@/types';

const statusSteps = [
  { key: 'QUEUED', label: 'Pesanan Diterima', icon: ShoppingCart },
  { key: 'PROCESSING', label: 'Sedang Diproses', icon: ChefHat },
  { key: 'SERVED', label: 'Sudah Diantar', icon: CheckCircle },
  { key: 'CANCELLED', label: 'Dibatalkan', icon: AlertCircle },
];

function OrderStatusCard({ order }: { order: Order }) {
  const { formatted: etaFormatted, isOverdue, isWarning } = useCountdown(order.estimated_ready_at || null);
  const currentStatusIndex = statusSteps.findIndex(s => s.key === order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-secondary">Pesanan #{order.id.slice(0, 8)}</p>
          <p className="text-lg font-bold text-text">{formatCurrency(order.total_amount)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-text-secondary">{order.payment_method}</span>
          <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + (order.payment_status === 'PAID' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
            {order.payment_status === 'PAID' ? 'Lunas' : 'Belum Bayar'}
          </span>
        </div>
      </div>

      {isCancelled ? (
        <div className="flex items-center gap-2 text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">Dibatalkan{order.cancel_reason ? ': ' + order.cancel_reason : ''}</span>
        </div>
      ) : (
        <div className="space-y-2" aria-live="polite">
          {statusSteps.filter(s => s.key !== 'CANCELLED').map((step) => {
            const stepIndex = statusSteps.findIndex(s => s.key === step.key);
            const isCompleted = stepIndex < currentStatusIndex || (order.status === 'SERVED' && stepIndex <= currentStatusIndex);
            const isCurrent = stepIndex === currentStatusIndex;
            const Icon = step.icon;
            const ringClass = isCompleted ? 'bg-success text-white' : isCurrent ? 'bg-primary text-[color:var(--color-on-primary)]' : 'bg-surface-3 text-text-secondary';
            const textClass = isCurrent ? 'text-text font-medium' : isCompleted ? 'text-success font-medium' : 'text-text-secondary';
            const etaClass = isOverdue ? 'text-danger' : isWarning ? 'text-warning' : 'text-text-secondary';
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className={'flex items-center justify-center w-7 h-7 rounded-full shrink-0 ' + ringClass}>
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1">
                  <p className={'text-sm ' + textClass}>{step.label}</p>
                  {isCurrent && order.status === 'PROCESSING' && order.estimated_ready_at && (
                    <p className={'text-xs ' + etaClass}>{isOverdue ? 'Terlambat ' + etaFormatted : 'Estimasi: ' + etaFormatted}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {order.items && order.items.length > 0 && (
        <div className="border-t pt-3 space-y-1">
          {order.items.map((item: OrderItem, i: number) => (
            <div key={item.id || i} className="flex justify-between text-sm">
              <span className="text-text-secondary">{item.quantity}x {item.menu_item_name}</span>
              <span>{formatCurrency(item.quantity * (item.menu_item_price || 0))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrderTrackingPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const tableId = searchParams.get('tableId');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId && !tableId) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        const url = tableId
          ? '/api/orders/table-track?tableId=' + tableId
          : '/api/orders/' + orderId + '/track';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setOrders(tableId ? (Array.isArray(data) ? data : []) : [data]);
        }
      } catch { /* silently retry on next interval */ }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [orderId, tableId]);

  const tableLabel = orders[0]?.table
    ? (orders[0].table.label || 'Meja ' + orders[0].table.table_number)
    : tableId ? 'Meja Anda' : null;

  const header = (
    <header className="glass sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3">
      <Link href="/order"><ArrowLeft className="w-5 h-5" /></Link>
      <h1 className="text-lg font-bold text-text">Rumipang</h1>
      {tableLabel && <p className="text-sm text-text-secondary ml-auto">{tableLabel}</p>}
      <ThemeToggle />
    </header>
  );

  if (loading) return (
    <div className="min-h-screen bg-surface-2">
      {header}
      <div className="max-w-md mx-auto p-4 space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-3">
            <Skeleton width="60%" height="20px" />
            <Skeleton width="40%" />
            <Skeleton width="80%" />
          </div>
        ))}
      </div>
    </div>
  );

  if (!orderId && !tableId) return (
    <div className="min-h-screen bg-surface-2">
      {header}
      <div className="flex items-center justify-center p-12">
        <p className="text-text-secondary">Pesanan tidak ditemukan</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-2">
      {header}
      <div className="max-w-md mx-auto p-4 space-y-4">
        {orders.length === 0 ? (
          <p className="text-text-secondary text-center py-12">Belum ada pesanan aktif untuk meja ini</p>
        ) : (
          orders.map(order => <OrderStatusCard key={order.id} order={order} />)
        )}
        <Link href="/order">
          <Button variant="primary" size="lg" className="w-full">Kembali ke Menu</Button>
        </Link>
      </div>
    </div>
  );
}
