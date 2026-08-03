'use client';

import { MenuItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Plus, Utensils } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

// Horizontal product card (design §5.5 / §7): image left, name/desc/price, round yellow "+".
export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const disabled = item.is_sold_out || !item.is_available;

  return (
    <div className="card p-3 flex gap-3">
      <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-surface-3">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Utensils className="w-8 h-8 text-text-secondary/40" />
          </div>
        )}
        {item.is_sold_out && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="danger">Sold Out</Badge>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="font-semibold text-[15px] leading-snug text-text">{item.name}</h3>
        {item.description && (
          <p className="mt-0.5 text-[13px] text-text-secondary line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <span className="text-[15px] font-bold text-text">{formatCurrency(item.price)}</span>
          <button
            onClick={() => onAddToCart(item)}
            disabled={disabled}
            aria-label={'Tambah ' + item.name}
            title={item.name}
            className="shrink-0 w-9 h-9 rounded-full bg-primary text-[color:var(--color-on-primary)] flex items-center justify-center shadow-sm hover:bg-primary-dark active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
