import React from 'react';
import { AdminPedidos } from '@/presentation/pages/admin/Pedidos';

/**
 * Gestion de pedidos del asesor.
 *
 * Reutiliza el componente del panel administrativo para que ambas paginas
 * tengan exactamente las mismas funciones (indicadores, filtros, busqueda,
 * modal de detalle, alta/edicion de pedidos con busqueda de cliente por
 * documento, estado de cuenta, comprobante, abonos y notas).
 *
 * El backend ya limita el listado a los pedidos del asesor autenticado
 * (GET /orders aplica filters.asesorId cuando req.user.role === 'ASESOR'),
 * por lo que no se requiere un filtrado adicional en el frontend.
 */
export const AsesorPedidos: React.FC = () => <AdminPedidos advisorMode />;

export default AsesorPedidos;
