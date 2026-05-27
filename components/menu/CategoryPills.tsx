'use client';

import { cn } from '@/lib/utils';
import { MenuCategory } from '@/types';

interface CategoryPillsProps {
  categories: MenuCategory[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryPills({ categories, selected, onSelect }: CategoryPillsProps) {
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pr-8" role="tablist" aria-label="Filter kategori">
        <button onClick={() => onSelect(null)} role="tab" aria-selected={selected === null}
          className={cn('px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95', selected === null ? 'bg-primary text-white shadow-sm' : 'bg-surface-3 text-text-secondary hover:bg-border')}>Semua</button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => onSelect(cat.id)} role="tab" aria-selected={selected === cat.id}
            className={cn('px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95', selected === cat.id ? 'bg-primary text-white shadow-sm' : 'bg-surface-3 text-text-secondary hover:bg-border')}>{cat.name}</button>
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-surface-2 to-transparent pointer-events-none" />
    </div>
  );
}
