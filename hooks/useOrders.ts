'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Order } from '@/types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, table:tables(*), items:order_items(*)')
        .not('status', 'in', '(SERVED,CANCELLED)')
        .order('created_at', { ascending: true });
      if (fetchError) { setError(fetchError.message); } else { setOrders((data as Order[]) || []); setError(null); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchOrders(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => { fetchOrders(); })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') console.error('Realtime subscription failed');
      });

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchOrders]);

  return { orders, loading, error };
}
