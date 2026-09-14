import { Request, Response } from 'express';
import { ok, created, noContent } from '../../../../shared/presentation/http/HttpResponse';
import { buildApiPaginatedResponse } from '../../../../shared/presentation/http/PaginatedResponse';
import { parseDto } from '../../../../shared/presentation/http/validate';
import { BadRequestError } from '../../../../shared/domain/errors';
import { PaymentFiltersSchema, CreatePaymentSchema, UpdatePaymentStatusSchema, UpdatePaymentSchema, CancelPaymentSchema } from '../validators/payment.validators';
import { paymentUseCases } from '../../infrastructure/container/paymentContainer';
import type { PaymentStatus } from '../../domain/entities/Payment';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { eventBus } from '../../../../shared/infrastructure/eventBus';
import { PaymentCreatedEvent, PaymentStatusUpdatedEvent, PaymentUpdatedEvent, PaymentDeletedEvent } from '../../../../shared/application/events';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../config/database';

export const listPayments = async (req: Request, res: Response) => {
  const filters = parseDto(PaymentFiltersSchema, req.query);
  if (req.user?.role === 'ASESOR') {
    filters.asesorId = req.user.id;
  } else if (req.user?.role === 'CLIENTE') {
    filters.customerId = req.user.id;
  }
  const result = await paymentUseCases.listPayments.execute(filters as { customerId?: string; asesorId?: string; status?: PaymentStatus; search?: string });
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const response = buildApiPaginatedResponse(
    result.data,
    result.total,
    page,
    limit,
    null
  );
  return ok(res, response);
};

export const getPayment = async (req: Request, res: Response) => {
  const payment = await paymentUseCases.getPaymentById.execute(req.params.id);
  if (!payment) {
    return res.status(404).json({ success: false, error: 'not_found', message: 'Pago no encontrado' });
  }
  return ok(res, payment);
};

export const createPayment = async (req: Request, res: Response) => {
  const input = parseDto(CreatePaymentSchema, req.body);
  const order = await prisma.order.findFirst({ where: { id: input.orderId, deletedAt: null }, select: { total: true } });
  if (order) {
    const total = Number(order.total) || 0;
    const aprobadoExiste = await prisma.payment.count({
      where: { orderId: input.orderId, status: 'APPROVED' },
    });
    if (aprobadoExiste === 0) {
      const minimo = total * 0.3;
      if (input.amount < minimo) {
        throw new BadRequestError('El abono mínimo permitido es del 30%.');
      }
    }
  }
  const payment = await paymentUseCases.createPayment.execute({
    ...input,
    asesorId: req.user?.role === 'ASESOR' ? req.user.id : input.asesorId,
  });
  eventBus.publish(
    new PaymentCreatedEvent({
      paymentId: payment.id,
      orderId: payment.orderId,
      customerId: payment.customerId,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      asesorId: payment.asesorId,
    }),
    req.requestId
  );
  return created(res, payment, 'Pago creado');
};export const updatePaymentStatus = async (req: Request, res: Response) => {
  const { status } = parseDto(UpdatePaymentStatusSchema, req.body);
  const previous = await paymentUseCases.getPaymentById.execute(req.params.id);
  const payment = await paymentUseCases.updatePaymentStatus.execute(req.params.id, status);
  eventBus.publish(
    new PaymentStatusUpdatedEvent({
      paymentId: payment.id,
      orderId: payment.orderId,
      customerId: payment.customerId,
      previousStatus: previous?.status ?? status,
      newStatus: status,
      amount: payment.amount,
      asesorId: payment.asesorId,
    }),
    req.requestId
  );
  return ok(res, payment, 'Estado del pago actualizado');
};

export const updatePayment = async (req: Request, res: Response) => {
  const changes = parseDto(UpdatePaymentSchema, req.body);
  const payment = await paymentUseCases.updatePayment.execute(req.params.id, changes);
  eventBus.publish(
    new PaymentUpdatedEvent({
      paymentId: payment.id,
      orderId: payment.orderId,
      customerId: payment.customerId,
      cambios: changes,
      asesorId: payment.asesorId,
    }),
    req.requestId
  );
  return ok(res, payment, 'Pago actualizado');
};

