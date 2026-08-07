'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatCurrency, tableLabel } from '@/lib/utils';
import { Order } from '@/types';
import { History, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

type PurgeScope = 'day' | 'month' | 'year' | 'all';

const PURGE_SCOPES: { value: PurgeScope; label: string }[] = [
  { value: 'day', label: 'Hari' },
  { value: 'month', label: 'Bulan' },
  { value: 'year', label: 'Tahun' },
  { value: 'all', label: 'Semua' },
];

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; orderId?: string }>({ open: false });
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeScope, setPurgeScope] = useState<PurgeScope>('day');
  const [purgeAnchor, setPurgeAnchor] = useState(() => new Date());

  const fetchHistory = useCallback(() => {
    fetch('/api/orders/history')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setOrders(Array.isArray(d) ? d : []); })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const openDeleteModal = (orderId: string) => {
    setConfirmModal({ open: true, orderId });
  };

  // --- Hapus riwayat per periode ---------------------------------------
  //
  // Batas hari ditentukan di sini, dari jam browser kasir — bukan di server.
  // `new Date(y, m, d)` itu tengah malam WIB, dan `toISOString()` mengubahnya
  // jadi instan UTC yang benar. Kalau server yang memotong per hari, batasnya
  // jatuh pukul 07.00 pagi WIB, tepat di tengah hari kerja.
  const purgeRange = (): [Date, Date] | null => {
    const y = purgeAnchor.getFullYear();
    const m = purgeAnchor.getMonth();
    const d = purgeAnchor.getDate();
    switch (purgeScope) {
      case 'day': return [new Date(y, m, d), new Date(y, m, d + 1)];
      case 'month': return [new Date(y, m, 1), new Date(y, m + 1, 1)];
      case 'year': return [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
      default: return null;
    }
  };

  const shiftPurgeAnchor = (step: number) => {
    const y = purgeAnchor.getFullYear();
    const m = purgeAnchor.getMonth();
    const d = purgeAnchor.getDate();
    if (purgeScope === 'day') setPurgeAnchor(new Date(y, m, d + step));
    else if (purgeScope === 'month') setPurgeAnchor(new Date(y, m + step, 1));
    else if (purgeScope === 'year') setPurgeAnchor(new Date(y + step, m, 1));
  };

  const purgeLabel = (): string => {
    if (purgeScope === 'all') return 'seluruh riwayat';
    if (purgeScope === 'year') return String(purgeAnchor.getFullYear());
    return new Intl.DateTimeFormat('id-ID',
      purgeScope === 'day'
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : { month: 'long', year: 'numeric' },
    ).format(purgeAnchor);
  };

  // Dihitung dari daftar yang sudah dimuat, bukan ditanyakan ke server:
  // penghapusan ini permanen, dan angka "0 order" adalah cara paling cepat
  // menyadari salah pilih periode.
  const purgeAffected = (() => {
    const range = purgeRange();
    if (!range) return orders.length;
    const [from, to] = range;
    return orders.filter(o => {
      const at = new Date(o.created_at);
      return at >= from && at < to;
    }).length;
  })();

  const handlePurge = async () => {
    setClearing(true);
    const range = purgeRange();
    const qs = range
      ? '?from=' + encodeURIComponent(range[0].toISOString()) + '&to=' + encodeURIComponent(range[1].toISOString())
      : '';
    try {
      const res = await fetch('/api/orders/history' + qs, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.success((data.deleted ?? purgeAffected) + ' order dihapus dari riwayat');
        setPurgeOpen(false);
        fetchHistory();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menghapus riwayat');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setClearing(false);
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
    setConfirmModal({ open: false });
  };

  // Catatan: `handleClearAll` sudah dilebur ke `handlePurge` dengan lingkup
  // "Semua" — satu jalan, satu konfirmasi, dan jumlah order yang terdampak
  // selalu terlihat sebelum ditekan.

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><History className="w-5 h-5" /> Riwayat Order</h2>
        {orders.length > 0 && (
          <Button variant="danger" size="sm" onClick={() => setPurgeOpen(true)} disabled={clearing} loading={clearing}>
            <Trash2 className="w-4 h-4 mr-1" />Hapus Riwayat
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
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium">Payment</th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium">Total</th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium">Status</th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium">Waktu</th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-medium w-10" />
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3 font-medium">{tableLabel(order.table)}</td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{order.items?.map(i => i.menu_item_name).join(', ') || '-'}</td>
                  <td className="px-4 py-3 text-sm">{order.payment_method}</td>
                  <td className="px-4 py-3 font-bold">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3"><Badge variant={order.status === 'SERVED' ? 'success' : 'danger'}>{order.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{new Date(order.created_at).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDeleteModal(order.id)}
                      disabled={deletingId === order.id}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                      aria-label={'Hapus order ' + tableLabel(order.table)}
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

      {purgeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPurgeOpen(false)} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="purge-dialog-title">
            <h3 id="purge-dialog-title" className="text-lg font-bold mb-4">Hapus Riwayat</h3>

            <div className="flex gap-2 mb-4">
              {PURGE_SCOPES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setPurgeScope(s.value)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                    purgeScope === s.value
                      ? 'border-ember-ink bg-ember-soft text-ember-ink'
                      : 'border-border bg-surface text-text hover:bg-surface-3',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {purgeScope !== 'all' && (
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => shiftPurgeAnchor(-1)} aria-label="Periode sebelumnya"
                  className="p-2 rounded-lg border border-border text-text hover:bg-surface-3">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center font-bold text-text">{purgeLabel()}</span>
                <button onClick={() => shiftPurgeAnchor(1)} aria-label="Periode berikutnya"
                  className="p-2 rounded-lg border border-border text-text hover:bg-surface-3">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-3 rounded-lg border border-danger/35 bg-danger/5 mb-4">
              <p className={cn('text-sm font-medium', purgeAffected === 0 ? 'text-text-secondary' : 'text-danger')}>
                {purgeAffected === 0
                  ? 'Tidak ada order pada ' + purgeLabel() + '.'
                  : purgeAffected + ' order pada ' + purgeLabel() + ' akan dihapus permanen.'}
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setPurgeOpen(false)} disabled={clearing}>Batal</Button>
              <Button variant="danger" onClick={handlePurge} disabled={clearing || purgeAffected === 0} loading={clearing}>
                Hapus Permanen
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmModal({ open: false })} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
            <h3 id="delete-dialog-title" className="text-lg font-bold mb-2">Hapus Order?</h3>
            <p className="text-sm text-text-secondary mb-4">
              Order ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setConfirmModal({ open: false })}>Batal</Button>
              <Button variant="danger" onClick={handleDeleteOne}>Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
