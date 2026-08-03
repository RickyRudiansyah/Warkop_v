'use client';

import { useState, useEffect } from 'react';
import { useMenu } from '@/hooks/useMenu';
import { useCart } from '@/context/CartContext';
import { MenuItem, MenuVariation, VariationSelection } from '@/types';
import { MenuItemCard } from '@/components/menu/MenuItemCard';
import { MenuItemSheet } from '@/components/menu/MenuItemSheet';
import { CategoryPills } from '@/components/menu/CategoryPills';
import { TablePicker } from '@/components/order/TablePicker';
import { CartFAB } from '@/components/cart/CartFAB';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Footer } from '@/components/ui/Footer';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Search, MapPin, MapPinOff, Coffee } from 'lucide-react';
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
  const { addItem, items: cartItems, updateQuantity, removeItem } = useCart();
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

  const sectionTitle = searchQuery
    ? 'Hasil Pencarian'
    : categories.find(c => c.id === selectedCategory)?.name || 'Semua Menu';

  // Stepper di kartu bekerja pada entri keranjang pertama untuk menu tersebut.
  // Item dengan variasi selalu lewat detail sheet, jadi ambiguitas varian
  // hanya muncul kalau menu yang sama ditambahkan dua kali dengan varian beda.
  const cartQtyFor = (itemId: string) =>
    cartItems.filter(ci => ci.menu_item.id === itemId).reduce((sum, ci) => sum + ci.quantity, 0);
  const cartIndexFor = (itemId: string) => cartItems.findIndex(ci => ci.menu_item.id === itemId);

  const handleIncrement = (itemId: string) => {
    const i = cartIndexFor(itemId);
    if (i >= 0) updateQuantity(i, cartItems[i].quantity + 1);
  };

  const handleDecrement = (itemId: string) => {
    const i = cartIndexFor(itemId);
    if (i < 0) return;
    if (cartItems[i].quantity <= 1) removeItem(i);
    else updateQuantity(i, cartItems[i].quantity - 1);
  };

  const handleQuickAdd = (item: MenuItem) => {
    addItem(item, 1, [], '');
    toast.success('Ditambahkan ke keranjang', { description: item.name });
  };

  const handleAddToCart = (item: MenuItem, quantity: number, selectedVariations: VariationSelection[], notes: string) => {
    addItem(item, quantity, selectedVariations, notes);
    setSelectedItem(null);
    toast.success('Ditambahkan ke keranjang', { description: item.name });
  };

  // Header coklat gelap dengan table pill menonjol ke bawah (DESIGN.md §5.1).
  const header = (withSearch: boolean) => (
    <header className="sticky top-0 z-20 bg-brown-900 text-on-dark shadow-sm">
      <div className="max-w-md mx-auto px-4">
        <div className="h-14 flex items-center justify-between gap-3">
          <ThemeToggle />
          <TablePicker />
          <div className="w-10 h-10 rounded-full border-2 border-gold-500 bg-brown-800 flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5 text-gold-500" />
          </div>
        </div>

        {withSearch && (
          <div className="relative pb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 -mt-1.5 w-[18px] h-[18px] text-ember-600 pointer-events-none" />
            <input
              type="text"
              placeholder='Cari menu, mis. "Kopi Susu"...'
              aria-label="Cari menu"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-cream-50 border border-brown-200 text-brown-900 pl-10 pr-4 py-2.5 text-[15px] outline-none focus:border-ember-600 placeholder:text-[#8B7460]"
            />
          </div>
        )}
      </div>
    </header>
  );

  const gate = (icon: React.ReactNode, title: string, body: string, action: React.ReactNode) => (
    <div className="min-h-screen bg-surface-2 flex flex-col">
      {header(false)}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        {icon}
        <div>
          <h2 className="text-lg font-bold mb-1">{title}</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{body}</p>
        </div>
        {action}
      </div>
    </div>
  );

  if (locationStatus === 'checking') {
    return (
      <div className="min-h-screen bg-surface-2 flex flex-col">
        {header(false)}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-10 h-10 border-4 border-ember-600/30 border-t-ember-600 rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Memeriksa lokasi Anda...</p>
        </div>
      </div>
    );
  }

  if (locationStatus === 'denied' || locationStatus === 'unavailable') {
    return gate(
      <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
        <MapPinOff className="w-8 h-8 text-danger" />
      </div>,
      'Akses Lokasi Diperlukan',
      locationStatus === 'unavailable'
        ? 'Browser kamu tidak mendukung lokasi. Gunakan browser yang mendukung GPS.'
        : 'Izinkan akses lokasi di browser kamu, lalu tekan tombol di bawah.',
      <Button variant="primary" onClick={retry}>Coba Lagi</Button>,
    );
  }

  if (locationStatus === 'far') {
    return gate(
      <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
        <MapPin className="w-8 h-8 text-warning" />
      </div>,
      'Kamu Terlalu Jauh dari Café',
      (distance !== null ? `Jarak kamu saat ini: ${distance > 999 ? (distance / 1000).toFixed(1) + ' km' : distance + ' m'} dari café. ` : '') +
        'Silakan datang ke café untuk memesan.',
      <Button variant="secondary" onClick={retry}>Perbarui Lokasi</Button>,
    );
  }

  return (
    <div className="min-h-screen bg-surface-2 pb-24">
      {header(true)}

      <div className="max-w-md mx-auto px-4 pt-4">
        <CategoryPills categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        <h2 className="section-title text-[22px] mb-4">{sectionTitle}</h2>

        {loading ? (
          <div className="grid grid-cols-2 gap-3" aria-live="polite">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="aspect-square animate-shimmer" />
                <div className="p-3 space-y-2">
                  <div className="h-4 rounded animate-shimmer" />
                  <div className="h-4 w-1/2 rounded animate-shimmer" />
                  <div className="h-10 rounded-lg animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-text-secondary text-center text-sm">{error}</p>
            <Button variant="primary" onClick={refetch}>Coba Lagi</Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState title="Menu tidak ditemukan" description="Coba kata kunci atau kategori lain" />
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-3"
            aria-live="polite"
            variants={container}
            initial="hidden"
            animate="show"
            key={selectedCategory + '-' + searchQuery}
          >
            {filteredItems.map(item => (
              <motion.div key={item.id} variants={itemAnim}>
                <MenuItemCard
                  item={item}
                  quantityInCart={cartQtyFor(item.id)}
                  onOpenDetail={setSelectedItem}
                  onQuickAdd={handleQuickAdd}
                  onIncrement={() => handleIncrement(item.id)}
                  onDecrement={() => handleDecrement(item.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
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
