'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { MenuItem, MenuVariation, VariationSelection } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { X, Plus, Minus, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuItemSheetProps {
  item: MenuItem | null;
  variations: MenuVariation[];
  onClose: () => void;
  onAdd: (item: MenuItem, quantity: number, variations: VariationSelection[], notes: string) => void;
}

// Bottom sheet detail produk (DESIGN.md §5.7): foto besar 1:1 di atas dengan
// tombol close bulat, deskripsi, variasi, catatan, lalu CTA sticky di dasar.
/**
 * Grup variasi yang WAJIB dipilih: ada opsi yang tidak menambah harga.
 *
 * Penanda paling jujur tanpa mengubah skema — grup yang semua opsinya berbayar
 * adalah tambahan (Extra Topping), grup yang punya pilihan dasar gratis adalah
 * pilihan yang memang harus diambil (Rasa, Porsi).
 */
function isRequiredGroup(vars: MenuVariation[]): boolean {
  return vars.some(v => v.extra_price === 0);
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
    if (!acc[v.variation_type]) acc[v.variation_type] = [];
    acc[v.variation_type].push(v);
    return acc;
  }, {});

  // Grup wajib yang belum dipilih. Selama masih ada, tombol tambah terkunci —
  // lebih baik menahan pesanan di sini daripada mengirimnya ke dapur tanpa
  // keterangan yang mereka butuhkan.
  const missing = Object.entries(groupedVariations)
    .filter(([group, vars]) => isRequiredGroup(vars) && !selectedVariations[group])
    .map(([group]) => group);

  return (
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-50 flex items-end">
          <motion.div
            className="absolute inset-0 bg-brown-950/55"
            onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            aria-hidden="true"
          />
          <motion.div
            className="relative w-full bg-surface rounded-t-2xl max-h-[88vh] flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-item-sheet-title"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="relative">
                {/* Gambar absolute supaya rasio 1:1 tidak ditimpa tinggi asli gambar. */}
                <div className="relative aspect-square w-full bg-surface-3 rounded-t-2xl overflow-hidden">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      // Lembar ini selebar layar, jadi butuh versi lebih besar
                      // daripada kartunya - tapi tetap dibatasi 640px, karena
                      // di atas itu mata tidak lagi bisa membedakannya pada
                      // foto makanan.
                      sizes="(max-width: 640px) 100vw, 640px"
                      quality={60}
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Utensils className="w-12 h-12 text-text-secondary/40" />
                    </div>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-surface shadow-md flex items-center justify-center text-text active:scale-95 transition"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-5">
                <div>
                  <h2 id="menu-item-sheet-title" className="text-xl font-bold uppercase leading-tight text-text">
                    {item.name}
                  </h2>
                  <p className="mt-1 text-lg font-bold text-ember-ink">{formatCurrency(item.price)}</p>
                  {item.description && (
                    <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--color-text-secondary)]">
                      {item.description}
                    </p>
                  )}
                </div>

                {Object.entries(groupedVariations).map(([group, vars]) => (
                  <div key={group}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-text mb-2 flex items-center gap-2">
                      {group}
                      {isRequiredGroup(vars) && !selectedVariations[group] && (
                        <span className="text-[11px] font-bold text-danger normal-case">wajib dipilih</span>
                      )}
                    </h3>
                    <div className="space-y-2">
                      {/* Radio tidak punya jalan mundur: sekali topping berbayar
                          dipilih, pelanggan tidak bisa kembali ke harga polos
                          selain menutup lembar ini. Opsi "tanpa" itulah jalannya.
                          
                          Tapi HANYA untuk grup tambahan. Grup yang punya pilihan
                          dasar gratis (Rasa, Porsi) adalah pilihan yang memang
                          harus diambil — dapur tidak bisa memasak "Indomie tanpa
                          rasa", mereka tidak tahu itu kari goreng atau soto. */}
                      {(() => {
                        if (isRequiredGroup(vars)) return null;
                        const none = !selectedVariations[group];
                        return (
                          <label
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition',
                              none ? 'border-ember-ink bg-ember-soft' : 'border-border hover:bg-surface-3',
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name={group}
                                checked={none}
                                onChange={() => setSelectedVariations(prev => {
                                  const next = { ...prev };
                                  delete next[group];
                                  return next;
                                })}
                                className="accent-[color:var(--color-ember-600)]"
                              />
                              <span className="text-[15px] text-text">Tanpa {group.toLowerCase()}</span>
                            </div>
                          </label>
                        );
                      })()}
                      {vars.map(v => {
                        const checked = selectedVariations[group]?.label === v.label;
                        return (
                          <label
                            key={v.id}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition',
                              checked ? 'border-ember-ink bg-ember-soft' : 'border-border hover:bg-surface-3',
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name={group}
                                checked={checked}
                                onChange={() => setSelectedVariations(prev => ({
                                  ...prev,
                                  [group]: { variation_type: v.variation_type, label: v.label, extra_price: v.extra_price },
                                }))}
                                className="accent-[color:var(--color-ember-600)]"
                              />
                              <span className="text-[15px] text-text">{v.label}</span>
                            </div>
                            {v.extra_price > 0 && (
                              <span className="text-sm font-medium text-ember-ink">+{formatCurrency(v.extra_price)}</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-text mb-2">Catatan untuk dapur</h3>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Contoh: Tidak pakai gula"
                    className="w-full p-3 rounded-lg border border-border bg-surface text-text placeholder:text-[color:var(--color-text-secondary)] resize-none outline-none focus:border-ember-ink"
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-text active:scale-95 transition"
                      aria-label="Kurangi"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-semibold w-8 text-center tabular-nums text-text">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-text active:scale-95 transition"
                      aria-label="Tambah"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xl font-bold text-text">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* CTA sticky di dasar sheet (DESIGN.md §5.7) */}
            <div className="border-t border-border bg-surface p-4 pb-safe">
              <button
                onClick={() => onAdd(item, quantity, Object.values(selectedVariations), notes)}
                disabled={missing.length > 0}
                className="w-full h-[52px] rounded-[10px] bg-ember-600 text-cream-50 font-bold text-base uppercase tracking-wide hover:bg-ember-500 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {missing.length > 0 ? `Pilih ${missing[0]} dulu` : 'Tambah ke Keranjang'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
