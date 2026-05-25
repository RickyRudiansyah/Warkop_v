'use client';

import { MenuItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShoppingCart, AlertCircle } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
          <span className="text-4xl">🍽️</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900">{item.name}</h3>
          {item.is_sold_out && <Badge variant="danger">Sold Out</Badge>}
        </div>
        {item.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.description}</p>}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-blue-600">{formatCurrency(item.price)}</span>
          <Button
            size="sm"
            variant="primary"
            disabled={item.is_sold_out || !item.is_available}
            onClick={() => onAddToCart(item)}
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            Tambah
          </Button>
        </div>
      </div>
    </div>
  );
}
