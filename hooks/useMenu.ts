'use client';

import { useEffect, useState, useCallback } from 'react';
import { MenuItem, MenuCategory, MenuVariation } from '@/types';

export function useMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [menuRes, varRes] = await Promise.all([
        fetch('/api/menu'),
        fetch('/api/menu/variations'),
      ]);

      if (!menuRes.ok) {
        setError('Gagal memuat menu (status ' + menuRes.status + ')');
        setLoading(false);
        return;
      }

      const menuData: MenuItem[] = await menuRes.json();
      const varData: MenuVariation[] = varRes.ok ? await varRes.json() : [];
      const variations = Array.isArray(varData) ? varData : [];
      const items = Array.isArray(menuData) ? menuData : [];

      const itemsWithVariations = items.map(item => ({
        ...item,
        variations: variations.filter(v => v.menu_item_id === item.id),
      }));
      setMenuItems(itemsWithVariations);

      // Derive categories from the joined category field, sorted by sort_order
      const catMap = new Map<string, MenuCategory>();
      items.forEach(item => {
        if (item.category) catMap.set(item.category.id, item.category);
      });
      setCategories(
        Array.from(catMap.values()).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat menu');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refetch = async () => {
    setLoading(true);
    await fetchData();
  };

  return { menuItems, categories, loading, error, refetch };
}
