'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { VariationManager } from '@/components/dashboard/VariationManager';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, tableLabel } from '@/lib/utils';
import { MenuItem as MenuItemType, Order } from '@/types';
import { TrendingUp, DollarSign, ShoppingCart, AlertTriangle, List, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type TimeFilter = 'today' | '7days' | 'all';

/**
 * Rekap yang sudah dihitung server (`/api/reports/summary`).
 *
 * Dulu halaman ini menarik seluruh order beserta itemnya (775 KB untuk 7 hari)
 * lalu menghitungnya sendiri di browser. Balasan ini ~2 KB, dan rumus omzetnya
 * hidup di satu tempat saja — sama dengan yang dipakai aplikasi kasir.
 */
interface ReportSummary {
  revenue: number;
  refunded: number;
  orders: number;
  cancelled: number;
  avg_order: number;
  cancel_rate: number;
  top_menu: { name: string; count: number; revenue: number }[];
  recent: Order[];
}

const EMPTY_SUMMARY: ReportSummary = {
  revenue: 0, refunded: 0, orders: 0, cancelled: 0,
  avg_order: 0, cancel_rate: 0, top_menu: [], recent: [],
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Antri',
  PROCESSING: 'Diproses',
  SERVED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export default function OwnerPage() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [summary, setSummary] = useState<ReportSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [variationMenuId, setVariationMenuId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  // Tanggal tertentu (YYYY-MM-DD). Kalau diisi, ia MENIMPA timeFilter.
  //
  // Preset menjawab "hari ini dapat berapa", tapi tidak menjawab "tanggal 12
  // kemarin ramai tidak?" - dan itu pertanyaan pemilik yang wajar. Pola yang
  // sama dipakai di layar Riwayat, Laporan, dan Riwayat Jatah aplikasi kasir.
  const [day, setDay] = useState<string>('');
  const [resetting, setResetting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'reset-all' }>({ open: false, type: 'reset-all' });

  const fetchData = useCallback(() => {
    setLoading(true);

    // Batas hari dihitung DI SINI, dari jam browser. Tengah malam di warung
    // adalah tengah malam WIB; kalau server yang memotong, batasnya jatuh
    // pukul 07.00 pagi, tepat di tengah hari kerja.
    //
    // `new Date('2026-08-12')` dibaca sebagai UTC dan meleset sehari di WIB,
    // jadi stringnya dipecah manual.
    const now = new Date();
    const picked = day ? day.split('-').map(Number) : null;
    const since = picked
      ? new Date(picked[0], picked[1] - 1, picked[2])
      : timeFilter === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : timeFilter === '7days' ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      : null;
    const until = picked ? new Date(picked[0], picked[1] - 1, picked[2] + 1) : null;

    const qs = '/api/reports/summary'
      + (since || until ? '?' : '')
      + [
          since ? 'from=' + encodeURIComponent(since.toISOString()) : '',
          until ? 'to=' + encodeURIComponent(until.toISOString()) : '',
        ].filter(Boolean).join('&');

    Promise.all([
      fetch('/api/menu').then(r => r.json()),
      fetch(qs).then(r => r.json()),
    ]).then(([menu, rekap]) => {
      setMenuItems(Array.isArray(menu) ? menu : []);
      setSummary(rekap && typeof rekap.revenue === 'number' ? rekap : EMPTY_SUMMARY);
      setLoading(false);
    }).catch(() => {
      setMenuItems([]);
      setSummary(EMPTY_SUMMARY);
      setLoading(false);
    });
  }, [timeFilter, day]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Semua angka di bawah datang dari server. Tidak ada lagi penyaringan atau
  // penjumlahan di browser — itulah yang dulu menuntut seluruh order beserta
  // itemnya ikut diunduh.
  const totalRefunded = summary.refunded;
  const totalRevenue = summary.revenue;
  const totalOrders = summary.orders;
  const avgOrder = summary.avg_order;
  const cancelCount = summary.cancelled;
  const cancelRate = summary.cancel_rate;
  const topMenu = summary.top_menu;
  const recentOrders = summary.recent;

  const handleResetData = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/orders/reset', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Semua data berhasil direset');
        setSummary(EMPTY_SUMMARY);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal mereset data');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setResetting(false);
    setConfirmModal({ open: false, type: 'reset-all' });
  };

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  const available = menuItems.filter(i => i.is_available && !i.is_sold_out).length;
  const soldOut = menuItems.filter(i => i.is_sold_out).length;

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold mb-4">Owner Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1"><DollarSign className="w-4 h-4" /> Pendapatan</div>
          <p className="text-xl font-bold text-text">{formatCurrency(totalRevenue)}</p>
          {totalRefunded > 0 && (
            <p className="text-xs text-danger mt-1">sudah dipotong refund {formatCurrency(totalRefunded)}</p>
          )}
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1"><ShoppingCart className="w-4 h-4" /> Total Order</div>
          <p className="text-xl font-bold">{totalOrders}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1"><TrendingUp className="w-4 h-4" /> Rata-rata</div>
          <p className="text-xl font-bold">{formatCurrency(avgOrder)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1"><AlertTriangle className="w-4 h-4" /> Cancel Rate</div>
          <p className="text-xl font-bold text-danger">{cancelRate}%</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-text" /> Top Menu Terlaris</h3>
          {topMenu.length === 0 ? (
            <p className="text-text-secondary text-sm">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {topMenu.slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : (i + 1) + '.'}</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold">{item.count}x</span>
                    <p className="text-xs text-text-secondary">{formatCurrency(item.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3">Order Terbaru</h3>
          {recentOrders.length === 0 ? (
            <p className="text-text-secondary text-sm">Belum ada order</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{tableLabel(order.table)}</span>
                    <p className="text-xs text-text-secondary">{new Date(order.created_at).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{formatCurrency(order.total_amount)}</span>
                    <Badge variant={order.status === 'SERVED' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'info'} className="ml-2">{STATUS_LABELS[order.status] || order.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Rekap Penjualan</h3>
          <div className="flex gap-2">
            {(['today', '7days', 'all'] as TimeFilter[]).map(f => (
              <button
                key={f}
                // Memilih preset melepaskan tanggal tertentu. Kalau tidak, chip
                // terlihat aktif tapi tidak mengubah apa pun.
                onClick={() => { setDay(''); setTimeFilter(f); }}
                className={'px-3 py-1 rounded-lg text-sm font-medium ' + (!day && timeFilter === f ? 'bg-primary text-[color:var(--color-on-primary)]' : 'bg-surface-3 text-text-secondary')}
              >
                {f === 'today' ? 'Hari Ini' : f === '7days' ? '7 Hari' : 'Semua'}
              </button>
            ))}
            <input
              type="date"
              value={day}
              max={new Date().toLocaleDateString('sv-SE')}
              onChange={e => setDay(e.target.value)}
              aria-label="Lihat rekap tanggal tertentu"
              className={'px-3 py-1 rounded-lg text-sm font-medium border border-border bg-surface ' + (day ? 'text-text font-bold' : 'text-text-secondary')}
            />
            {day && (
              <button
                onClick={() => setDay('')}
                aria-label="Lepas tanggal"
                className="px-2 py-1 rounded-lg text-sm bg-surface-3 text-text-secondary"
              >
                &times;
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-sm text-text-secondary">Pendapatan</p><p className="text-lg font-bold text-text">{formatCurrency(totalRevenue)}</p></div>
          <div><p className="text-sm text-text-secondary">Order</p><p className="text-lg font-bold">{totalOrders}</p></div>
          <div><p className="text-sm text-text-secondary">Dibatalkan</p><p className="text-lg font-bold text-danger">{cancelCount}</p></div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button variant="danger" size="sm" onClick={() => setConfirmModal({ open: true, type: 'reset-all' })} disabled={resetting} loading={resetting}>
            <Trash2 className="w-4 h-4 mr-1" />Reset Semua Data
          </Button>
          <p className="text-xs text-text-secondary mt-1">Hapus semua order & activity log. Menu, meja, dan staff tetap aman.</p>
        </div>
      </div>

      <div className="card p-4">
        {/*
          Tambah/ubah/hapus menu dipindah sepenuhnya ke aplikasi kasir. Yang
          tersisa di sini hanya daftar baca-saja + pengelolaan VARIASI, karena
          aplikasi belum punya fitur variasi dan menu ini punya ratusan variasi
          (Extra Topping, Level Pedas, Porsi, Rasa, Suhu).
        */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">Variasi Menu</h3>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Tambah, ubah harga, dan hapus menu dilakukan lewat aplikasi kasir.
          Halaman ini untuk mengelola variasi tiap menu.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-3 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">Nama</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Harga</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map(item => (
                <React.Fragment key={item.id}>
                <tr className="border-b last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-3">{item.is_sold_out ? <Badge variant="danger">Sold Out</Badge> : <Badge variant="success">Tersedia</Badge>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant={variationMenuId === item.id ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setVariationMenuId(variationMenuId === item.id ? null : item.id)}
                      >
                        <List className="w-4 h-4 mr-1" />Variasi
                      </Button>
                    </div>
                  </td>
                </tr>
                {variationMenuId === item.id && (
                  <tr key={'var-' + item.id}>
                    <td colSpan={4} className="px-4 py-0">
                      <VariationManager menuItemId={item.id} menuName={item.name} onClose={() => setVariationMenuId(null)} />
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div><p className="text-sm text-text-secondary">Total Menu</p><p className="text-lg font-bold">{menuItems.length}</p></div>
          <div><p className="text-sm text-text-secondary">Tersedia</p><p className="text-lg font-bold text-success">{available}</p></div>
          <div><p className="text-sm text-text-secondary">Sold Out</p><p className="text-lg font-bold text-danger">{soldOut}</p></div>
        </div>
      </div>

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmModal({ open: false, type: 'reset-all' })} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
            <h3 id="confirm-dialog-title" className="text-lg font-bold mb-2">Reset Semua Data?</h3>
            <p className="text-sm text-text-secondary mb-4">
              Semua order (aktif &amp; riwayat) dan activity log akan dihapus permanen.
              Menu, meja, kategori, dan staff tetap aman. Tindakan ini TIDAK BISA dibatalkan!
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setConfirmModal({ open: false, type: 'reset-all' })}>Batal</Button>
              <Button variant="danger" onClick={handleResetData} loading={resetting} disabled={resetting}>
                Reset Semua
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
