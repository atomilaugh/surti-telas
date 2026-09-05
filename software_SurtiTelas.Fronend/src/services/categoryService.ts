import { categoriesApi, type CategoryDTO, type CategoryWithStockDTO } from '@/infrastructure/api/categoriesApi';
import { toast } from 'sonner';

export type { CategoryDTO, CategoryWithStockDTO };

export const categoryService = {
  async list(): Promise<CategoryDTO[]> {
    try {
      const result = await categoriesApi.list({ limit: 100 });
      return result.data;
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'No se pudieron cargar las categorías');
      return [];
    }
  },

  async getById(id: string): Promise<CategoryDTO | null> {
    return categoriesApi.getById(id);
  },

  async create(input: { nombre: string; slug: string; parentId?: string | null }): Promise<CategoryDTO> {
    try {
      const body = { ...input };
      const trimmedParentId = typeof body.parentId === 'string' ? body.parentId.trim() : body.parentId;
      if (!trimmedParentId) {
        delete body.parentId;
      } else {
        body.parentId = trimmedParentId;
      }
      const created = await categoriesApi.create(body);
      toast.success('Categoría creada correctamente');
      return created;
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'No se pudo crear la categoría';
      toast.error(message);
      throw err;
    }
  },

  async update(id: string, changes: { nombre?: string; slug?: string; parentId?: string | null; estado?: 'ACTIVO' | 'INACTIVO' }): Promise<CategoryDTO> {
    try {
      const body = { ...changes };
      const trimmedParentId = typeof body.parentId === 'string' ? body.parentId.trim() : body.parentId;
      if (!trimmedParentId) {
        delete body.parentId;
      } else {
        body.parentId = trimmedParentId;
      }
      const updated = await categoriesApi.update(id, body);
      toast.success('Categoría actualizada correctamente');
      return updated;
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'No se pudo actualizar la categoría';
      toast.error(message);
      throw err;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await categoriesApi.remove(id);
      toast.success('Categoría eliminada correctamente');
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'No se pudo eliminar la categoría';
      toast.error(message);
      throw err;
    }
  },

  async getWithLowStock(): Promise<CategoryWithStockDTO[]> {
    try {
      return await categoriesApi.getWithLowStock();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'No se pudo cargar el estado de categorías');
      return [];
    }
  },
};
