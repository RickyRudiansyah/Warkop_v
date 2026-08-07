'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CartItem, MenuItem, VariationSelection } from '@/types';

interface CartContextType {
  items: CartItem[];
  tableNumber: number | null;
  setTableNumber: (num: number | null) => void;
  // UUID meja — dipilih di header halaman menu, dipakai saat membuat order.
  // Disimpan terpisah dari tableNumber karena API butuh id, UI butuh nomor.
  tableId: string | null;
  setTable: (id: string | null, num: number | null) => void;
  // "Belum memilih" dan "sengaja tanpa meja" sama-sama `tableId === null`, jadi
  // keduanya tidak bisa dibedakan dari situ. Flag ini yang membedakannya —
  // tanpa itu, pelanggan take away akan terus ditahan "wajib pilih meja".
  takeAway: boolean;
  setTakeAway: (value: boolean) => void;
  /** Meja sudah dipilih ATAU take away — syarat boleh checkout. */
  tableDecided: boolean;
  addItem: (menu_item: MenuItem, quantity: number, selectedVariations: VariationSelection[], notes: string) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try { const stored = sessionStorage.getItem('warkop_cart'); return stored ? JSON.parse(stored) : []; } catch { return []; }
}
function getStoredTable(): number | null {
  if (typeof window === 'undefined') return null;
  try { const stored = sessionStorage.getItem('warkop_table'); return stored ? parseInt(stored) : null; } catch { return null; }
}
function getStoredTableId(): string | null {
  if (typeof window === 'undefined') return null;
  try { return sessionStorage.getItem('warkop_table_id'); } catch { return null; }
}
function getStoredTakeAway(): boolean {
  if (typeof window === 'undefined') return false;
  try { return sessionStorage.getItem('warkop_take_away') === '1'; } catch { return false; }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(getStoredCart);
  const [tableNumber, setTableNumber] = useState<number | null>(getStoredTable);
  const [tableId, setTableId] = useState<string | null>(getStoredTableId);
  const [takeAway, setTakeAwayState] = useState<boolean>(getStoredTakeAway);

  useEffect(() => {
    try { sessionStorage.setItem('warkop_cart', JSON.stringify(items)); } catch {}
  }, [items]);

  useEffect(() => {
    try {
      if (tableNumber !== null) sessionStorage.setItem('warkop_table', String(tableNumber));
      else sessionStorage.removeItem('warkop_table');
    } catch {}
  }, [tableNumber]);

  useEffect(() => {
    try {
      if (tableId) sessionStorage.setItem('warkop_table_id', tableId);
      else sessionStorage.removeItem('warkop_table_id');
    } catch {}
  }, [tableId]);

  useEffect(() => {
    try {
      if (takeAway) sessionStorage.setItem('warkop_take_away', '1');
      else sessionStorage.removeItem('warkop_take_away');
    } catch {}
  }, [takeAway]);

  // Memilih meja membatalkan take away, dan sebaliknya — keduanya tidak boleh
  // menyala bersamaan, kalau tidak order bungkus tetap membawa nomor meja.
  const setTable = useCallback((id: string | null, num: number | null) => {
    setTableId(id);
    setTableNumber(num);
    if (id !== null) setTakeAwayState(false);
  }, []);

  const setTakeAway = useCallback((value: boolean) => {
    setTakeAwayState(value);
    if (value) {
      setTableId(null);
      setTableNumber(null);
    }
  }, []);

  const addItem = useCallback((menu_item: MenuItem, quantity: number, selectedVariations: VariationSelection[], notes: string) => {
    const variationKey = JSON.stringify(selectedVariations.sort((a, b) => a.variation_type.localeCompare(b.variation_type)));
    const variationExtra = selectedVariations.reduce((sum, v) => sum + v.extra_price, 0);
    const subtotal = (menu_item.price + variationExtra) * quantity;
    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.menu_item.id === menu_item.id && JSON.stringify(item.selectedVariations) === variationKey);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        updated[existingIndex] = { ...existing, quantity: existing.quantity + quantity, subtotal: (menu_item.price + variationExtra) * (existing.quantity + quantity) };
        return updated;
      }
      return [...prev, { menu_item, quantity, selectedVariations, notes, subtotal }];
    });
  }, []);

  const removeItem = useCallback((index: number) => { setItems(prev => prev.filter((_, i) => i !== index)); }, []);
  const updateQuantity = useCallback((index: number, quantity: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const variationExtra = item.selectedVariations.reduce((sum, v) => sum + v.extra_price, 0);
        return { ...item, quantity, subtotal: (item.menu_item.price + variationExtra) * quantity };
      }
      return item;
    }));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    try { sessionStorage.removeItem('warkop_cart'); } catch {}
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <CartContext.Provider value={{ items, tableNumber, setTableNumber, tableId, setTable, takeAway, setTakeAway, tableDecided: tableId !== null || takeAway, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
