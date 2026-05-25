'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MenuItem, MenuCategory, MenuVariation } from '@/types';

export function useMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const [menuRes, catRes, varRes] = await Promise.all([
        supabase.from('menu_items').select('*, category:menu_categories(*)').order('name'),
        supabase.from('menu_categories').select('*').order('sort_order'),
        supabase.from('menu_variations').select('*'),
      ]);
      if (menuRes.data) {
        const variations = (varRes.data as MenuVariation[]) || [];
        const itemsWithVariations = (menuRes.data as MenuItem[]).map(item => ({
          ...item,
          variations: variations.filter(v => v.menu_item_id === item.id),
        }));
        setMenuItems(itemsWithVariations);
      }
      if (catRes.data) setCategories(catRes.data as MenuCategory[]);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const refetch = async () => {
    setLoading(true);
    const [menuRes, catRes, varRes] = await Promise.all([
      supabase.from('menu_items').select('*, category:menu_categories(*)').order('name'),
      supabase.from('menu_categories').select('*').order('sort_order'),
      supabase.from('menu_variations').select('*'),
    ]);
    if (menuRes.data) {
      const variations = (varRes.data as MenuVariation[]) || [];
      const itemsWithVariations = (menuRes.data as MenuItem[]).map(item => ({
        ...item,
        variations: variations.filter(v => v.menu_item_id === item.id),
      }));
      setMenuItems(itemsWithVariations);
    }
    if (catRes.data) setCategories(catRes.data as MenuCategory[]);
    setLoading(false);
  };

  return { menuItems, categories, loading, refetch };
}
