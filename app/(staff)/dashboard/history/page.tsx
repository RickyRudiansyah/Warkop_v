'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';
import { History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'single' | 'all'; orderId?: string }>({ open: false, type: 'single' });

  const fetchHistory = useCallback(() => {
    fetch('/api/orders/history')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setOrders(Array.isArray(d) ? d : []); })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const openDeleteModal = (orderId: string) => {
    setConfirmModal({ open: true, type: 'single', orderId });
  };

  const openClearAllModal = () => {
    setConfirmModal({ open: true, type: 'all' });
  };

  const handleDeleteOne = async () => {
    if (!confirmModal.orderId) return;
    setDeletingId(confirmModal.orderId);
    try {
      const res = await fetch('/api/orders/' + confirmModal.orderId, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Order berhasil dihapus');
        setOrders(prev => prev.filter(o => o.id !== confirmModal.orderId));
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menghapus order');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setDeletingId(null);
    setConfirmModal({ open: false, type: 'single' });
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/orders/history', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Semua riwayat berhasil dihapus');
        setOrders([]);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menghapus riwayat');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setClearing(false);
    setConfirmModal({ open: false, type: 'all' });
  };

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  const statusLabelBg = (status: string) => {
    return status === 'SERVED' ? 'success' : status === 'CANCELLED' ? 'danger' : 'info';
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><History className="w-5 h-5" /> Riwayat Order</h2>
        {orders.length > 0 && (
          <Button variant="danger" size="sm" onClick={openClearAllModal} disabled={clearing} loading={clearing}>
            <Trash2 className="w-4 h-4 mr-1" />Hapus Semua
          </Button>
        )}
      </div>
      {orders.length === 0 ? (
        <EmptyState icon={<History className="w-12 h-12" />} title="Belum ada riwayat" description="Order yang selesai atau dibatalkan akan muncul di sini" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-surface-3 border-b">
              <tr>
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium">Meja</th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Items</th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium">Bayar</th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium">Total</th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium">Status</th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium">Waktu</th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium w-10" />
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3 font-medium">Meja {order.table?.table_number || '-'}</td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{order.items?.map(i => i.menu_item_name).join(', ') || '-'}</td>
                  <td className="px-4 py-3 text-sm">{order.payment_method} {order.payment_status === 'PAID' ? '\u2705' : '\u274C'}</td>
                  <td className="px-4 py-3 font-bold">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3"><Badge variant={statusLabelBg(order.status)}>{order.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{new Date(order.created_at).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDeleteModal(order.id)}
                      disabled={deletingId === order.id}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                      aria-label={'Hapus order meja ' + (order.table?.table_number || '')}
                    >
                      {deletingId === order.id ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmModal({ open: false, type: 'single' })} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
            <h3 id="delete-dialog-title" className="text-lg font-bold mb-2">
              {confirmModal.type === 'all' ? 'Hapus Semua Riwayat?' : 'Hapus Order?'}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {confirmModal.type === 'all'
                ? 'Semua order yang sudah selesai dan dibatalkan akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.'
                : 'Order ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.'}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setConfirmModal({ open: false, type: 'single' })}>Batal</Button>
              <Button variant="danger" onClick={confirmModal.type === 'all' ? handleClearAll : handleDeleteOne}>
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
