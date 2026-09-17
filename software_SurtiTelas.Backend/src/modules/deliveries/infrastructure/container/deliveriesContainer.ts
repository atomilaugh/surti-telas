import { PrismaClient } from '@prisma/client';
import { PrismaDeliveryRepository } from '../repositories/PrismaDeliveryRepository';
import { PrismaOrderRepository } from '../../../orders/infrastructure/repositories/PrismaOrderRepository';
import { eventBus } from '../../../../shared/infrastructure/eventBus';
import {
  ChangeDeliveryStatus,
  CreateDelivery,
  DeleteDelivery,
  GetDelivery,
  ListDeliveries,
  ListRutaDelDia,
  UpdateDelivery,
} from '../../application/use-cases/DeliveryUseCases';

const prisma = new PrismaClient();

const deliveryRepository = new PrismaDeliveryRepository(prisma);
const orderRepository = new PrismaOrderRepository(prisma);

export const deliveriesUseCases = {
  listDeliveries: new ListDeliveries(deliveryRepository),
  getDelivery: new GetDelivery(deliveryRepository),
  createDelivery: new CreateDelivery(deliveryRepository, prisma, eventBus),
  updateDelivery: new UpdateDelivery(deliveryRepository, eventBus),
  changeDeliveryStatus: new ChangeDeliveryStatus(deliveryRepository, orderRepository, eventBus),
  deleteDelivery: new DeleteDelivery(deliveryRepository, eventBus),
  listRutaDelDia: new ListRutaDelDia(deliveryRepository),
};
