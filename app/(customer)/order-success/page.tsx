'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle, MapPin, ArrowLeft, Wallet, Loader2, XCircle, Receipt, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface TrackedOrder {
  id: string;
  status: string;
  payment_method: 'CASH' | 'QRIS';
  payment_status: 'PAID' | 'UNPAID';
  cancel_reason: string | null;
  total_amount: number;
  table?: { table_number: number; label: string | null } | null;
}

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const tableId = searchParams.get('tableId');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const trackHref = tableId
    ? '/order-tracking?tableId=' + tableId
    : orderId ? '/order-tracking?orderId=' + orderId : null;

  // Hanya mengambil data — penulisan state dilakukan pemanggilnya, supaya tidak
  // ada setState sinkron di dalam effect.
  const fetchOrder = useCallback(async (): Promise<TrackedOrder | null> => {
    if (!orderId) return null;
    try {
      const res = await fetch('/api/orders/' + orderId + '/track', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch { /* biarkan, akan dicoba lagi di polling berikutnya */ }
    return null;
  }, [orderId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetchOrder();
      if (!active) return;
      if (data) setOrder(data);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [fetchOrder]);

  // Pesanan tunai belum lunas sampai kasir memverifikasi pembayarannya, jadi
  // halaman ini terus memantau sampai statusnya berubah.
  const waitingCashier = order?.payment_method === 'CASH' && order?.payment_status === 'UNPAID' && order?.status !== 'CANCELLED';

  useEffect(() => {
    if (!waitingCashier) return;
    let active = true;
    const id = setInterval(async () => {
      const data = await fetchOrder();
      if (active && data) setOrder(data);
    }, 3000);
    return () => { active = false; clearInterval(id); };
  }, [waitingCashier, fetchOrder]);

  const header = (
    <header className="sticky top-0 z-20 bg-brown-900 text-on-dark shadow-sm">
      <div className="max-w-md mx-auto h-14 px-4 flex items-center gap-3">
        <Link href="/order" aria-label="Kembali ke menu"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-base font-semibold uppercase tracking-wide">Rumipang</h1>
        <ThemeToggle className="ml-auto" />
      </div>
    </header>
  );

  const actions = (
    <motion.div
      className="flex flex-col gap-3 w-full"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
    >
      {trackHref && (
        <Link href={trackHref} className="w-full">
          <Button variant="primary" size="lg" className="w-full"><MapPin className="w-4 h-4 mr-2" />Lacak Pesanan</Button>
        </Link>
      )}
      <Link href="/order" className="w-full">
        <Button variant="secondary" size="lg" className="w-full">Kembali ke Menu</Button>
      </Link>
    </motion.div>
  );

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-surface-2">
      {header}
      <div className="flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
        {children}
      </div>
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 className="w-8 h-8 text-ember-ink animate-spin" />
        <p className="text-text-secondary text-sm">Memuat status pesanan...</p>
      </div>,
    );
  }

  if (order?.status === 'CANCELLED') {
    return shell(
      <>
        <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center mb-6">
          <XCircle className="w-12 h-12 text-danger" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Pesanan Dibatalkan</h1>
        <p className="text-text-secondary mb-6">
          {order.cancel_reason || 'Pesanan ini dibatalkan oleh kasir.'}
        </p>
        {actions}
      </>,
    );
  }

  // ---- Tunai: belum lunas, menunggu kasir memverifikasi ----
  if (waitingCashier) {
    return shell(
      <>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14 }}
        >
          <div className="relative w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mb-6 mx-auto">
            <Wallet className="w-10 h-10 text-warning" />
            <span className="absolute inset-0 rounded-full border-2 border-warning/40 animate-ping" />
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold mb-2">Menunggu Pembayaran</h1>
        <p className="text-text-secondary mb-5">
          Pesanan sudah dikirim ke dapur. Silakan <strong className="text-text">bayar di kasir</strong> —
          status akan berubah otomatis setelah kasir memverifikasi.
        </p>

        <div className="card w-full p-4 mb-5 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-secondary">Total yang harus dibayar</span>
            <span className="text-lg font-bold text-ember-ink">{formatCurrency(order.total_amount)}</span>
          </div>
          {order.table && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Meja</span>
              <span className="font-semibold">{order.table.label || 'Meja ' + order.table.table_number}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-text-secondary mb-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Menunggu konfirmasi kasir...</span>
        </div>

        {actions}
      </>,
    );
  }

  // ---- Lunas (QRIS otomatis, atau tunai setelah kasir verifikasi) ----
  const paid = order?.payment_status === 'PAID';

  return shell(
    <>
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
      >
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6 mx-auto">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h1 className="text-2xl font-bold mb-2">
          {paid ? 'Pembayaran Berhasil!' : 'Pesanan Berhasil!'}
        </h1>
        <p className="text-text-secondary mb-4">
          Pesanan Anda sedang diproses. Silakan tunggu di meja.
        </p>
      </motion.div>

      {/* Ekspektasi waktu tunggu, diminta warung: pelanggan yang sudah membayar
          duluan (QRIS) paling sering bertanya ke kasir "pesanan saya mana",
          dan yang ditanya sedang sibuk memasak. */}
      <motion.div
        className="w-full rounded-xl border border-gold-500/40 bg-gold-soft px-4 py-3 mb-6 flex items-start gap-2.5 text-left"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
      >
        <Clock className="w-5 h-5 shrink-0 mt-0.5 text-warning" />
        <p className="text-sm leading-relaxed text-text">
          Mohon tunggu sekitar <strong>10–20 menit</strong>. Pesanan diantar ke
          meja Anda begitu siap.
        </p>
      </motion.div>

      {paid && (
        <motion.div
          className="flex items-center justify-center gap-2 text-sm text-success mb-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        >
          <Receipt className="w-4 h-4" />
          <span>Struk sedang dicetak</span>
        </motion.div>
      )}

      {actions}
    </>,
  );
}
