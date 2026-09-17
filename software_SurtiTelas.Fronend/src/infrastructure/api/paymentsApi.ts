import { api } from './httpClient';

export interface PaymentDTO {
  id: string;
  orderId: string;
  customerId: string;
  asesorId?: string;
  amount: number;
  method: 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'ANULADO';
  reference?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  orderNumero?: string;
  customerNombre?: string;
  asesorNombre?: string;
  orderTotal?: number;
  orderEstado?: string;
  motivoAnulacion?: string;
  fechaAnulacion?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  asesorId?: string;
  amount: number;
  method: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro' | 'Credito';
  status: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Reembolsado' | 'Anulado';
  reference?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  orderNumero?: string;
  customerNombre?: string;
  asesorNombre?: string;
  orderTotal?: number;
  orderEstado?: string;
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  tipoPago?: string;
  numeroCuota?: number;
  totalCuotas?: number;
  esAnticipo?: boolean;
  esSaldo?: boolean;
}

export function toPayment(dto: PaymentDTO): Payment {
  return {
    id: dto.id,
    orderId: dto.orderId,
    customerId: dto.customerId,
    asesorId: dto.asesorId,
    amount: Number(dto.amount),
    method: dto.method === 'CASH' ? 'Efectivo' : dto.method === 'TRANSFER' ? 'Transferencia' : dto.method === 'CARD' ? 'Tarjeta' : 'Otro',
    status: dto.status === 'PENDING' ? 'Pendiente' : dto.status === 'APPROVED' ? 'Aprobado' : dto.status === 'REJECTED' ? 'Rechazado' : dto.status === 'REFUNDED' ? 'Reembolsado' : 'Anulado',
    reference: dto.reference,
    notes: dto.notes,
    paidAt: dto.paidAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    orderNumero: dto.orderNumero,
    customerNombre: dto.customerNombre,
    asesorNombre: dto.asesorNombre,
    orderTotal: dto.orderTotal,
    orderEstado: dto.orderEstado,
    motivoAnulacion: dto.motivoAnulacion,
    fechaAnulacion: dto.fechaAnulacion,
  };
}

export interface CustomerBalance {
  customerId: string;
  totalPaid: number;
  pending: number;
}

export interface QuoteBalance {
  quoteId: string;
  total: number;
  totalPaid: number;
  saldo: number;
  porcentajeAnticipo: number;
  valorAnticipo: number;
}

export interface QuoteBalance {
  quoteId: string;
  numero?: string;
  total: number;
  totalPaid: number;
  saldo: number;
  porcentajeAnticipo: number;
  valorAnticipo: number;
}

export const paymentsApi = {
  async list(query?: Record<string, string | number | boolean | undefined | null>): Promise<Payment[]> {
    const response = await api.get<{ items: PaymentDTO[]; meta: Record<string, unknown> }>('/payments', { query });
    const data = response?.items ?? [];
    return data.map(toPayment);
  },

  async getById(id: string): Promise<Payment | null> {
    try {
      const dto = await api.get<PaymentDTO>(`/payments/${encodeURIComponent(id)}`);
      return dto ? toPayment(dto) : null;
    } catch {
      return null;
    }
  },

  async create(data: Partial<Payment>): Promise<Payment> {
    const body: Record<string, unknown> = {
      orderId: data.orderId,
      customerId: data.customerId,
      asesorId: data.asesorId,
      amount: data.amount,
      method: data.method === 'Efectivo' ? 'CASH' : data.method === 'Transferencia' ? 'TRANSFER' : data.method === 'Tarjeta' ? 'CARD' : 'OTHER',
      reference: data.reference,
      notes: data.notes,
    };
    if (data.tipoPago) body.tipoPago = data.tipoPago;
    if (data.numeroCuota !== undefined) body.numeroCuota = data.numeroCuota;
    if (data.totalCuotas !== undefined) body.totalCuotas = data.totalCuotas;
    if (data.esAnticipo !== undefined) body.esAnticipo = data.esAnticipo;
    if (data.esSaldo !== undefined) body.esSaldo = data.esSaldo;
    const dto = await api.post<PaymentDTO>('/payments', body);
    return toPayment(dto);
  },

  async updateStatus(id: string, status: Payment['status']): Promise<Payment> {
    const dto = await api.patch<PaymentDTO>(`/payments/${encodeURIComponent(id)}/status`, {
      status: status === 'Pendiente' ? 'PENDING' : status === 'Aprobado' ? 'APPROVED' : status === 'Rechazado' ? 'REJECTED' : 'REFUNDED',
    });
    return toPayment(dto);
  },

  async update(id: string, changes: Partial<Payment>): Promise<Payment> {
    const body: Record<string, unknown> = {};
    if (changes.amount !== undefined) body.amount = changes.amount;
    if (changes.method !== undefined) body.method = changes.method === 'Efectivo' ? 'CASH' : changes.method === 'Transferencia' ? 'TRANSFER' : changes.method === 'Tarjeta' ? 'CARD' : 'OTHER';
    if (changes.reference !== undefined) body.reference = changes.reference;
    if (changes.notes !== undefined) body.notes = changes.notes;
    const dto = await api.patch<PaymentDTO>(`/payments/${encodeURIComponent(id)}`, body);
    return toPayment(dto);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/payments/${encodeURIComponent(id)}`);
  },

  async cancel(id: string, motivoAnulacion: string): Promise<Payment> {
    const dto = await api.patch<PaymentDTO>(`/payments/${encodeURIComponent(id)}/cancel`, { motivoAnulacion });
    return toPayment(dto);
  },

  async getCustomerBalance(customerId: string): Promise<CustomerBalance> {
    const data = await api.get<CustomerBalance>(`/payments/customers/${encodeURIComponent(customerId)}/balance`, { auth: true });
    return data;
  },

  async getQuoteBalance(quoteId: string): Promise<QuoteBalance> {
    const data = await api.get<QuoteBalance>(`/payments/quotes/${encodeURIComponent(quoteId)}/balance`, { auth: true });
    return data;
  },

  async listQuotesByCustomer(customerId: string): Promise<QuoteBalance[]> {
    const data = await api.get<QuoteBalance[]>(`/payments/quotes/${encodeURIComponent(customerId)}/balance?customerId=${encodeURIComponent(customerId)}`, { auth: true });
    return data;
  },

  async exportPdf(id: string): Promise<Blob> {
    const path = `/payments/${encodeURIComponent(id)}/pdf`;
    return (api as { getBlob: (path: string, opts?: unknown) => Promise<Blob> }).getBlob(path);
  },
};
