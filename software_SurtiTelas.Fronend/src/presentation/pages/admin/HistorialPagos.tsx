import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import s from './HistorialPagos.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { DataTable } from '@/shared/ui/DataTable';
import { paymentsApi } from '@/infrastructure/api/paymentsApi';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Loader2, AlertCircle } from 'lucide-react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

interface PaymentRow {
  id: string;
  fecha: string;
  cliente: string;
  asesor: string;
  monto: number;
  metodo: string;
  estado: string;
  referencia?: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const AdminHistorialPagos: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await paymentsApi.list();
        const mapped: PaymentRow[] = data.map(p => ({
          id: p.id,
          fecha: formatDate(p.createdAt),
          cliente: p.customerNombre ?? p.customerId,
          asesor: p.asesorId ?? 'Sin asesor',
          monto: Number(p.amount) || 0,
          metodo: p.method,
          estado: p.status,
          referencia: p.reference,
        }));
        setPayments(mapped);
      } catch {
        setError('No se pudieron cargar los pagos');
        toast.error('No se pudieron cargar los pagos');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    return payments.filter(p =>
      p.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.cliente.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.asesor.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.referencia?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [payments, debouncedSearch]);

  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Historial de Pagos</h1>
          <p className={s.pageSubtitle}>Registro de transacciones (solo lectura)</p>
        </div>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar por ID, cliente o referencia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={300}
          minChars={0}
        />
      </div>

      <div className={s.tableWrapper}>
        {loading && (
          <div className={s.loadingRow}>
            <Loader2 size={18} className={s.spin} />
            <span>Cargando pagos...</span>
          </div>
        )}
        {error && !loading && (
          <div className={s.errorRow}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {!loading && !error && (
          <DataTable
            data={filtered}
            columns={[
              { key: 'id', header: 'ID', width: '120px', sortable: true, render: (p) => <span className={s.tdMono}>{p.id}</span> },
              { key: 'fecha', header: 'Fecha', width: '120px', sortable: true, render: (p) => p.fecha },
              { key: 'cliente', header: 'Cliente', sortable: true, render: (p) => p.cliente },
              { key: 'asesor', header: 'Asesor', sortable: true, render: (p) => p.asesor },
              { key: 'monto', header: 'Monto', width: '120px', sortable: true, align: 'right', render: (p) => <span className={s.tdRight}>{formatCurrency(p.monto)}</span> },
              { key: 'metodo', header: 'Método', sortable: true, render: (p) => p.metodo },
              { key: 'estado', header: 'Estado', sortable: true, render: (p) => <StatusBadge status={p.estado} /> },
            ]}
            emptyMessage="No se encontraron pagos"
            toolbarLeft={null}
            maxVisibleColumns={5}
          />
        )}
      </div>
    </div>
  );
};
