'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMenu } from '@/hooks/useMenu';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { cn, formatCurrency, TAKE_AWAY_LABEL } from '@/lib/utils';
import { PaymentMethod, Table } from '@/types';
import { Plus, Minus, Trash2, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  menu_item_id: string;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  variations: never[];
  subtotal: number;
  notes: string | null;
}

export default function NewOrderPage() {
  const { menuItems, categories, loading: menuLoading, refetch } = useMenu();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [tables, setTables] = useState<Table[]>([]);
  const [tableId, setTableId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/tables')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setTables(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const addToCart = (itemId: string) => {
    const item = menuItems.find(m => m.id === itemId);
    if (!item) return;
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === itemId);
      if (existing) {
        return prev.map(c => c.menu_item_id === itemId ? { ...c, quantity: c.quantity + 1, subtotal: c.menu_item_price * (c.quantity + 1) } : c);
      }
      return [...prev, { menu_item_id: item.id, menu_item_name: item.name, menu_item_price: item.price, quantity: 1, variations: [], subtotal: item.price, notes: null }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(c => c.menu_item_id === itemId ? { ...c, quantity: Math.max(1, c.quantity + delta), subtotal: c.menu_item_price * Math.max(1, c.quantity + delta) } : c));
  };

  const removeItem = (itemId: string) => setCart(prev => prev.filter(c => c.menu_item_id !== itemId));

  const total = cart.reduce((sum, c) => sum + c.subtotal, 0);

  // Menu yang baru ditambahkan lewat dashboard owner tidak muncul di sini
  // sampai katalognya diambil ulang — `useMenu` hanya fetch saat mount.
  const visibleMenu = menuItems.filter(item => {
    if (categoryId && item.category_id !== categoryId) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return item.name.toLowerCase().includes(q)
      || (item.description ?? '').toLowerCase().includes(q);
  });

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId || null,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'QRIS' ? 'PAID' : 'UNPAID',
          total_amount: total,
          notes: 'Manual order',
          items: cart,
        }),
      });
      if (res.ok) {
        toast.success('Order manual berhasil dibuat');
        router.push('/dashboard/cashier');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal membuat order');
        setSubmitting(false);
      }
    } catch { toast.error('Gagal menghubungi server'); setSubmitting(false); }
  };

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold mb-4">Order Manual</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Pilih Menu</h3>
            <button
              onClick={refetch}
              disabled={menuLoading}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border text-text-secondary hover:bg-surface-3 disabled:opacity-50 transition-colors"
              aria-label="Muat ulang menu"
            >
              <RefreshCw className={cn('w-4 h-4', menuLoading && 'animate-spin')} />
              Muat Ulang
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari menu"
              aria-label="Cari menu"
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-surface text-text placeholder:text-text-secondary outline-none focus:border-ember-ink"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[{ id: null, name: 'Semua' }, ...categories].map(cat => {
                const active = categoryId === cat.id;
                return (
                  <button
                    key={cat.id ?? 'all'}
                    onClick={() => setCategoryId(active ? null : cat.id)}
                    className={cn(
                      'shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                      active
                        ? 'border-ember-ink bg-ember-soft text-ember-ink'
                        : 'border-border bg-surface text-text hover:bg-surface-3',
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {visibleMenu.length === 0 ? (
              <p className="text-text-secondary text-sm text-center py-8">
                {menuItems.length === 0
                  ? 'Menu kosong — tambahkan di dashboard owner, lalu tekan Muat Ulang.'
                  : 'Menu tidak ditemukan. Ubah kata kunci atau pilih kategori "Semua".'}
              </p>
            ) : visibleMenu.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 card">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-text-secondary">{formatCurrency(item.price)}</p>
                </div>
                <Button size="sm" onClick={() => addToCart(item.id)} aria-label={'Tambah ' + item.name}><Plus className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-medium">Keranjang</h3>
          {cart.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-8">Belum ada item</p>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.menu_item_id} className="flex items-center justify-between p-3 card">
                  <div>
                    <p className="font-medium">{item.menu_item_name}</p>
                    <p className="text-sm text-text-secondary">{item.quantity}x {formatCurrency(item.menu_item_price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.menu_item_id, -1)} className="p-1 border rounded-full"><Minus className="w-4 h-4" /></button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.menu_item_id, 1)} className="p-1 border rounded-full"><Plus className="w-4 h-4" /></button>
                    <button onClick={() => removeItem(item.menu_item_id)} className="p-1 text-danger"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              <div className="card p-4">
                <div className="flex justify-between font-bold text-lg mb-3">
                  <span>Total</span>
                  <span className="text-text">{formatCurrency(total)}</span>
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Meja</label>
                  <select value={tableId} onChange={e => setTableId(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-surface" aria-label="Pilih meja atau take away">
                    {/* Pesanan tanpa meja hampir selalu dibungkus. "Tanpa meja" saja
                        membuat kasir ragu apakah itu pilihan yang benar. */}
                    <option value="">{TAKE_AWAY_LABEL}</option>
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>{t.label || 'Meja ' + t.table_number}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 mb-3">
                  {(['CASH', 'QRIS'] as PaymentMethod[]).map(m => (
                    <label key={m} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-surface-3">
                      <input type="radio" name="payment" checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
                      <span>{m === 'CASH' ? 'Cash (Belum Bayar)' : 'QRIS (Lunas)'}</span>
                    </label>
                  ))}
                </div>
                <Button size="lg" className="w-full" onClick={handleSubmit} loading={submitting} disabled={submitting}>Submit Order</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
