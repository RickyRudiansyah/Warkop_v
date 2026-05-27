'use client';

import { MenuItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShoppingCart, Utensils } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-[4/3]">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
            <Utensils className="w-12 h-12 text-primary/25" />
          </div>
        )}
        {item.is_sold_out && (
          <div className="absolute top-2 right-2">
            <Badge variant="danger">Sold Out</Badge>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
        {item.description && <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{item.description}</p>}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-base font-bold text-primary">{formatCurrency(item.price)}</span>
          <Button size="sm" variant="primary" disabled={item.is_sold_out || !item.is_available} onClick={() => onAddToCart(item)} aria-label={'Tambah ' + item.name}>
            <ShoppingCart className="w-3.5 h-3.5 mr-1" />+
          </Button>
        </div>
      </div>
    </div>
  );
}
