'use client';

import { MenuItem } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Plus, Minus, Utensils } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  // Buka detail sheet (dipakai saat tap foto/nama, atau saat produk punya variasi).
  onOpenDetail: (item: MenuItem) => void;
  // Tambah 1 qty langsung tanpa membuka sheet (DESIGN.md §6).
  onQuickAdd: (item: MenuItem) => void;
  // Jumlah item ini yang sudah ada di keranjang (0 = tampilkan tombol ADD).
  quantityInCart: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

// Kartu produk grid 2 kolom (DESIGN.md §5.6): foto 1:1 di atas, nama uppercase
// maks 2 baris, harga, lalu tombol ADD outline yang berubah jadi stepper.
export function MenuItemCard({ item, onOpenDetail, onQuickAdd, quantityInCart, onIncrement, onDecrement }: MenuItemCardProps) {
  const soldOut = item.is_sold_out || !item.is_available;
  const hasVariations = (item.variations?.length ?? 0) > 0;

  return (
    // h-full: semua kartu dalam satu baris grid jadi setinggi kartu tertinggi.
    <div className="card h-full overflow-hidden flex flex-col">
      {/*
        shrink-0 + gambar absolute: sebagai flex item, tinggi elemen ini ditentukan
        flex-basis (ukuran konten), sehingga tinggi asli gambar akan menimpa
        aspect-square dan bikin kartu tidak simetris. Dengan gambar dikeluarkan
        dari alur normal (absolute), rasio 1:1-lah yang menentukan tinggi.
      */}
      <button
        onClick={() => onOpenDetail(item)}
        disabled={soldOut}
        className="relative block w-full aspect-square shrink-0 overflow-hidden bg-surface-3 disabled:cursor-not-allowed"
        aria-label={'Lihat detail ' + item.name}
      >
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Utensils className="w-8 h-8 text-text-secondary/40" />
          </div>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-brown-950/50 flex items-center justify-center">
            <span className="px-2.5 py-1 rounded-md bg-danger text-white text-[11px] font-semibold uppercase tracking-wide">
              Habis
            </span>
          </div>
        )}
      </button>

      <div className="p-3 flex flex-col flex-1">
        {/*
          Nama + detail isi, mengikuti poster menu: "ROPOSU / Ropang + susu".
          Tanpa baris detail, menu seperti "Cipop Original" atau "Rokemsu" tidak
          memberi tahu apa pun soal isinya.
        */}
        <button onClick={() => onOpenDetail(item)} disabled={soldOut} className="text-left">
          <h3 className="font-semibold text-[15px] leading-snug uppercase text-text line-clamp-2">{item.name}</h3>
          {item.description && (
            <p className="mt-0.5 text-[12px] leading-snug text-text-secondary line-clamp-2">{item.description}</p>
          )}
        </button>
        <p className="mt-1.5 text-[15px] font-bold text-text">{formatCurrency(item.price)}</p>

        {/* mt-auto: tombol ADD selalu rata bawah walau judul 1 atau 2 baris. */}
        <div className="mt-auto pt-2.5">
          {quantityInCart > 0 && !soldOut ? (
            <div className="flex items-center justify-between h-10 rounded-lg bg-ember-soft px-1.5">
              <button
                onClick={onDecrement}
                aria-label={'Kurangi ' + item.name}
                className="w-8 h-8 rounded-md flex items-center justify-center text-ember-ink active:scale-95 transition"
              >
                <Minus className="w-4 h-4" strokeWidth={2.5} />
              </button>
              <span className="font-semibold text-[15px] text-text tabular-nums">{quantityInCart}</span>
              <button
                onClick={onIncrement}
                aria-label={'Tambah ' + item.name}
                className="w-8 h-8 rounded-md flex items-center justify-center text-ember-ink active:scale-95 transition"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => (hasVariations ? onOpenDetail(item) : onQuickAdd(item))}
              disabled={soldOut}
              aria-label={'Tambah ' + item.name + ' ke keranjang'}
              className={cn(
                'w-full h-10 rounded-lg border-[1.5px] text-[14px] font-semibold uppercase tracking-wide transition active:scale-[0.98]',
                soldOut
                  ? 'border-border text-text-secondary cursor-not-allowed'
                  : 'border-ember-ink text-ember-ink hover:bg-ember-soft',
              )}
            >
              {soldOut ? 'Habis' : 'Add'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
