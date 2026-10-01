import { prisma } from '../../../../config/database';
import { PrismaCategoryRepository } from '../repositories/PrismaCategoryRepository';
import { PrismaProductRepository } from '../repositories/PrismaProductRepository';
import {
  CreateProduct,
  DeleteProduct,
  GetBrands,
  GetProductByRef,
  GetProducts,
  GetSubcategories,
  PublishProduct,
  UnpublishProduct,
  UpdateProduct,
} from '../../application/use-cases/ProductUseCases';
import { CreateCategory, GetCategories, GetCategoryById, UpdateCategory, DeleteCategory, GetCategoriesWithLowStock } from '../../application/use-cases/CategoryUseCases';

const productRepository = new PrismaProductRepository(prisma);
const categoryRepository = new PrismaCategoryRepository(prisma);

export const catalogUseCases = {
  createProduct: new CreateProduct(productRepository),
  getProducts: new GetProducts(productRepository),
  getBrands: new GetBrands(productRepository),
  getSubcategories: new GetSubcategories(productRepository),
  getProductByRef: new GetProductByRef(productRepository),
  updateProduct: new UpdateProduct(productRepository),
  deleteProduct: new DeleteProduct(productRepository),
  publishProduct: new PublishProduct(productRepository),
  unpublishProduct: new UnpublishProduct(productRepository),
  createCategory: new CreateCategory(categoryRepository),
  getCategories: new GetCategories(categoryRepository),
  getCategoryById: new GetCategoryById(categoryRepository),
  updateCategory: new UpdateCategory(categoryRepository),
  deleteCategory: new DeleteCategory(categoryRepository),
  getCategoriesWithLowStock: new GetCategoriesWithLowStock(categoryRepository),
};