export const deletePayment = async (req: Request, res: Response) => {
  const payment = await paymentUseCases.getPaymentById.execute(req.params.id);
  await paymentUseCases.deletePayment.execute(req.params.id);
  eventBus.publish(
    new PaymentDeletedEvent({
      paymentId: req.params.id,
      orderId: payment?.orderId,
      customerId: payment?.customerId ?? '',
      asesorId: payment?.asesorId,
    }),
    req.requestId
  );
  return noContent(res);
};

export const cancelPayment = async (req: Request, res: Response) => {
  const { motivoAnulacion } = parseDto(CancelPaymentSchema, req.body);
  const payment = await paymentUseCases.cancelPayment.execute(req.params.id, motivoAnulacion);
  eventBus.publish(
    new PaymentStatusUpdatedEvent({
      paymentId: payment.id,
      orderId: payment.orderId,
      customerId: payment.customerId,
      previousStatus: payment.status === 'ANULADO' ? 'PENDING' : payment.status,
      newStatus: 'ANULADO',
      amount: payment.amount,
      asesorId: payment.asesorId,
    }),
    req.requestId
  );
  return ok(res, payment, 'Pago anulado correctamente');
};

export const getCustomerBalance = async (req: Request, res: Response) => {
  const customerId = req.params.customerId;
  const balance = await paymentUseCases.getCustomerBalance.execute(customerId);
  return ok(res, balance, 'Saldo calculado');
};

export const getQuoteBalance = async (req: Request, res: Response) => {
  try {
    const quoteId = req.params.quoteId;
    const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;

    if (customerId) {
      const balances = await paymentUseCases.getQuoteBalanceByCustomer.execute(customerId);
      return ok(res, balances, 'Saldos de cotización calculados');
    }

    const balance = await paymentUseCases.getQuoteBalance.execute(quoteId);
    return ok(res, balance, 'Saldo de cotización calculado');
  } catch (error) {
    if (error instanceof Error && error.message === 'Cotización no encontrada') {
      return res.status(404).json({ success: false, error: 'not_found', message: 'Cotización no encontrada' });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({ success: false, error: 'bad_request', message: 'Datos inválidos para calcular el saldo' });
    }
    throw error;
  }
};

export const exportPaymentPdf = async (req: Request, res: Response) => {
  const payment = await paymentUseCases.getPaymentById.execute(req.params.id);
  if (!payment) {
    return res.status(404).json({ success: false, error: 'not_found', message: 'Pago no encontrado' });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText('Comprobante de Pago', { x: 50, y: 800, size: 20, font: boldFont });
  page.drawText(`ID: ${payment.id}`, { x: 50, y: 770, size: 12, font });
  page.drawText(`Orden: ${payment.orderId}`, { x: 50, y: 750, size: 12, font });
  page.drawText(`Cliente: ${payment.customerId}`, { x: 50, y: 730, size: 12, font });
  page.drawText(`Monto: $${payment.amount.toFixed(2)}`, { x: 50, y: 710, size: 12, font });
  page.drawText(`Método: ${payment.method}`, { x: 50, y: 690, size: 12, font });
  page.drawText(`Estado: ${payment.status}`, { x: 50, y: 670, size: 12, font });
  page.drawText(`Referencia: ${payment.reference ?? 'N/A'}`, { x: 50, y: 650, size: 12, font });
  page.drawText(`Notas: ${payment.notes ?? 'N/A'}`, { x: 50, y: 630, size: 12, font });
  page.drawText(`Fecha: ${new Date(payment.createdAt).toLocaleString()}`, { x: 50, y: 610, size: 12, font });

  const pdfBytes = await pdfDoc.save();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="pago-${payment.id}.pdf"`);
  res.send(Buffer.from(pdfBytes));
  return;
};
