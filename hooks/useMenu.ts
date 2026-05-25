'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MenuItem, MenuCategory, MenuVariation } from '@/types';

export function useMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      const [menuRes, catRes, varRes] = await Promise.all([
        supabase.from('menu_items').select('*, category:menu_categories(*)').order('name'),
        supabase.from('menu_categories').select('*').order('sort_order'),
        supabase.from('menu_variations').select('*'),
      ]);

      if (menuRes.error) { setError(menuRes.error.message); setLoading(false); return; }
      if (catRes.error) { setError(catRes.error.message); setLoading(false); return; }

      const variations = (varRes.data as MenuVariation[]) || (varRes.error ? [] : []);
      const itemsWithVariations = (menuRes.data as MenuItem[]).map(item => ({
        ...item,
        variations: variations.filter(v => v.menu_item_id === item.id),
      }));
      setMenuItems(itemsWithVariations);
      setCategories(catRes.data as MenuCategory[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu');
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refetch = async () => {
    setLoading(true);
    await fetchData();
  };

  return { menuItems, categories, loading, error, refetch };
}
