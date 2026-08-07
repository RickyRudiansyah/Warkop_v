'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Table } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Armchair, ChevronDown, X, Check, ShoppingBag } from 'lucide-react';

// Table pill di header (DESIGN.md §5.1) — di sini dibuat interaktif karena
// aplikasi memakai SATU QR umum: nomor meja dipilih pelanggan sendiri, bukan
// dibawa dari URL QR per meja. Meja wajib dipilih sebelum bisa checkout.
export function TablePicker() {
  const { tableNumber, tableId, setTable, takeAway, setTakeAway, tableDecided } = useCart();
  const [tables, setTables] = useState<Table[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tables')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { setTables(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Pill-nya berhenti berkedip begitu pelanggan memutuskan — memilih meja
  // ATAU take away. Sebelumnya hanya nomor meja yang menghentikannya.
  const chosen = tableDecided;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={
          takeAway ? 'Ganti pilihan, sekarang take away'
            : tableNumber !== null ? 'Ganti meja, sekarang meja ' + tableNumber
              : 'Pilih nomor meja atau take away'
        }
        className={cn(
          'flex items-center gap-1.5 rounded-b-2xl rounded-t-md px-4 py-2 -mt-3 shadow-md transition active:scale-95',
          // Ember & gold nilainya tetap di kedua tema, jadi teksnya juga harus
          // warna tetap — bukan token tema yang ikut berubah terang/gelap.
          chosen ? 'bg-ember-600 text-cream-50' : 'bg-gold-500 text-brown-900 animate-fab-pulse',
        )}
      >
        {takeAway ? <ShoppingBag className="w-4 h-4" /> : <Armchair className="w-4 h-4" />}
        <span className="text-[15px] font-semibold uppercase tracking-wide">
          {takeAway ? 'Take Away' : tableNumber !== null ? 'Meja ' + tableNumber : 'Pilih Meja'}
        </span>
        <ChevronDown className="w-4 h-4 opacity-80" />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end">
            <motion.div
              className="absolute inset-0 bg-brown-950/55"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              aria-hidden="true"
            />
            <motion.div
              className="relative w-full max-h-[70vh] overflow-y-auto bg-surface rounded-t-2xl"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              role="dialog" aria-modal="true" aria-labelledby="table-picker-title"
            >
              <div className="sticky top-0 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
                <h2 id="table-picker-title" className="text-base font-semibold uppercase tracking-wide text-text">
                  Pilih Nomor Meja
                </h2>
                <button onClick={() => setOpen(false)} className="p-1 text-text-secondary" aria-label="Tutup">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                <p className="text-sm text-[color:var(--color-text-secondary)] mb-3">
                  Pesanan akan diantar ke meja yang kamu pilih, atau dibungkus
                  untuk dibawa pulang.
                </p>

                {/* Take away sejajar dengan memilih meja, bukan sisa pilihan
                    di bawah daftar: pelanggan yang membungkus tidak sedang
                    "gagal memilih meja". */}
                <button
                  onClick={() => { setTakeAway(true); setOpen(false); }}
                  className={cn(
                    'relative w-full mb-3 h-16 rounded-xl border text-center transition active:scale-95 flex items-center justify-center gap-2',
                    takeAway
                      ? 'border-ember-ink bg-ember-soft text-text'
                      : 'border-border bg-surface text-text hover:bg-surface-3',
                  )}
                >
                  {takeAway && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-ember-600 text-cream-50 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                  )}
                  <ShoppingBag className={cn('w-4 h-4', takeAway ? 'text-ember-ink' : 'text-text-secondary')} />
                  <span className="text-[13px] font-semibold uppercase leading-none">
                    Take Away · Dibungkus
                  </span>
                </button>

                {loading ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-xl animate-shimmer" />
                    ))}
                  </div>
                ) : tables.length === 0 ? (
                  <p className="text-sm text-[color:var(--color-text-secondary)] py-6 text-center">
                    Belum ada meja tersedia. Hubungi staff.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {tables.map(t => {
                      const active = tableId === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => { setTable(t.id, t.table_number); setOpen(false); }}
                          className={cn(
                            'relative h-16 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-0.5',
                            active
                              ? 'border-ember-ink bg-ember-soft text-text'
                              : 'border-border bg-surface text-text hover:bg-surface-3',
                          )}
                        >
                          {active && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-ember-600 text-cream-50 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" strokeWidth={3} />
                            </span>
                          )}
                          <Armchair className={cn('w-4 h-4', active ? 'text-ember-ink' : 'text-text-secondary')} />
                          <span className="text-[13px] font-semibold uppercase leading-none">
                            {t.label || 'Meja ' + t.table_number}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
