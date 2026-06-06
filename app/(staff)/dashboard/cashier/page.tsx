'use client';

import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { ClipboardList } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Order } from '@/types';

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function CashierPage() {
  const { orders, loading } = useOrders({ includeUnpaidServed: true });
  const { staffProfile } = useAuth();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState<{ open: boolean; orderId: string }>({ open: false, orderId: '' });
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cancelModal.open) setCancelModal({ open: false, orderId: '' });
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cancelModal.open]);

  // Group active orders by table number.
  const groups = useMemo(() => {
    const map = new Map<string, { tableNumber: number | null; label: string; orders: Order[] }>();
    for (const order of orders) {
      const num = order.table?.table_number ?? null;
      const key = num === null ? 'none' : String(num);
      if (!map.has(key)) {
        map.set(key, { tableNumber: num, label: order.table?.label || (num === null ? 'Tanpa Meja' : 'Meja ' + num), orders: [] });
      }
      map.get(key)!.orders.push(order);
    }
    return Array.from(map.values()).sort((a, b) => (a.tableNumber ?? 9999) - (b.tableNumber ?? 9999));
  }, [orders]);

  const logActivity = async (action: string, target_type: string, target_id: string, detail: Record<string, unknown>) => {
    if (!staffProfile) return;
    await fetch('/api/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_email: staffProfile.email, actor_role: staffProfile.role, action, target_type, target_id, detail }),
    });
  };

  const handleFinishTable = async (orderIds: string[], tableLabel: string) => {
    setProcessingId(orderIds[0]);
    try {
      await Promise.all(orderIds.map(id =>
        fetch('/api/orders/' + id + '/archive', { method: 'PATCH' })
      ));
      toast.success(tableLabel + ' selesai & dipindah ke history');
      await Promise.all(orderIds.map(id =>
        logActivity('finish_order', 'order', id, { tableLabel })
      ));
    } catch { toast.error('Gagal menyelesaikan pesanan'); }
    setProcessingId(null);
  };

  const handleMarkPaid = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/orders/' + id + '/mark-paid', { method: 'PATCH' });
      if (res.ok) {
        toast.success('Pesanan ditandai lunas');
        await logActivity('mark_paid', 'order', id, {});
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menandai lunas');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setProcessingId(null);
  };

  const openCancelModal = (id: string) => {
    setCancelModal({ open: true, orderId: id });
    setCancelReason('');
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    try {
      const res = await fetch('/api/orders/' + cancelModal.orderId + '/cancel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (res.ok) {
        toast.error('Pesanan dibatalkan');
        await logActivity('cancel_order', 'order', cancelModal.orderId, { reason: cancelReason });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal membatalkan');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setCancelModal({ open: false, orderId: '' });
  };

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold mb-4">Order Aktif</h2>
      {orders.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-12 h-12" />} title="Belum ada order" description="Order baru akan muncul di sini" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-live="polite">
            {groups.map(group => {
              const unpaidCount = group.orders.filter(o => o.payment_status === 'UNPAID').length;
              const allDone = group.orders.length > 0 && group.orders.every(o => o.status === 'SERVED' && o.payment_status === 'PAID');
              const isFinishing = group.orders.some(o => processingId === o.id);
              return (
                <div key={group.label} className="card p-4">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b">
                    <h3 className="font-bold text-lg">{group.label}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{group.orders.length} order</Badge>
                      {unpaidCount > 0 && <Badge variant="warning">{unpaidCount} belum bayar</Badge>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {group.orders.map(order => (
                      <motion.div key={order.id} variants={itemAnim} initial="hidden" animate="show">
                        <OrderCard
                          order={order}
                          isLoading={processingId === order.id}
                          onMarkPaid={() => handleMarkPaid(order.id)}
                          onCancel={() => openCancelModal(order.id)}
                        />
                      </motion.div>
                    ))}
                  </div>
                  {allDone && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        variant="primary"
                        className="w-full"
                        loading={isFinishing}
                        disabled={isFinishing}
                        onClick={() => handleFinishTable(group.orders.map(o => o.id), group.label)}
                      >
                        Selesai — Pindah ke History
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {cancelModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setCancelModal({ open: false, orderId: '' })} />
              <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6" role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title">
                <h3 id="cancel-dialog-title" className="text-lg font-bold mb-3">Batalkan Pesanan</h3>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Alasan pembatalan..."
                  className="w-full p-3 border rounded-lg resize-none bg-surface mb-4"
                  rows={3}
                  autoFocus
                  aria-label="Alasan pembatalan"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setCancelModal({ open: false, orderId: '' })}>Batal</Button>
                  <Button variant="danger" onClick={handleCancel} disabled={!cancelReason.trim()}>Konfirmasi Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
