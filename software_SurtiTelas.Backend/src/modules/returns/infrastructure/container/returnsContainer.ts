import { PrismaClient } from '@prisma/client';
import { PrismaReturnRepository } from '../repositories/PrismaReturnRepository';
import { PrismaReturnRequestRepository } from '../repositories/PrismaReturnRequestRepository';
import { PrismaWarrantyPolicyRepository } from '../repositories/PrismaWarrantyPolicyRepository';
import { eventBus } from '../../../../shared/infrastructure/eventBus';
import {
  ChangeReturnStatus,
  CreateReturn,
  DeleteReturn,
  GetReturn,
  ListReturns,
  UpdateReturn,
} from '../../application/use-cases/ReturnUseCases';
import {
  ListReturnRequests,
  GetReturnRequest,
  GetReturnRequestWithRelations,
  CreateReturnRequest,
  ChangeReturnRequestStatus,
  AddReturnItem,
  ApproveReturnItem,
  CompleteReturnInspection,
  AssignReturnResolution,
  CreateReturnHistoryEntry,
  ListReturnItems,
  ListReturnHistories,
} from '../../application/use-cases/ReturnRequestUseCases';
import {
  ListWarrantyPolicies,
  GetWarrantyPolicy,
  GetWarrantyPolicyByTipo,
  CreateWarrantyPolicy,
  UpdateWarrantyPolicy,
  DeleteWarrantyPolicy,
} from '../../application/use-cases/WarrantyPolicyUseCases';

const prisma = new PrismaClient();

const returnRepository = new PrismaReturnRepository(prisma);
const returnRequestRepository = new PrismaReturnRequestRepository(prisma);
const warrantyPolicyRepository = new PrismaWarrantyPolicyRepository(prisma);

export const returnsUseCases = {
  listReturns: new ListReturns(returnRepository),
  getReturn: new GetReturn(returnRepository),
  createReturn: new CreateReturn(returnRepository, prisma, eventBus),
  updateReturn: new UpdateReturn(returnRepository, eventBus),
  changeReturnStatus: new ChangeReturnStatus(returnRepository, eventBus),
  deleteReturn: new DeleteReturn(returnRepository, eventBus),
};

export const warrantyPolicyUseCases = {
  listPolicies: new ListWarrantyPolicies(warrantyPolicyRepository),
  getPolicy: new GetWarrantyPolicy(warrantyPolicyRepository),
  getPolicyByTipo: new GetWarrantyPolicyByTipo(warrantyPolicyRepository),
  createPolicy: new CreateWarrantyPolicy(warrantyPolicyRepository, eventBus),
  updatePolicy: new UpdateWarrantyPolicy(warrantyPolicyRepository, eventBus),
  deletePolicy: new DeleteWarrantyPolicy(warrantyPolicyRepository),
};

export const returnRequestUseCases = {
  listRequests: new ListReturnRequests(returnRequestRepository),
  getRequest: new GetReturnRequest(returnRequestRepository),
  getRequestWithRelations: new GetReturnRequestWithRelations(returnRequestRepository),
  createRequest: new CreateReturnRequest(returnRequestRepository, prisma, warrantyPolicyRepository, eventBus),
  changeRequestStatus: new ChangeReturnRequestStatus(returnRequestRepository, eventBus),
  addItem: new AddReturnItem(returnRequestRepository, eventBus),
  approveItem: new ApproveReturnItem(returnRequestRepository, eventBus),
  completeInspection: new CompleteReturnInspection(returnRequestRepository, eventBus),
  assignResolution: new AssignReturnResolution(returnRequestRepository, eventBus),
  createHistoryEntry: new CreateReturnHistoryEntry(returnRequestRepository),
  listItems: new ListReturnItems(returnRequestRepository),
  listHistories: new ListReturnHistories(returnRequestRepository),
};
