'use client';

import { useOrders } from '@/hooks/useOrders';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChefHat } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function KitchenPage() {
  const { orders, loading } = useOrders();
  const [etaMap, setEtaMap] = useState<Record<string, number>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const logActivity = async (action: string, target_type: string, target_id: string, detail: Record<string, unknown>) => {
    await fetch('/api/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_email: 'koki@warkop.com', actor_role: 'koki', action, target_type, target_id, detail }),
    });
  };

  const handleSetEta = (id: string, minutes: number) => {
    setEtaMap(prev => ({ ...prev, [id]: minutes }));
  };

  const handleStartProcess = async (id: string) => {
    const minutes = etaMap[id] || 10;
    setProcessingId(id);
    const res = await fetch('/api/orders/' + id + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PROCESSING', estimated_minutes: minutes }),
    });
    if (res.ok) {
      toast.success('Pesanan mulai diproses', { description: 'Estimasi: ' + minutes + ' menit' });
      await logActivity('start_process', 'order', id, { estimated_minutes: minutes });
    }
    setProcessingId(null);
  };

  const handleUpdateEta = async (id: string, addMinutes: number) => {
    const res = await fetch('/api/orders/' + id + '/update-eta', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estimated_minutes: addMinutes }),
    });
    if (res.ok) {
      toast.info('Estimasi waktu diperpanjang', { description: '+' + addMinutes + ' menit' });
      await logActivity('update_eta', 'order', id, { add_minutes: addMinutes });
    }
  };

  const handleServed = async (id: string) => {
    setProcessingId(id);
    const res = await fetch('/api/orders/' + id + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SERVED' }),
    });
    if (res.ok) {
      toast.success('Pesanan sudah diantar');
      await logActivity('served', 'order', id, {});
    }
    setProcessingId(null);
  };

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  const queue = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PENDING_CASH' || o.status === 'PENDING_PAYMENT');
  const processing = orders.filter(o => o.status === 'PROCESSING');

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold mb-4">Kitchen Display</h2>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ChefHat className="w-5 h-5" />
          Antrian ({queue.length})
        </h3>
        {queue.length === 0 ? (
          <EmptyState title="Tidak ada antrian" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {queue.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                showEtaSelector
                etaMinutes={etaMap[order.id] || 10}
                onSetEta={(minutes) => handleSetEta(order.id, minutes)}
                onStartProcess={() => handleStartProcess(order.id)}
              />
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          Sedang Diproses ({processing.length})
        </h3>
        {processing.length === 0 ? (
          <EmptyState title="Tidak ada pesanan diproses" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {processing.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateEta={(minutes) => handleUpdateEta(order.id, minutes)}
                onServed={() => handleServed(order.id)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
