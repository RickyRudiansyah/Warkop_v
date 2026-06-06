'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Order } from '@/types';

interface UseOrdersOptions {
  // Cashier view: also keep SERVED orders that are still UNPAID, so no bill is lost
  // when a cash order is served before the customer pays at the register.
  includeUnpaidServed?: boolean;
}

export function useOrders({ includeUnpaidServed = false }: UseOrdersOptions = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchOrders = useCallback(async () => {
    try {
      const url = includeUnpaidServed ? '/api/orders?mode=cashier' : '/api/orders';
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Gagal memuat pesanan (status ' + res.status + ')');
      } else {
        const data = await res.json();
        setOrders(Array.isArray(data) ? (data as Order[]) : []);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan');
    }
    setLoading(false);
  }, [includeUnpaidServed]);

  useEffect(() => {
    fetchOrders();

    // Realtime subscription triggers re-fetches via the API route.
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
