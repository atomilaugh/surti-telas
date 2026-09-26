import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, ProductCategory, productCategories } from './productTypes';

interface ProductState {
  products: Product[];
  categories: ProductCategory[];
  addProduct: (product: Omit<Product, 'id' | 'fechaPublicacion'>) => Product;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  publishProduct: (id: string) => boolean;
  unpublishProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  getProductsByStatus: (publicado?: boolean) => Product[];
  getCatalogProducts: () => Product[];
}

const generateId = () => `PRD-${Date.now().toString().slice(-6)}`;
const generateCodigo = () => `CAM-${(() => { const b = new Uint8Array(2); crypto.getRandomValues(b); return Math.floor(new Uint8Array(2).reduce((a, b) => a * 256 + b, 0) / 65536 * 9000 + 1000); })()}`;

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      categories: productCategories,

      addProduct: (product) => {
        const newProduct: Product = {
          ...product,
          id: generateId(),
          codigo: product.codigo || generateCodigo(),
          imagenes: product.imagenes || { principal: '', galeria: [] },
          etiquetas: product.etiquetas || {},
          publicado: false,
        };
        set((state) => ({ products: [...state.products, newProduct] }));
        return newProduct;
      },

      updateProduct: (id, updatedProduct) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updatedProduct } : p
          ),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      },

      publishProduct: (id) => {
        const product = get().products.find((p) => p.id === id);
        if (!product) return false;

        const isValid = product.imagenes?.principal && 
                       product.nombre && 
                       product.categoria && 
                       product.precio > 0;

        if (!isValid) return false;

        set((state) => ({
          products: state.products.map((p) =>
            p.id === id
              ? { ...p, publicado: true, fechaPublicacion: new Date().toISOString() }
              : p
          ),
        }));
        return true;
      },

      unpublishProduct: (id) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, publicado: false, fechaPublicacion: undefined } : p
          ),
        }));
      },

      getProduct: (id) => {
        return get().products.find((p) => p.id === id);
      },

      getProductsByStatus: (publicado) => {
        if (publicado === undefined) return get().products;
        return get().products.filter((p) => p.publicado === publicado);
      },

      getCatalogProducts: () => {
        return get().products.filter((p) => p.publicado && p.estado === 'activo');
      },
    }),
    {
      name: 'surtitelas-products-storage',
    }
  )
);