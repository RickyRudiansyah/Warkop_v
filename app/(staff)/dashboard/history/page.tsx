'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';
import { History } from 'lucide-react';

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders/history')
      .then(r => { if (!r.ok) throw new Error('Network error'); return r.json(); })
      .then(d => { setOrders(d); setLoading(false); })
      .catch(() => { setOrders([]); setLoading(false); });
  }, []);

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><History className="w-5 h-5" /> Riwayat Order</h2>
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
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3 font-medium">Meja {order.table?.table_number || '-'}</td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{order.items?.map(i => i.menu_item_name).join(', ') || '-'}</td>
                  <td className="px-4 py-3 text-sm">{order.payment_method}</td>
                  <td className="px-4 py-3 font-bold">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3"><Badge variant={order.status === 'SERVED' ? 'success' : 'danger'}>{order.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{new Date(order.created_at).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
