'use client';

import { Order, OrderStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, getElapsedMinutes } from '@/lib/utils';
import { useCountdown } from '@/hooks/useCountdown';
import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger' | 'info' }> = {
  PENDING_CASH: { label: 'Menunggu Cash', variant: 'warning' },
  PENDING_PAYMENT: { label: 'Menunggu Bayar', variant: 'warning' },
  CONFIRMED: { label: 'Dikonfirmasi', variant: 'info' },
  PROCESSING: { label: 'Diproses', variant: 'info' },
  SERVED: { label: 'Sudah Diantar', variant: 'success' },
  CANCELLED: { label: 'Dibatalkan', variant: 'danger' },
};

interface OrderCardProps {
  order: Order;
  onConfirmCash?: () => void;
  onConfirmPayment?: () => void;
  onStartProcess?: () => void;
  onServed?: () => void;
  onCancel?: () => void;
  showEtaSelector?: boolean;
  onSetEta?: (minutes: number) => void;
  onUpdateEta?: (minutes: number) => void;
  etaMinutes?: number;
}

export function OrderCard({ order, onConfirmCash, onConfirmPayment, onStartProcess, onServed, onCancel, showEtaSelector, onSetEta, onUpdateEta, etaMinutes }: OrderCardProps) {
  const elapsed = getElapsedMinutes(order.created_at);
  const config = statusConfig[order.status];
  const { formatted: etaFormatted, isOverdue, isWarning } = useCountdown(order.estimated_ready_at || null);
  const isProcessing = order.status === 'PROCESSING';

  return (
    <div className={cn('card p-4', isOverdue && 'border-danger shadow-danger/20', isWarning && !isOverdue && 'border-warning')}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">Meja {order.table?.table_number || '-'}</h3>
          <p className="text-sm text-text-secondary">{order.payment_method}</p>
        </div>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>

      {isProcessing && order.estimated_ready_at && (
        <div className={cn('flex items-center gap-2 mb-3 p-2 rounded-lg', isOverdue ? 'bg-danger/10' : isWarning ? 'bg-warning/10' : 'bg-surface-3')}>
          <Clock className={cn('w-4 h-4', isOverdue ? 'text-danger' : isWarning ? 'text-warning' : 'text-success')} />
          <span className={cn('text-sm font-mono font-bold', isOverdue ? 'text-danger' : isWarning ? 'text-warning' : 'text-success')}>
            {isOverdue ? "OVERDUE -" + etaFormatted : etaFormatted}
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
          <span className="font-bold text-primary">{formatCurrency(order.total_amount)}</span>
          <div className="flex gap-2 flex-wrap">
            {onCancel && (order.status === 'PENDING_CASH' || order.status === 'PENDING_PAYMENT' || order.status === 'CONFIRMED') && (
              <Button variant="danger" size="sm" onClick={onCancel}>Cancel</Button>
            )}
            {onConfirmCash && order.status === 'PENDING_CASH' && <Button variant="success" size="sm" onClick={onConfirmCash}>Konfirmasi Cash</Button>}
            {onConfirmPayment && order.status === 'PENDING_PAYMENT' && <Button variant="primary" size="sm" onClick={onConfirmPayment}>Konfirmasi Bayar</Button>}
          </div>
        </div>

        {showEtaSelector && order.status === 'CONFIRMED' && onSetEta && (
          <div className="flex items-center gap-2 mt-2">
            <select defaultValue={etaMinutes || 10} onChange={e => onSetEta(parseInt(e.target.value))} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-surface">
              <option value={5}>5 menit</option>
              <option value={10}>10 menit</option>
              <option value={15}>15 menit</option>
              <option value={20}>20 menit</option>
              <option value={25}>25 menit</option>
              <option value={30}>30 menit</option>
            </select>
            <Button variant="primary" size="sm" onClick={onStartProcess}>Mulai Proses</Button>
          </div>
        )}

        {isProcessing && onUpdateEta && (
          <div className="flex items-center gap-2 mt-2">
            <select defaultValue={5} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-surface">
              <option value={5}>+5 menit</option>
              <option value={10}>+10 menit</option>
              <option value={15}>+15 menit</option>
            </select>
            <Button variant="secondary" size="sm" onClick={() => onUpdateEta(5)}>Update</Button>
          </div>
        )}

        {onServed && order.status === 'PROCESSING' && (
          <Button variant="success" size="sm" className="w-full mt-2" onClick={onServed}>Sudah Diantar</Button>
        )}
      </div>
    </div>
  );
}

