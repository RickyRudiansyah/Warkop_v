'use client';

import { Order, OrderStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, getElapsedMinutes } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger' | 'info' }> = {
  PENDING_CASH: { label: 'Menunggu Bayar', variant: 'warning' },
  PAID: { label: 'Sudah Dibayar', variant: 'success' },
  PROCESSING: { label: 'Diproses', variant: 'info' },
  SERVED: { label: 'Sudah Diantar', variant: 'success' },
  CANCELLED: { label: 'Dibatalkan', variant: 'danger' },
};

interface OrderCardProps {
  order: Order;
  onConfirmCash?: () => void;
  onMarkPaid?: () => void;
  onMarkServed?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;
  isLoading?: boolean;
}

export function OrderCard({ order, onConfirmCash, onMarkPaid, onMarkServed, onCancel, onPrint, isLoading }: OrderCardProps) {
  const elapsed = getElapsedMinutes(order.created_at);
  const config = statusConfig[order.status] || { label: order.status, variant: 'default' as const };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="card p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">Meja {order.table?.table_number || '-'}</h3>
          <p className="text-sm text-text-secondary">{order.payment_method} {order.payment_status === 'PAID' && '- LUNAS'}</p>
        </div>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>

      <div className="flex items-center gap-2 text-sm text-text-secondary mb-3">
        <Clock className="w-4 h-4" />
        <span>{elapsed} menit lalu</span>
      </div>

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
            {onCancel && (order.status === 'PENDING_CASH' || order.status === 'PAID') && (
              <Button variant="danger" size="sm" onClick={onCancel} aria-label="Batalkan pesanan">Cancel</Button>
            )}
            {onConfirmCash && order.status === 'PENDING_CASH' && (
              <Button variant="success" size="sm" onClick={onConfirmCash} disabled={isLoading} loading={isLoading}>Konfirmasi Cash</Button>
            )}
            {onMarkPaid && order.status === 'PENDING_CASH' && (
              <Button variant="primary" size="sm" onClick={onMarkPaid} disabled={isLoading} loading={isLoading}>Tandai Lunas</Button>
            )}
            {onMarkServed && (order.status === 'PAID' || order.status === 'PROCESSING') && (
              <Button variant="success" size="sm" onClick={onMarkServed} disabled={isLoading} loading={isLoading}>Sudah Diantar</Button>
            )}
            {onPrint && (order.status === 'PAID' || order.status === 'PROCESSING') && (
              <Button variant="ghost" size="sm" onClick={onPrint} disabled={isLoading}>Cetak Ulang</Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
