'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { VariationManager } from '@/components/dashboard/VariationManager';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils';
import { MenuItem as MenuItemType, Order } from '@/types';
import { Plus, Edit2, Save, X, ToggleRight, ToggleLeft, TrendingUp, DollarSign, ShoppingCart, AlertTriangle, Image as ImageIcon, List, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type TimeFilter = 'today' | '7days' | 'all';

const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Antri',
  PROCESSING: 'Diproses',
  SERVED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export default function OwnerPage() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', description: '', image_url: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', price: '', description: '', image_url: '' });
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [uploadingAddImage, setUploadingAddImage] = useState(false);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [variationMenuId, setVariationMenuId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [deletingMenuId, setDeletingMenuId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'delete-menu' | 'reset-all'; menuId?: string; menuName?: string }>({ open: false, type: 'delete-menu' });

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/menu').then(r => r.json()),
      fetch('/api/orders?history=1').then(r => r.json()),
    ]).then(([menu, orders]) => {
      setMenuItems(Array.isArray(menu) ? menu : []);
      setOrders(Array.isArray(orders) ? orders : []);
      setLoading(false);
    }).catch(() => {
      setMenuItems([]);
      setOrders([]);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
      const err = await res.json();
      toast.error(err.error || 'Gagal upload gambar');
    } catch {
      toast.error('Gagal upload gambar');
    }
    return null;
  };

  const handleAddImage = async (file: File) => {
    setUploadingAddImage(true);
    const url = await uploadImage(file);
    if (url) {
      setAddForm(p => ({ ...p, image_url: url }));
    }
    setUploadingAddImage(false);
  };

  const handleEditImage = async (file: File) => {
    setUploadingEditImage(true);
    const url = await uploadImage(file);
    if (url) {
      setEditForm(p => ({ ...p, image_url: url }));
    }
    setUploadingEditImage(false);
  };

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
      body: JSON.stringify({ name: addForm.name, price: parseInt(addForm.price), description: addForm.description || null, image_url: addForm.image_url || null }),
    });
    if (res.ok) {
      const newItem = await res.json();
      setMenuItems(prev => [...prev, newItem]);
      setShowAddForm(false);
      setAddForm({ name: '', price: '', description: '', image_url: '' });
      setAddImagePreview(null);
      toast.success('Menu berhasil ditambahkan');
    }
  };

  const handleEdit = async () => {
    if (!editingItem || !editForm.name || !editForm.price) return;
    const res = await fetch('/api/menu/' + editingItem.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editForm.name, price: parseInt(editForm.price), description: editForm.description || null, image_url: editForm.image_url || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMenuItems(prev => prev.map(item => item.id === editingItem.id ? updated : item));
      setEditingItem(null);
      setEditImagePreview(null);
      toast.success('Menu berhasil diperbarui');
    }
  };

  const openDeleteMenuModal = (id: string, name: string) => {
    setConfirmModal({ open: true, type: 'delete-menu', menuId: id, menuName: name });
  };

  const handleDeleteMenu = async () => {
    if (!confirmModal.menuId) return;
    setDeletingMenuId(confirmModal.menuId);
    try {
      const res = await fetch('/api/menu/' + confirmModal.menuId, { method: 'DELETE' });
      if (res.ok) {
        setMenuItems(prev => prev.filter(item => item.id !== confirmModal.menuId));
        toast.success(confirmModal.menuName + ' berhasil dihapus');
      } else {
        toast.error('Gagal menghapus menu');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setDeletingMenuId(null);
    setConfirmModal({ open: false, type: 'delete-menu' });
  };

  const handleResetData = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/orders/reset', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Semua data berhasil direset');
        setOrders([]);
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
        <div className="mt-4 pt-4 border-t">
          <Button variant="danger" size="sm" onClick={() => setConfirmModal({ open: true, type: 'reset-all' })} disabled={resetting} loading={resetting}>
            <Trash2 className="w-4 h-4 mr-1" />Reset Semua Data
          </Button>
          <p className="text-xs text-text-secondary mt-1">Hapus semua order & activity log. Menu, meja, dan staff tetap aman.</p>
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
            <div>
              <label className="block text-sm font-medium mb-1">Gambar Menu</label>
              {addImagePreview ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                  <img src={addImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setAddImagePreview(null); setAddForm(p => ({ ...p, image_url: '' })); }}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                    aria-label="Hapus gambar"
                  ><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-surface-2">
                  {uploadingAddImage ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-text-secondary mb-1" />
                      <span className="text-sm text-text-secondary">Klik untuk upload gambar</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAddImagePreview(URL.createObjectURL(file));
                        handleAddImage(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>
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
            <div>
              <label className="block text-sm font-medium mb-1">Gambar Menu</label>
              {editImagePreview ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                  <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setEditImagePreview(null); setEditForm(p => ({ ...p, image_url: '' })); }}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                    aria-label="Hapus gambar"
                  ><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-surface-2">
                  {uploadingEditImage ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-text-secondary mb-1" />
                      <span className="text-sm text-text-secondary">Klik untuk upload gambar</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditImagePreview(URL.createObjectURL(file));
                        handleEditImage(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>
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
                <React.Fragment key={item.id}>
                <tr className="border-b last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-3">{item.is_sold_out ? <Badge variant="danger">Sold Out</Badge> : <Badge variant="success">Tersedia</Badge>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setVariationMenuId(variationMenuId === item.id ? null : item.id)} aria-label="Kelola variasi"><List className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setEditForm({ name: item.name, price: String(item.price), description: item.description || '', image_url: item.image_url || '' }); setEditImagePreview(item.image_url || null); }}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleSoldOut(item.id)}>
                        {item.is_sold_out ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteMenuModal(item.id, item.name)}
                        disabled={deletingMenuId === item.id}
                        aria-label={'Hapus ' + item.name}
                      >
                        {deletingMenuId === item.id ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4 text-danger" />}
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmModal({ open: false, type: 'delete-menu' })} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
            <h3 id="confirm-dialog-title" className="text-lg font-bold mb-2">
              {confirmModal.type === 'reset-all' ? 'Reset Semua Data?' : 'Hapus Menu?'}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {confirmModal.type === 'reset-all'
                ? 'Semua order (aktif & riwayat) dan activity log akan dihapus permanen. Menu, meja, kategori, dan staff tetap aman. Tindakan ini TIDAK BISA dibatalkan!'
                : `"${confirmModal.menuName}" akan dihapus permanen. Variasi akan ikut terhapus. Order lama tetap ada tapi tanpa nama menu. Lanjutkan?`}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setConfirmModal({ open: false, type: 'delete-menu' })}>Batal</Button>
              <Button variant="danger" onClick={confirmModal.type === 'reset-all' ? handleResetData : handleDeleteMenu}>
                {confirmModal.type === 'reset-all' ? 'Reset Semua' : 'Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
