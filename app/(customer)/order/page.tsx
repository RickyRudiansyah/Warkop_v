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
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function OrderPage() {
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get('table');
  const { menuItems, categories, loading } = useMenu();
  const { setTableNumber, addItem } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [variations, setVariations] = useState<MenuVariation[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (tableNumber) {
      const num = parseInt(tableNumber);
      if (!isNaN(num)) setTableNumber(num);
    }
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
          <ThemeToggle />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input type="text" placeholder="Cari menu..." aria-label="Cari menu" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg bg-surface" />
        </div>
      </header>
      <div className="px-4 py-3">
        <CategoryPills categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      </div>
      {loading ? (
        <div className="px-4 grid grid-cols-2 gap-3" aria-live="polite">
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
        <motion.div className="px-4 grid grid-cols-2 gap-3" aria-live="polite" variants={container} initial="hidden" animate="show" key={selectedCategory + '-' + searchQuery}>
          {filteredItems.map(item => (
            <motion.div key={item.id} variants={itemAnim}>
              <MenuItemCard item={item} onAddToCart={() => setSelectedItem(item)} />
            </motion.div>
          ))}
        </motion.div>
      )}
      {!loading && filteredItems.length === 0 && <EmptyState title="Menu tidak ditemukan" description="Coba kata kunci lain" />}
      <MenuItemSheet item={selectedItem} variations={variations} onClose={() => setSelectedItem(null)} onAdd={handleAddToCart} />
      <CartFAB onClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
