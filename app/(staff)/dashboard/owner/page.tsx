'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils';
import { MenuItem as MenuItemType, Order } from '@/types';
import { Plus, Edit2, Save, X, ToggleRight, ToggleLeft, TrendingUp, DollarSign, ShoppingCart, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type TimeFilter = 'today' | '7days' | 'all';

export default function OwnerPage() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', price: '', description: '' });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');

  useEffect(() => {
    Promise.all([
      fetch('/api/menu').then(r => r.json()),
      fetch('/api/orders?history=1').then(r => r.json()),
    ]).then(([menu, orders]) => {
      setMenuItems(menu);
      setOrders(orders);
      setLoading(false);
    });
  }, []);

  const filteredOrders = orders.filter(o => {
    if (timeFilter === 'today') {
      const today = new Date();
      const orderDate = new Date(o.created_at);
      return orderDate.toDateString() === today.toDateString();
    }
    if (timeFilter === '7days') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(o.created_at) >= weekAgo;
    }
    return true;
  });

  const totalRevenue = filteredOrders.filter(o => o.status === 'SERVED').reduce((sum, o) => sum + o.total_amount, 0);
  const totalOrders = filteredOrders.length;
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const cancelCount = filteredOrders.filter(o => o.status === 'CANCELLED').length;
  const cancelRate = totalOrders > 0 ? Math.round((cancelCount / totalOrders) * 100) : 0;

  const topMenu: { name: string; count: number; revenue: number }[] = [];
  filteredOrders.filter(o => o.status === 'SERVED').forEach(o => {
    o.items?.forEach(item => {
      const existing = topMenu.find(t => t.name === item.menu_item_name);
      if (existing) {
        existing.count += item.quantity;
        existing.revenue += item.subtotal;
      } else {
        topMenu.push({ name: item.menu_item_name, count: item.quantity, revenue: item.subtotal });
      }
    });
  });
  topMenu.sort((a, b) => b.count - a.count);

  const toggleSoldOut = async (id: string) => {
    const res = await fetch('/api/menu/' + id + '/sold-out', { method: 'PATCH' });
    if (res.ok) {
      setMenuItems(prev => prev.map(item => item.id === id ? { ...item, is_sold_out: !item.is_sold_out } : item));
      toast.success('Status menu diperbarui');
    }
  };

  const handleAdd = async () => {
    if (!addForm.name || !addForm.price) return;
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addForm.name, price: parseInt(addForm.price), description: addForm.description || null }),
    });
    if (res.ok) {
      const newItem = await res.json();
      setMenuItems(prev => [...prev, newItem]);
      setShowAddForm(false);
      setAddForm({ name: '', price: '', description: '' });
      toast.success('Menu berhasil ditambahkan');
    }
  };

  const handleEdit = async () => {
    if (!editingItem || !editForm.name || !editForm.price) return;
    const res = await fetch('/api/menu/' + editingItem.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editForm.name, price: parseInt(editForm.price), description: editForm.description || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMenuItems(prev => prev.map(item => item.id === editingItem.id ? updated : item));
      setEditingItem(null);
      toast.success('Menu berhasil diperbarui');
    }
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
          <p className="text-xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
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
          <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Top Menu Terlaris</h3>
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
          {filteredOrders.length === 0 ? (
            <p className="text-text-secondary text-sm">Belum ada order</p>
          ) : (
            <div className="space-y-2">
              {filteredOrders.slice(0, 10).map(order => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">Meja {order.table?.table_number || '-'}</span>
                    <p className="text-xs text-text-secondary">{new Date(order.created_at).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{formatCurrency(order.total_amount)}</span>
                    <Badge variant={order.status === 'SERVED' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'info'} className="ml-2">{order.status}</Badge>
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
              <button key={f} onClick={() => setTimeFilter(f)} className={'px-3 py-1 rounded-lg text-sm font-medium ' + (timeFilter === f ? 'bg-primary text-white' : 'bg-surface-3 text-text-secondary')}>
                {f === 'today' ? 'Hari Ini' : f === '7days' ? '7 Hari' : 'Semua'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-sm text-text-secondary">Pendapatan</p><p className="text-lg font-bold text-primary">{formatCurrency(totalRevenue)}</p></div>
          <div><p className="text-sm text-text-secondary">Order</p><p className="text-lg font-bold">{totalOrders}</p></div>
          <div><p className="text-sm text-text-secondary">Dibatalkan</p><p className="text-lg font-bold text-danger">{cancelCount}</p></div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Kelola Menu</h3>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}><Plus className="w-4 h-4 mr-1" /> Tambah</Button>
        </div>

        {showAddForm && (
          <div className="bg-surface-2 p-4 rounded-lg mb-4 space-y-3">
            <input placeholder="Nama menu" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg bg-surface" />
            <input placeholder="Harga" type="number" value={addForm.price} onChange={e => setAddForm(p => ({ ...p, price: e.target.value }))} className="w-full px-3 py-2 border rounded-lg bg-surface" />
            <input placeholder="Deskripsi (opsional)" value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg bg-surface" />
            <div className="flex gap-2">
              <Button onClick={handleAdd}>Simpan</Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Batal</Button>
            </div>
          </div>
        )}

        {editingItem && (
          <div className="bg-surface-2 p-4 rounded-lg mb-4 space-y-3">
            <input placeholder="Nama menu" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg bg-surface" />
            <input placeholder="Harga" type="number" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} className="w-full px-3 py-2 border rounded-lg bg-surface" />
            <input placeholder="Deskripsi (opsional)" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg bg-surface" />
            <div className="flex gap-2">
              <Button onClick={handleEdit}><Save className="w-4 h-4 mr-1" /> Update</Button>
              <Button variant="ghost" onClick={() => setEditingItem(null)}><X className="w-4 h-4 mr-1" /> Batal</Button>
            </div>
          </div>
        )}

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
                <tr key={item.id} className="border-b last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-3">{item.is_sold_out ? <Badge variant="danger">Sold Out</Badge> : <Badge variant="success">Tersedia</Badge>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setEditForm({ name: item.name, price: String(item.price), description: item.description || '' }); }}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleSoldOut(item.id)}>
                        {item.is_sold_out ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
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
    </DashboardLayout>
  );
}
