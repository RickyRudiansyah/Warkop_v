'use client';

import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChefHat } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function KitchenPage() {
  const { orders, loading } = useOrders();
  const { staffProfile } = useAuth();
  const [etaMap, setEtaMap] = useState<Record<string, number>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const logActivity = async (action: string, target_type: string, target_id: string, detail: Record<string, unknown>) => {
    if (!staffProfile) return;
    await fetch('/api/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_email: staffProfile.email, actor_role: staffProfile.role, action, target_type, target_id, detail }),
    });
  };

  const handleSetEta = (id: string, minutes: number) => {
    setEtaMap(prev => ({ ...prev, [id]: minutes }));
  };

  const handleStartProcess = async (id: string) => {
    const minutes = etaMap[id] || 10;
    setProcessingId(id);
    try {
      const res = await fetch('/api/orders/' + id + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESSING', estimated_minutes: minutes }),
      });
      if (res.ok) {
        toast.success('Pesanan mulai diproses', { description: 'Estimasi: ' + minutes + ' menit' });
        await logActivity('start_process', 'order', id, { estimated_minutes: minutes });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal memproses pesanan');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setProcessingId(null);
  };

  const handleUpdateEta = async (id: string, addMinutes: number) => {
    try {
      const res = await fetch('/api/orders/' + id + '/update-eta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimated_minutes: addMinutes }),
      });
      if (res.ok) {
        toast.info('Estimasi waktu diperpanjang', { description: '+' + addMinutes + ' menit' });
        await logActivity('update_eta', 'order', id, { add_minutes: addMinutes });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal update estimasi');
      }
    } catch { toast.error('Gagal menghubungi server'); }
  };

  const handleServed = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/orders/' + id + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SERVED' }),
      });
      if (res.ok) {
        toast.success('Pesanan sudah diantar');
        await logActivity('served', 'order', id, {});
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menyelesaikan pesanan');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setProcessingId(null);
  };

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  const queue = orders.filter(o => o.status === 'CONFIRMED');
  const processing = orders.filter(o => o.status === 'PROCESSING');

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold mb-4">Kitchen Display</h2>
      <div className="mb-6" aria-live="polite">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ChefHat className="w-5 h-5" />
          Antrian ({queue.length})
        </h3>
        {queue.length === 0 ? (
          <EmptyState title="Tidak ada antrian" />
        ) : (
          <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" variants={container} initial="hidden" animate="show">
            {queue.map(order => (
              <motion.div key={order.id} variants={itemAnim}>
                <OrderCard
                  order={order}
                  isLoading={processingId === order.id}
                  showEtaSelector
                  etaMinutes={etaMap[order.id] || 10}
                  onSetEta={(minutes) => handleSetEta(order.id, minutes)}
                  onStartProcess={() => handleStartProcess(order.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
      <div aria-live="polite">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          Sedang Diproses ({processing.length})
        </h3>
        {processing.length === 0 ? (
          <EmptyState title="Tidak ada pesanan diproses" />
        ) : (
          <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" variants={container} initial="hidden" animate="show">
            {processing.map(order => (
              <motion.div key={order.id} variants={itemAnim}>
                <OrderCard
                  order={order}
                  isLoading={processingId === order.id}
                  onUpdateEta={(minutes) => handleUpdateEta(order.id, minutes)}
                  onServed={() => handleServed(order.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
