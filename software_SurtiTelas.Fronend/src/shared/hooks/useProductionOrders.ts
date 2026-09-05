import { useState, useEffect, useCallback } from 'react';
import { productionApi, type ProductionOrder } from '@/infrastructure/api/productionApi';

export function useProductionOrders() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productionApi.list();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando órdenes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleFocus = () => {
      load();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [load]);

  return { orders, loading, error, refetch: load, setOrders };
}
