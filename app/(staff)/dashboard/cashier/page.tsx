'use client';

import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardList, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const columns = [
  { key: 'PENDING_CASH', label: 'Pending Cash', color: 'border-warning' },
  { key: 'PENDING_PAYMENT', label: 'Pending Bayar', color: 'border-orange-400' },
  { key: 'CONFIRMED', label: 'Dikonfirmasi', color: 'border-info' },
  { key: 'PROCESSING', label: 'Diproses', color: 'border-primary' },
];

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function CashierPage() {
  const { orders, loading } = useOrders();
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

  const logActivity = async (action: string, target_type: string, target_id: string, detail: Record<string, unknown>) => {
    if (!staffProfile) return;
    await fetch('/api/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_email: staffProfile.email, actor_role: staffProfile.role, action, target_type, target_id, detail }),
    });
  };

  const handleConfirmCash = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/orders/' + id + '/confirm-cash', { method: 'PATCH' });
      if (res.ok) {
        toast.success('Pembayaran cash dikonfirmasi');
        await logActivity('confirm_cash', 'order', id, {});
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal konfirmasi');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setProcessingId(null);
  };

  const handleConfirmPayment = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/orders/' + id + '/confirm-payment', { method: 'PATCH' });
      if (res.ok) {
        toast.success('Pembayaran dikonfirmasi');
        await logActivity('confirm_payment', 'order', id, {});
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal konfirmasi');
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" aria-live="polite">
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
                      <motion.div key={order.id} variants={itemAnim} initial="hidden" animate="show">
                        <OrderCard
                          order={order}
                          isLoading={processingId === order.id}
                          onConfirmCash={() => handleConfirmCash(order.id)}
                          onConfirmPayment={() => handleConfirmPayment(order.id)}
                          onCancel={() => openCancelModal(order.id)}
                        />
                      </motion.div>
                    ))
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
