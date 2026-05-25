'use client';

import { useOrders } from '@/hooks/useOrders';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const columns = [
  { key: 'PENDING_CASH', label: 'Pending Cash', color: 'border-warning' },
  { key: 'PENDING_PAYMENT', label: 'Pending Bayar', color: 'border-orange-400' },
  { key: 'CONFIRMED', label: 'Dikonfirmasi', color: 'border-info' },
  { key: 'PROCESSING', label: 'Diproses', color: 'border-primary' },
];

export default function CashierPage() {
  const { orders, loading } = useOrders();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const logActivity = async (action: string, target_type: string, target_id: string, detail: Record<string, unknown>) => {
    await fetch('/api/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_email: 'cashier@warkop.com', actor_role: 'cashier', action, target_type, target_id, detail }),
    });
  };

  const handleConfirmCash = async (id: string) => {
    setProcessingId(id);
    const res = await fetch('/api/orders/' + id + '/confirm-cash', { method: 'PATCH' });
    if (res.ok) {
      toast.success('Pembayaran cash dikonfirmasi');
      await logActivity('confirm_cash', 'order', id, {});
    }
    setProcessingId(null);
  };

  const handleConfirmPayment = async (id: string) => {
    setProcessingId(id);
    const res = await fetch('/api/orders/' + id + '/confirm-payment', { method: 'PATCH' });
    if (res.ok) {
      toast.success('Pembayaran dikonfirmasi');
      await logActivity('confirm_payment', 'order', id, {});
    }
    setProcessingId(null);
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Alasan pembatalan:');
    if (!reason) return;
    const res = await fetch('/api/orders/' + id + '/cancel', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      toast.error('Pesanan dibatalkan');
      await logActivity('cancel_order', 'order', id, { reason });
    }
  };

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold mb-4">Order Aktif</h2>
      {orders.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-12 h-12" />} title="Belum ada order" description="Order baru akan muncul di sini" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(col => {
            const colOrders = orders.filter(o => o.status === col.key);
            return (
              <div key={col.key} className="space-y-3">
                <h3 className={'font-semibold text-sm uppercase tracking-wide border-l-4 pl-3 ' + col.color}>
                  {col.label} ({colOrders.length})
                </h3>
                {colOrders.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary text-sm">Tidak ada order</div>
                ) : (
                  colOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onConfirmCash={() => handleConfirmCash(order.id)}
                      onConfirmPayment={() => handleConfirmPayment(order.id)}
                      onCancel={() => handleCancel(order.id)}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
