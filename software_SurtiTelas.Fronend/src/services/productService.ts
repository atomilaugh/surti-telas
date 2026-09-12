import type { Producto } from '@/core/types';
import { catalogApi } from '@/infrastructure/api/catalogApi';
import { ApiError } from '@/infrastructure/api/httpClient';

/* ──────────────────────────────────────────────
   TIPOS DE RESPUESTA (envelope de la API)
   ────────────────────────────────────────────── */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const errMsg = (e: unknown): string =>
  e instanceof ApiError ? e.message : 'Error de comunicación con el servidor';

/* ──────────────────────────────────────────────
   productService — ahora consume el backend real
   (/catalog/products). Mantiene el contrato ApiResponse<T>
   para no romper los componentes que lo usan.
   ────────────────────────────────────────────── */
export const productService = {
  async getAll(query?: Record<string, string | number | boolean | undefined | null>): Promise<ApiResponse<Producto[]>> {
    try {
      const result = await catalogApi.list(query);
      return { success: true, data: result.data };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  },

  async getById(ref: string): Promise<ApiResponse<Producto | undefined>> {
    try {
      const found = await catalogApi.getByRef(ref);
      return { success: !!found, data: found ?? undefined, error: found ? undefined : 'Producto no encontrado' };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  },

  async create(data: Omit<Producto, 'ref'>): Promise<ApiResponse<Producto>> {
    try {
      const nuevo = await catalogApi.create(data as Partial<Producto>);
      return { success: true, data: nuevo, message: 'Producto creado exitosamente' };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  },

  async update(ref: string, data: Partial<Producto>): Promise<ApiResponse<Producto | undefined>> {
    try {
      const updated = await catalogApi.update(ref, data);
      return { success: true, data: updated, message: 'Producto actualizado' };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  },

  async delete(ref: string): Promise<ApiResponse<boolean>> {
    try {
      await catalogApi.remove(ref);
      return { success: true, data: true, message: 'Producto eliminado' };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  },

  async publish(ref: string): Promise<ApiResponse<Producto | undefined>> {
    try {
      const data = await catalogApi.publish(ref);
      return { success: true, data, message: 'Producto publicado correctamente' };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  },

  async unpublish(ref: string): Promise<ApiResponse<Producto | undefined>> {
    try {
      const data = await catalogApi.unpublish(ref);
      return { success: true, data, message: 'Producto despublicado' };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  },
};

/* ──────────────────────────────────────────────
   catalogService — Gestión de Productos (backend real)
   ────────────────────────────────────────────── */
export const catalogService = {
  async getPublishedProducts(): Promise<ApiResponse<Producto[]>> {
    try {
      const result = await catalogApi.list();
      return { success: true, data: result.data.filter((p) => p.publicado === true && p.estado !== 'Inactivo') };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  },

  async getFeaturedProducts(): Promise<ApiResponse<Producto[]>> {
    const result = await catalogService.getPublishedProducts();
    if (!result.success || !result.data) return result;
    return { success: true, data: result.data.filter((p) => p.destacado === true || p.nuevo === true) };
  },
};
