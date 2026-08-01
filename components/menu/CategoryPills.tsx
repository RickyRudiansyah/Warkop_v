'use client';

import { cn } from '@/lib/utils';
import { MenuCategory } from '@/types';

interface CategoryPillsProps {
  categories: MenuCategory[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

// Category tabs (design §5.3): active = bold + dark underline, inactive = muted.
export function CategoryPills({ categories, selected, onSelect }: CategoryPillsProps) {
  const tab = (active: boolean) =>
    cn(
      'relative px-1 py-2 text-sm whitespace-nowrap uppercase tracking-wide transition-colors active:scale-95',
      active ? 'font-bold text-text' : 'font-medium text-text-secondary hover:text-text',
    );

  return (
    <div className="relative border-b border-border">
      <div className="flex gap-5 overflow-x-auto scrollbar-hide pr-8" role="tablist" aria-label="Filter kategori">
        <button onClick={() => onSelect(null)} role="tab" aria-selected={selected === null} className={tab(selected === null)}>
          Semua
          {selected === null && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-text rounded-full" />}
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => onSelect(cat.id)} role="tab" aria-selected={selected === cat.id} className={tab(selected === cat.id)}>
            {cat.name}
            {selected === cat.id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-text rounded-full" />}
          </button>
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-surface-2 to-transparent pointer-events-none" />
    </div>
  );
}
