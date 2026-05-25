'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMenu } from '@/hooks/useMenu';
import { useCart } from '@/context/CartContext';
import { MenuItem, MenuVariation, VariationSelection } from '@/types';
import { MenuItemCard } from '@/components/menu/MenuItemCard';
import { MenuItemSheet } from '@/components/menu/MenuItemSheet';
import { CategoryPills } from '@/components/menu/CategoryPills';
import { CartFAB } from '@/components/cart/CartFAB';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function OrderPage() {
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get('table');
  const { menuItems, categories, loading } = useMenu();
  const { setTableNumber, addItem, totalItems } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [variations, setVariations] = useState<MenuVariation[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (tableNumber) setTableNumber(parseInt(tableNumber));
  }, [tableNumber, setTableNumber]);

  useEffect(() => {
    if (!selectedItem) return;
    const fetchVariations = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('menu_variations').select('*').eq('menu_item_id', selectedItem.id);
      setVariations((data as MenuVariation[]) || []);
    };
    fetchVariations();
  }, [selectedItem]);

  const filteredItems = menuItems.filter(item => {
    const matchCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleAddToCart = (item: MenuItem, quantity: number, selectedVariations: VariationSelection[], notes: string) => {
    addItem(item, quantity, selectedVariations, notes);
    toast.success('Ditambahkan ke keranjang', { description: item.name });
  };

  return (
    <div className="min-h-screen bg-surface-2 pb-24">
      <header className="glass sticky top-0 z-10 border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-primary">Warkop QR</h1>
            {tableNumber && <p className="text-sm text-text-secondary">Meja {tableNumber}</p>}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input type="text" placeholder="Cari menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg bg-surface" />
        </div>
      </header>
      <div className="px-4 py-3">
        <CategoryPills categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      </div>
      {loading ? (
        <div className="px-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border overflow-hidden">
              <Skeleton variant="rectangular" height="160px" />
              <div className="p-4 space-y-2">
                <Skeleton width="80%" />
                <Skeleton width="60%" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton width="40%" />
                  <Skeleton width="20%" height="32px" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {filteredItems.map(item => (
            <MenuItemCard key={item.id} item={item} onAddToCart={() => setSelectedItem(item)} />
          ))}
        </div>
      )}
      {!loading && filteredItems.length === 0 && <EmptyState title="Menu tidak ditemukan" description="Coba kata kunci lain" />}
      <MenuItemSheet item={selectedItem} variations={variations} onClose={() => setSelectedItem(null)} onAdd={handleAddToCart} />
      <CartFAB onClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
