'use client';

import { useState } from 'react';
import { Order, OrderStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, getElapsedMinutes } from '@/lib/utils';
import { useCountdown } from '@/hooks/useCountdown';
import { Clock, AlertCircle, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger' | 'info' }> = {
  QUEUED: { label: 'Antri', variant: 'info' },
  PROCESSING: { label: 'Diproses', variant: 'info' },
  SERVED: { label: 'Selesai', variant: 'success' },
  CANCELLED: { label: 'Dibatalkan', variant: 'danger' },
};

interface OrderCardProps {
  order: Order;
  onMarkPaid?: () => void;
  onReprint?: () => void;
  onFinish?: () => void;
  onStartProcess?: () => void;
  onServed?: () => void;
  onCancel?: () => void;
  showEtaSelector?: boolean;
  onSetEta?: (minutes: number) => void;
  onUpdateEta?: (minutes: number) => void;
  etaMinutes?: number;
  isLoading?: boolean;
}

export function OrderCard({ order, onMarkPaid, onReprint, onFinish, onStartProcess, onServed, onCancel, showEtaSelector, onSetEta, onUpdateEta, etaMinutes, isLoading }: OrderCardProps) {
  const elapsed = getElapsedMinutes(order.created_at);
  const config = statusConfig[order.status] || { label: order.status, variant: 'default' as const };
  const { formatted: etaFormatted, isOverdue, isWarning } = useCountdown(order.estimated_ready_at || null);
  const isProcessing = order.status === 'PROCESSING';
  const [etaExtension, setEtaExtension] = useState(5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn('card p-4', isOverdue && 'border-danger shadow-danger/20', isWarning && !isOverdue && 'border-warning')}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">Meja {order.table?.table_number || '-'}</h3>
          <p className="text-sm text-text-secondary">{order.payment_method}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={config.variant}>{config.label}</Badge>
          <Badge variant={order.payment_status === 'PAID' ? 'success' : 'warning'}>
            {order.payment_status === 'PAID' ? 'Lunas' : 'Belum Bayar'}
          </Badge>
        </div>
      </div>

      {isProcessing && order.estimated_ready_at && (
        <div className={cn('flex items-center gap-2 mb-3 p-2 rounded-lg', isOverdue ? 'bg-danger/10' : isWarning ? 'bg-warning/10' : 'bg-surface-3')}>
          <Clock className={cn('w-4 h-4', isOverdue ? 'text-danger' : isWarning ? 'text-warning' : 'text-success')} />
          <span className={cn('text-sm font-mono font-bold', isOverdue ? 'text-danger' : isWarning ? 'text-warning' : 'text-success')}>
            {isOverdue ? "OVERDUE " + etaFormatted : etaFormatted}
          </span>
          {isOverdue && <AlertCircle className="w-4 h-4 text-danger animate-pulse" />}
        </div>
      )}

      {!isProcessing && (
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-3">
          <Clock className="w-4 h-4" />
          <span>{elapsed} menit lalu</span>
        </div>
      )}

      <div className="space-y-1 mb-3">
        {order.items?.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.quantity}x {item.menu_item_name}</span>
            <span>{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-text">{formatCurrency(order.total_amount)}</span>
          <div className="flex gap-2 flex-wrap">
            {onCancel && order.status === 'QUEUED' && (
              <Button variant="danger" size="sm" onClick={onCancel} aria-label="Batalkan pesanan">Cancel</Button>
            )}
            {onMarkPaid && order.payment_status === 'UNPAID' && (
              <Button variant="success" size="sm" onClick={onMarkPaid} disabled={isLoading} loading={isLoading}>
                Verifikasi & Cetak Struk
              </Button>
            )}
            {onReprint && order.payment_status === 'PAID' && (
              <Button variant="ghost" size="sm" onClick={onReprint} disabled={isLoading} aria-label="Cetak ulang struk">
                <Printer className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {showEtaSelector && order.status === 'QUEUED' && onSetEta && (
          <div className="flex items-center gap-2 mt-2">
            <select value={etaMinutes || 10} onChange={e => onSetEta(parseInt(e.target.value))} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-surface" aria-label="Estimasi waktu">
              <option value={5}>5 menit</option>
              <option value={10}>10 menit</option>
              <option value={15}>15 menit</option>
              <option value={20}>20 menit</option>
              <option value={25}>25 menit</option>
              <option value={30}>30 menit</option>
            </select>
            <Button variant="primary" size="sm" onClick={onStartProcess} disabled={isLoading} loading={isLoading}>Mulai Proses</Button>
          </div>
        )}

        {isProcessing && onUpdateEta && (
          <div className="flex items-center gap-2 mt-2">
            <select value={etaExtension} onChange={e => setEtaExtension(parseInt(e.target.value))} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-surface" aria-label="Tambah estimasi waktu">
              <option value={5}>+5 menit</option>
              <option value={10}>+10 menit</option>
              <option value={15}>+15 menit</option>
            </select>
            <Button variant="secondary" size="sm" onClick={() => onUpdateEta(etaExtension)} disabled={isLoading} loading={isLoading}>Update</Button>
          </div>
        )}

        {onServed && order.status === 'PROCESSING' && (
          <Button variant="success" size="sm" className="w-full mt-2" onClick={onServed} disabled={isLoading} loading={isLoading}>Sudah Diantar</Button>
        )}
      </div>
    </motion.div>
  );
}
