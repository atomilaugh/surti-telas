import { prisma } from '../../../../config/database';
import { PrismaCustomerRepository } from '../repositories/PrismaCustomerRepository';
import { eventBus } from '../../../../shared/infrastructure/eventBus';
import {
  AssignAsesor,
  CreateCustomer,
  DeleteCustomer,
  GetCustomerById,
  GetCustomerTrustedStatus,
  GetCustomers,
  SearchCustomersByDocument,
  UpdateCustomer,
  UpdateCupo,
} from '../../application/use-cases/CustomerUseCases';

const customerRepository = new PrismaCustomerRepository(prisma);

export const customerUseCases = {
  createCustomer: new CreateCustomer(customerRepository, eventBus),
  getCustomers: new GetCustomers(customerRepository),
  getCustomerById: new GetCustomerById(customerRepository),
  getCustomerTrustedStatus: new GetCustomerTrustedStatus(customerRepository),
  searchByDocument: new SearchCustomersByDocument(customerRepository),
  updateCustomer: new UpdateCustomer(customerRepository, eventBus),
  assignAsesor: new AssignAsesor(customerRepository, eventBus),
  updateCupo: new UpdateCupo(customerRepository),
  deleteCustomer: new DeleteCustomer(customerRepository),
};
