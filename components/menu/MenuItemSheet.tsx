'use client';

import { useState, useEffect } from 'react';
import { MenuItem, MenuVariation, VariationSelection } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { X, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuItemSheetProps {
  item: MenuItem | null;
  variations: MenuVariation[];
  onClose: () => void;
  onAdd: (item: MenuItem, quantity: number, variations: VariationSelection[], notes: string) => void;
}

export function MenuItemSheet({ item, variations, onClose, onAdd }: MenuItemSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, VariationSelection>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setQuantity(1);
    setSelectedVariations({});
    setNotes('');
  }, [item?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (item) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const variationExtra = Object.values(selectedVariations).reduce((sum, v) => sum + v.extra_price, 0);
  const total = (item.price + variationExtra) * quantity;

  const groupedVariations = variations.reduce<Record<string, MenuVariation[]>>((acc, v) => {
    if (!acc[v.group_name]) acc[v.group_name] = [];
    acc[v.group_name].push(v);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-50 flex items-end">
          <motion.div className="absolute inset-0 bg-black/50" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true" />
          <motion.div
            className="relative w-full bg-surface rounded-t-2xl max-h-[85vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-item-sheet-title"
          >
            <div className="sticky top-0 bg-surface border-b px-4 py-3 flex items-center justify-between">
              <h2 id="menu-item-sheet-title" className="text-lg font-semibold">{item.name}</h2>
              <button onClick={onClose} className="p-1" aria-label="Tutup"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-6">
              {item.description && <p className="text-text-secondary">{item.description}</p>}
              {Object.entries(groupedVariations).map(([group, vars]) => (
                <div key={group}>
                  <h3 className="font-medium mb-2">{group}</h3>
                  <div className="space-y-2">
                    {vars.map(v => (
                      <label key={v.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-surface-3">
                        <div className="flex items-center gap-2">
                          <input type="radio" name={group} checked={selectedVariations[group]?.label === v.label} onChange={() => setSelectedVariations(prev => ({ ...prev, [group]: { group_name: v.group_name, label: v.label, extra_price: v.extra_price } }))} />
                          <span>{v.label}</span>
                        </div>
                        {v.extra_price > 0 && <span className="text-sm text-primary">+{formatCurrency(v.extra_price)}</span>}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <h3 className="font-medium mb-2">Catatan</h3>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contoh: Tidak pakai gula" className="w-full p-3 border rounded-lg resize-none bg-surface" rows={2} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 border rounded-full" aria-label="Kurangi"><Minus className="w-4 h-4" /></button>
                  <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-2 border rounded-full" aria-label="Tambah"><Plus className="w-4 h-4" /></button>
                </div>
                <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
              </div>
              <Button size="lg" className="w-full" onClick={() => { onAdd(item, quantity, Object.values(selectedVariations), notes); }}>
                Tambah ke Keranjang
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
