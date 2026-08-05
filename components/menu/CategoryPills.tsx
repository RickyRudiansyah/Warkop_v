'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MenuCategory } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee, CupSoda, UtensilsCrossed, Cookie, GlassWater, Soup, Sandwich,
  IceCream, Croissant, Utensils, LayoutGrid, ChevronDown, X, CirclePlus,
  type LucideIcon,
} from 'lucide-react';

interface CategoryPillsProps {
  categories: MenuCategory[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

// DESIGN.md membayangkan ilustrasi line-art per kategori. Karena aset itu belum
// ada, ikon dipilih dari nama kategori dengan pencocokan kata kunci — ganti
// dengan ilustrasi asli kalau nanti tersedia.
//
// Urutan penting: aturan yang lebih spesifik didahulukan. Pola untuk "ice" juga
// WAJIB memakai batas kata (\b) — tanpa itu "SET RICE" ikut cocok dengan /ice/
// (dari "set rICE") dan kategorinya tampil berikon es krim.
const ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/roti|ropang|panggang|toast|bakar/i, Sandwich],
  [/indomie|\bmie\b|noodle|soup|sup|kuah/i, Soup],
  [/rice|nasi|makan|main|food/i, UtensilsCrossed],
  [/snack|camilan|gorengan|kentang|kerupuk/i, Cookie],
  [/add.?on|tambahan|topping|extra/i, CirclePlus],
  [/kopi|coffee|espresso|latte|cappu/i, Coffee],
  [/teh|tea/i, CupSoda],
  [/drink|minum|dingin|jus|juice|\bes\b|\bice\b/i, GlassWater],
  [/dessert|manis|krim|cream/i, IceCream],
  [/pastry|kue|cake/i, Croissant],
];

function iconFor(name: string): LucideIcon {
  return ICON_RULES.find(([pattern]) => pattern.test(name))?.[1] ?? Utensils;
}

// Ikon bulat 56px: ring luar ember + ring dalam gold saat aktif (DESIGN.md §5.3).
//
// Sengaja TANPA ring-offset: selain tidak diminta desain, ring-offset butuh warna
// latar yang cocok — dan komponen ini dipakai di dua latar berbeda (kanvas strip
// vs sheet modal), jadi warnanya pasti salah di salah satunya. Tanpa offset,
// tonjolan keluar juga tinggal 2px sehingga tidak terpotong wadah scroll.
function CategoryIcon({ Icon, active }: { Icon: LucideIcon; active: boolean }) {
  return (
    <span
      className={cn(
        'w-14 h-14 rounded-full bg-surface flex items-center justify-center transition',
        active
          ? 'ring-2 ring-ember-ink shadow-[inset_0_0_0_2px_var(--color-gold-500)]'
          : 'ring-1 ring-border opacity-70',
      )}
    >
      <Icon className={cn('w-6 h-6', active ? 'text-ember-ink' : 'text-text-secondary')} strokeWidth={1.75} />
    </span>
  );
}

export function CategoryPills({ categories, selected, onSelect }: CategoryPillsProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const entries: Array<{ id: string | null; name: string; Icon: LucideIcon }> = [
    { id: null, name: 'Semua', Icon: LayoutGrid },
    ...categories.map(c => ({ id: c.id as string | null, name: c.name, Icon: iconFor(c.name) })),
  ];

  const pick = (id: string | null) => {
    onSelect(id);
    setModalOpen(false);
  };

  return (
    <>
      <div className="relative">
        {/*
          overflow-x-auto membuat sumbu Y ikut ter-clip (aturan CSS: satu sumbu
          non-visible memaksa sumbu lain jadi auto). Padding di sini memberi ruang
          untuk ring; -ml-1 mengembalikan perataan kiri supaya tidak bergeser.
        */}
        <div className="flex gap-5 overflow-x-auto scrollbar-hide -ml-1 pl-1 pr-12 py-1" role="tablist" aria-label="Filter kategori">
          {entries.map(({ id, name, Icon }) => {
            const active = selected === id;
            return (
              <button
                key={id ?? 'all'}
                onClick={() => onSelect(id)}
                role="tab"
                aria-selected={active}
                className="shrink-0 flex flex-col items-center gap-1.5 w-[68px] active:scale-95 transition"
              >
                <CategoryIcon Icon={Icon} active={active} />
                <span
                  className={cn(
                    'text-[11px] uppercase tracking-wide text-center leading-tight line-clamp-2',
                    active ? 'font-semibold text-text' : 'text-text-secondary',
                  )}
                >
                  {name}
                </span>
                <span className={cn('h-[3px] w-8 rounded-full', active ? 'bg-ember-ink' : 'bg-transparent')} />
              </button>
            );
          })}
        </div>

        {/* Chevron pembuka All Category modal (DESIGN.md §5.3) */}
        <div className="absolute right-0 top-0 bottom-0 pl-8 flex items-start bg-gradient-to-l from-surface-2 via-surface-2 to-transparent">
          <button
            onClick={() => setModalOpen(true)}
            aria-label="Lihat semua kategori"
            className="w-9 h-9 mt-3.5 rounded-full bg-surface ring-1 ring-border flex items-center justify-center text-text-secondary active:scale-95 transition"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end">
            <motion.div
              className="absolute inset-0 bg-brown-950/55"
              onClick={() => setModalOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              aria-hidden="true"
            />
            <motion.div
              className="relative w-full max-h-[70vh] overflow-y-auto bg-surface rounded-t-2xl"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              role="dialog" aria-modal="true" aria-labelledby="all-category-title"
            >
              <div className="sticky top-0 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
                <h2 id="all-category-title" className="text-base font-semibold uppercase tracking-wide text-text">
                  Semua Kategori
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-1 text-text-secondary" aria-label="Tutup">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 p-4">
                {entries.map(({ id, name, Icon }) => {
                  const active = selected === id;
                  return (
                    <button
                      key={id ?? 'all'}
                      onClick={() => pick(id)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl py-3 px-2 transition active:scale-95',
                        active ? 'bg-gold-soft' : 'hover:bg-surface-3',
                      )}
                    >
                      <CategoryIcon Icon={Icon} active={active} />
                      <span
                        className={cn(
                          'text-[11px] uppercase tracking-wide text-center leading-tight line-clamp-2',
                          active ? 'font-semibold text-text' : 'text-text-secondary',
                        )}
                      >
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
