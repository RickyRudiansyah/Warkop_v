'use client';

import { useState, useEffect } from 'react';
import { useMenu } from '@/hooks/useMenu';
import { useCart } from '@/context/CartContext';
import { MenuItem, MenuVariation, VariationSelection } from '@/types';
import { MenuItemCard } from '@/components/menu/MenuItemCard';
import { MenuItemSheet } from '@/components/menu/MenuItemSheet';
import { CategoryPills } from '@/components/menu/CategoryPills';
import { CartFAB } from '@/components/cart/CartFAB';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Footer } from '@/components/ui/Footer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Search, MapPin, MapPinOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useLocationCheck } from '@/hooks/useLocationCheck';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function OrderPage() {
  const { menuItems, categories, loading, error, refetch } = useMenu();
  const { addItem } = useCart();
  const { status: locationStatus, distance, retry } = useLocationCheck();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [variations, setVariations] = useState<MenuVariation[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

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

  // Yellow brand header (design §5.1). `withSearch` adds the search bar (§5.2).
  const header = (withSearch: boolean) => (
    <header className="sticky top-0 z-20 bg-primary text-[color:var(--color-on-primary)] shadow-sm">
      <div className="px-4 pt-3 pb-3 max-w-md mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">Dine-in</p>
            <h1 className="text-xl font-extrabold leading-tight">Rumipang</h1>
          </div>
          <ThemeToggle />
        </div>
        {withSearch && (
          <div className="relative mt-3">
            <input
              type="text"
              placeholder="Cari menu..."
              aria-label="Cari menu"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-full bg-white text-[#1A1A1A] pl-4 pr-12 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-black/10 placeholder:text-[#8A8A8A]"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Search className="w-4 h-4 text-[color:var(--color-on-primary)]" />
            </div>
          </div>
        )}
      </div>
    </header>
  );

  if (locationStatus === 'checking') {
    return (
      <div className="min-h-screen bg-surface-2 flex flex-col">
        {header(false)}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-10 h-10 border-4 border-primary/40 border-t-primary rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Memeriksa lokasi Anda...</p>
        </div>
      </div>
    );
  }

  if (locationStatus === 'denied' || locationStatus === 'unavailable') {
    return (
      <div className="min-h-screen bg-surface-2 flex flex-col">
        {header(false)}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
            <MapPinOff className="w-8 h-8 text-danger" />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-1">Akses Lokasi Diperlukan</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {locationStatus === 'unavailable'
                ? 'Browser kamu tidak mendukung lokasi. Gunakan browser yang mendukung GPS.'
                : 'Izinkan akses lokasi di browser kamu, lalu tekan tombol di bawah.'}
            </p>
          </div>
          <Button variant="primary" onClick={retry}>Coba Lagi</Button>
        </div>
      </div>
    );
  }

  if (locationStatus === 'far') {
    return (
      <div className="min-h-screen bg-surface-2 flex flex-col">
        {header(false)}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-1">Kamu Terlalu Jauh dari Café</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {distance !== null && `Jarak kamu saat ini: ${distance > 999 ? (distance / 1000).toFixed(1) + ' km' : distance + ' m'} dari café.`}
              {' '}Silakan datang ke café untuk memesan.
            </p>
          </div>
          <Button variant="secondary" onClick={retry}>Perbarui Lokasi</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2 pb-28">
      {header(true)}

      <div className="max-w-md mx-auto px-4 pt-3">
        <CategoryPills categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        {loading ? (
          <div className="space-y-3" aria-live="polite">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-3 flex gap-3">
                <Skeleton variant="rectangular" width="96px" height="96px" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton width="70%" />
                  <Skeleton width="90%" />
                  <div className="flex justify-between items-center pt-3">
                    <Skeleton width="35%" />
                    <Skeleton variant="circular" width="36px" height="36px" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-text-secondary text-center text-sm">{error}</p>
            <Button variant="primary" onClick={refetch}>Coba Lagi</Button>
          </div>
        ) : (
          <motion.div className="space-y-3" aria-live="polite" variants={container} initial="hidden" animate="show" key={selectedCategory + '-' + searchQuery}>
            {filteredItems.map(item => (
              <motion.div key={item.id} variants={itemAnim}>
                <MenuItemCard item={item} onAddToCart={() => setSelectedItem(item)} />
              </motion.div>
            ))}
          </motion.div>
        )}
        {!loading && filteredItems.length === 0 && <EmptyState title="Menu tidak ditemukan" description="Coba kata kunci lain" />}
      </div>

      <div className="mt-10">
        <Footer />
      </div>

      <MenuItemSheet item={selectedItem} variations={variations} onClose={() => setSelectedItem(null)} onAdd={handleAddToCart} />
      <CartFAB onClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
