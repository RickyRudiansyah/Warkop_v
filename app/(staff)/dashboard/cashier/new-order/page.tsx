'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMenu } from '@/hooks/useMenu';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { PaymentMethod } from '@/types';
import { Plus, Minus, Trash2 } from 'lucide-react';
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
  const { menuItems } = useMenu();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const router = useRouter();

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

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: null, payment_method: paymentMethod, total_amount: total, notes: 'Manual order', items: cart }),
      });
      if (res.ok) {
        toast.success('Order manual berhasil dibuat');
        router.push('/dashboard/cashier');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal membuat order');
      }
    } catch { toast.error('Gagal menghubungi server'); }
  };

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold mb-4">Order Manual</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-medium">Pilih Menu</h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {menuItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 card">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-text-secondary">{formatCurrency(item.price)}</p>
                </div>
                <Button size="sm" onClick={() => addToCart(item.id)}><Plus className="w-4 h-4" /></Button>
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
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
                <div className="space-y-2 mb-3">
                  {(['CASH', 'QRIS', 'TRANSFER_BCA'] as PaymentMethod[]).map(m => (
                    <label key={m} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-surface-3">
                      <input type="radio" name="payment" checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
                      <span>{m === 'CASH' ? 'Cash' : m === 'QRIS' ? 'QRIS' : 'Transfer BCA'}</span>
                    </label>
                  ))}
                </div>
                <Button size="lg" className="w-full" onClick={handleSubmit}>Submit Order</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
