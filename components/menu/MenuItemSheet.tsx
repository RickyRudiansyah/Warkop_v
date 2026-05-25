'use client';

import { useState } from 'react';
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
      <div className="fixed inset-0 z-50 flex items-end">
        <motion.div className="absolute inset-0 bg-black/50" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.div className="relative w-full bg-surface rounded-t-2xl max-h-[85vh] overflow-y-auto" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}>
          <div className="sticky top-0 bg-surface border-b px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{item.name}</h2>
            <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
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
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 border rounded-full"><Minus className="w-4 h-4" /></button>
                <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-2 border rounded-full"><Plus className="w-4 h-4" /></button>
              </div>
              <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
            </div>
            <Button size="lg" className="w-full" onClick={() => { onAdd(item, quantity, Object.values(selectedVariations), notes); }}>
              Tambah ke Keranjang
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
