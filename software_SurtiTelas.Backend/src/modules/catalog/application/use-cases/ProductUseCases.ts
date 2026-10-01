import { NotFoundError } from '../../../../shared/domain/errors';
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput,
} from '../../domain/repositories/ProductRepository';
import { eventBus } from '../../../../shared/infrastructure/eventBus';
import { ProductCreatedEvent, ProductUpdatedEvent, ProductDeletedEvent } from '../../../../shared/application/events';

export class CreateProduct {
  constructor(private readonly repo: ProductRepository) {}
  async execute(input: CreateProductInput) {
    const product = await this.repo.create(input);
    eventBus.publish(
      new ProductCreatedEvent({
        productId: product.id ?? product.ref,
        nombre: product.nombre,
      })
    );
    return product;
  }
}

export class GetProducts {
  constructor(private readonly repo: ProductRepository) {}
  execute(filters?: ProductFilters) {
    return this.repo.list(filters);
  }
}

export class GetBrands {
  constructor(private readonly repo: ProductRepository) {}
  execute() {
    return this.repo.getBrands();
  }
}

export class GetSubcategories {
  constructor(private readonly repo: ProductRepository) {}
  execute() {
    return this.repo.getSubcategories();
  }
}

export class GetProductByRef {
  constructor(private readonly repo: ProductRepository) {}
  async execute(ref: string) {
    const product = await this.repo.getByRef(ref);
    if (!product) throw new NotFoundError('Producto no encontrado');
    return product;
  }
}

export class UpdateProduct {
  constructor(private readonly repo: ProductRepository) {}
  async execute(ref: string, changes: UpdateProductInput) {
    const product = await this.repo.update(ref, changes);
    eventBus.publish(
      new ProductUpdatedEvent({
        productId: product.id ?? product.ref,
        nombre: product.nombre,
        cambios: changes,
      })
    );
    return product;
  }
}

export class DeleteProduct {
  constructor(private readonly repo: ProductRepository) {}
  async execute(ref: string) {
    const product = await this.repo.getByRef(ref);
    await this.repo.delete(ref);
    if (product) {
      eventBus.publish(
        new ProductDeletedEvent({
          productId: product.id ?? product.ref,
          nombre: product.nombre,
        })
      );
    }
  }
}

export class PublishProduct {
  constructor(private readonly repo: ProductRepository) {}
  async execute(ref: string) {
    const product = await this.repo.getByRef(ref);
    if (!product) throw new NotFoundError('Producto no encontrado');
    const published = product.publish();
    return this.repo.update(ref, { publicado: published.publicado, estado: published.estado });
  }
}

export class UnpublishProduct {
  constructor(private readonly repo: ProductRepository) {}
  async execute(ref: string) {
    const product = await this.repo.getByRef(ref);
    if (!product) throw new NotFoundError('Producto no encontrado');
    const unpublished = product.unpublish();
    return this.repo.update(ref, { publicado: unpublished.publicado, estado: unpublished.estado });
  }
}
