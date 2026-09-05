import type { CategoryRepository } from '../../domain/repositories/ProductRepository';
import type { CategoryData } from '../../domain/entities/Category';
import { BadRequestError } from '../../../../shared/domain/errors';

export class CreateCategory {
  constructor(private readonly repo: CategoryRepository) {}
  async execute(input: { nombre: string; slug: string; parentId?: string | null }): Promise<CategoryData> {
    const normalizedParentId = input.parentId?.trim() || null;
    if (normalizedParentId) {
      const parent = await this.repo.findById(normalizedParentId);
      if (!parent) {
        throw new BadRequestError('La categoría padre seleccionada no existe.');
      }
    }
    return this.repo.create({ ...input, parentId: normalizedParentId });
  }
}

export class GetCategories {
  constructor(private readonly repo: CategoryRepository) {}
  execute(filters?: { page?: number; limit?: number }) {
    return this.repo.list(filters);
  }
}

export class UpdateCategory {
  constructor(private readonly repo: CategoryRepository) {}
  async execute(id: string, input: { nombre?: string; slug?: string; parentId?: string | null; estado?: 'ACTIVO' | 'INACTIVO' }): Promise<CategoryData> {
    const normalizedParentId = input.parentId?.trim() || null;
    if (normalizedParentId) {
      const parent = await this.repo.findById(normalizedParentId);
      if (!parent) {
        throw new BadRequestError('La categoría padre seleccionada no existe.');
      }
    }
    return this.repo.update(id, { ...input, parentId: normalizedParentId });
  }
}

export class DeleteCategory {
  constructor(private readonly repo: CategoryRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}

export class GetCategoryById {
  constructor(private readonly repo: CategoryRepository) {}
  execute(id: string) {
    return this.repo.findById(id);
  }
}

export class GetCategoriesWithLowStock {
  constructor(private readonly repo: CategoryRepository) {}
  execute() {
    return this.repo.findAllWithLowStockCount();
  }
}

