import { z } from 'zod';

export const ColorStockSchema = z.object({
  color: z.string().trim().min(1, 'El color es obligatorio'),
  size: z.string().trim().optional(),
  cantidad: z.number().int('La cantidad debe ser un número entero').nonnegative('La cantidad no puede ser negativa'),
  stock: z.enum(['OK', 'Bajo stock', 'Agotado']).optional(),
});

export const ProductSchema = z.object({
  ref: z.string().min(1).optional(),
  codigo: z.string().optional(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  descripcionCorta: z.string().optional(),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  categoriaId: z.string().optional(),
  subcategoria: z.string().optional(),
  marca: z.string().optional(),
  precio: z.number().nonnegative('Precio no negativo'),
  precioAnterior: z.number().nonnegative().optional(),
  descuento: z.number().min(0).max(100).optional(),
  /** Se omite cuando se envia `stockPorColor`: el total es la suma de las variantes. */
  cantidadStock: z.number().int().nonnegative().optional(),
  stock: z.enum(['OK', 'Bajo stock', 'Agotado']).optional(),
  estado: z.enum(['Activo', 'Inactivo']).optional(),
  imagenes: z.array(z.string()),
  imagenPrincipal: z.string().optional(),
  publicado: z.boolean(),
  destacado: z.boolean().optional(),
  oferta: z.boolean().optional(),
  nuevo: z.boolean().optional(),
  masVendido: z.boolean().optional(),
  tela: z.string().min(1, 'La tela es obligatoria'),
  colores: z.array(z.string()).min(1, 'Al menos un color'),
  stockPorColor: z.array(ColorStockSchema).optional(),
  tallas: z.array(z.string()).min(1, 'Al menos una talla'),
});

export const ProductUpdateSchema = ProductSchema.partial();

export const CategorySchema = z.object({
  nombre: z.string().min(1),
  slug: z.string().min(1),
  parentId: z.string().nullable().optional(),
});

export const CategoryUpdateSchema = CategorySchema.partial();

export const CategoryFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export const ProductFiltersSchema = z.object({
  search: z.string().optional(),
  categoriaId: z.string().optional(),
  categoria: z.string().optional(),
  marca: z.string().optional(),
  publicado: z.boolean().optional(),
  destacado: z.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  sort: z.enum(['nombre', 'precio', 'createdAt', 'cantidadStock']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  marcas: z.array(z.string()).optional(),
  categoriasEspeciales: z.array(z.string()).optional(),
  tallas: z.array(z.string()).optional(),
});
