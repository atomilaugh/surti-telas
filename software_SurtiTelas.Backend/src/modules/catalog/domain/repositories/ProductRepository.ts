import type { Product, ProductData } from '../entities/Product';
import type { CategoryData } from '../entities/Category';

export interface CreateProductInput extends Omit<ProductData, 'id' | 'ref'> {
  ref?: string;
  categoriaId?: string;
}

export interface UpdateProductInput extends Partial<ProductData> {
  categoriaId?: string;
}

export interface ProductFilters {
  search?: string;
  categoriaId?: string;
  categoria?: string;
  marca?: string;
  publicado?: boolean;
  destacado?: boolean;
  page?: number;
  limit?: number;
  cursor?: string;
  sort?: 'nombre' | 'precio' | 'createdAt' | 'cantidadStock';
  order?: 'asc' | 'desc';
  marcas?: string[];
  categoriasEspeciales?: string[];
  tallas?: string[];
}

export interface ProductRepository {
  list(filters?: ProductFilters): Promise<{ data: Product[]; meta: { total: number; page?: number; limit: number; nextCursor?: string } }>;
  getById(id: string): Promise<Product | null>;
  getByRef(ref: string): Promise<Product | null>;
  create(input: CreateProductInput): Promise<Product>;
  update(ref: string, changes: UpdateProductInput): Promise<Product>;
  delete(ref: string): Promise<void>;
  getBrands(): Promise<string[]>;
  getSubcategories(): Promise<string[]>;
}

export interface CategoryRepository {
  list(filters?: { page?: number; limit?: number }): Promise<{ data: CategoryData[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }>;
  create(input: { nombre: string; slug: string; parentId?: string | null }): Promise<CategoryData>;
  findById(id: string): Promise<CategoryData | null>;
  findBySlug(slug: string): Promise<CategoryData | null>;
  update(id: string, input: { nombre?: string; slug?: string; parentId?: string | null }): Promise<CategoryData>;
  delete(id: string): Promise<void>;
  findAllWithLowStockCount(): Promise<
    Array<CategoryData & { totalProductos: number; productosBajoStock: number; productosAgotados: number }>
  >;
}
