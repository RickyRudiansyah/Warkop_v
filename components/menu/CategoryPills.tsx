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
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Filter kategori">
      <button onClick={() => onSelect(null)} role="tab" aria-selected={selected === null}
        className={cn('px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors', selected === null ? 'bg-primary text-white' : 'bg-surface-3 text-text-secondary hover:bg-surface-3/80')}>Semua</button>
      {categories.map(cat => (
        <button key={cat.id} onClick={() => onSelect(cat.id)} role="tab" aria-selected={selected === cat.id}
          className={cn('px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors', selected === cat.id ? 'bg-primary text-white' : 'bg-surface-3 text-text-secondary hover:bg-surface-3/80')}>{cat.name}</button>
      ))}
    </div>
  );
}
