# SurtiTelas — Fase 3 Implementation Report (Backend Hardening & Type Sync)

**Date**: 2026-09-17

## Objectives Implemented

1. ✅ Validar INSTALLMENTS en backend (check isTrustedCustomer)
2. ✅ Validar total del pedido contra sus productos
3. ✅ Corregir/sincronizar tipo `Pedido.total` (string → number)
4. ✅ Mantener compatibilidad con flujos actuales

---

## Changes Made

### Objective 1: INSTALLMENTS Backend Validation

**File**: `software_SurtiTelas.Backend/src/modules/payments/infrastructure/container/paymentContainer.ts`

- `CreatePayment` constructor now takes `(repo: PaymentRepository, prisma: PrismaClient)` instead of just `(repo: PaymentRepository)`.
- Added validation at the start of `execute()`: if `tipoPago` is `'CUOTA'` or `'PAGO_SALDO'`, looks up customer via `customerId` and checks `isTrustedCustomer`. If not trusted, throws `BadRequestError('Solo los clientes de confianza pueden seleccionar pago a cuotas.')`.
- Updated `paymentUseCases.createPayment` instantiation to pass `prisma`: `new CreatePayment(repository, prisma)`.
- Added imports: `PrismaClient` from `@prisma/client`, `BadRequestError` from shared domain errors.

**Existing validation** (already in `OrderUseCases.ts:167`):
```ts
if ((input.paymentMethod === 'OTHER' || input.paymentMethod === 'INSTALLMENTS') && !customer.isTrustedCustomer) {
  throw new BadRequestError('Solo los clientes de confianza pueden seleccionar pago a cuotas');
}
```
This ensures CreateOrder also validates INSTALLMENTS at order creation time.

---

### Objective 2: Validate Order Total Against Products

**File**: `software_SurtiTelas.Backend/src/modules/orders/application/use-cases/OrderUseCases.ts` (CreateOrder.execute, lines ~171-188)

Added consistency validation when `itemsList` is provided:
- Computes `computedSubtotal = itemsList.reduce((sum, item) => sum + item.precio * item.cantidad, 0)`.
- If `input.subtotal` is provided and differs from `computedSubtotal` by >0.01: throws `BadRequestError('El subtotal no coincide con el cálculo de los productos.')`.
- If `input.impuestos` is provided and differs from `computedSubtotal * 0.19` by >0.01: throws `BadRequestError('Los impuestos no coinciden con el cálculo del subtotal (19%).')`.
- If `input.descuentos` is negative: throws `BadRequestError('Los descuentos no pueden ser negativos.')`.
- If `input.descuentos` exceeds `computedSubtotal`: throws `BadRequestError('Los descuentos no pueden superar el subtotal.')`.

---

### Objective 3: Fix Pedido.total Type (string → number)

**File**: `software_SurtiTelas.Fronend/src/core/types/index.ts`
- `Pedido.total`: `string` → `number`

**File**: `software_SurtiTelas.Fronend/src/infrastructure/api/ordersApi.ts` (toPedido function)
- `total: formatCurrency(dto.total)` → `total: Number(dto.total)`
- Total is now passed as a number through the API layer instead of being pre-formatted as a currency string.

**File**: `software_SurtiTelas.Fronend/src/shared/utils/orderPayment.ts`
- `parseCurrency(pedido?.total)` → `toNumber(pedido?.total)` (handles number input correctly)

**File**: `software_SurtiTelas.Fronend/src/core/stores/index.ts`
- `parseTotal(total: string)` → `parseTotal(total: number | string)` (parameter type widened)
- `parseInt(total.replace(...))` → `parseInt(String(total).replace(...))` (converts number to string first)

**File**: `software_SurtiTelas.Fronend/src/presentation/pages/admin/Pagos.tsx`
- `parsePedidoTotal(valor: string | undefined)` → `parsePedidoTotal(valor: number | string | undefined)` (parameter type widened)

**File**: `software_SurtiTelas.Fronend/src/presentation/pages/asesor/Pedidos.tsx`
- `_emptyPedidoForm.total: "0"` → `_emptyPedidoForm.total: 0` (type consistency)

**File**: `software_SurtiTelas.Fronend/src/presentation/pages/asesor/Dashboard.tsx`
- `parseInt(p.total.replace(/[^0-9]/g, '', 10) || 0)` → `Number(p.total) || 0` (direct number usage)

**Display fixes** (to avoid showing raw numbers instead of formatted currency):
- `PortalCliente.tsx:97`: `Total: ${order.total}` → `Total: ${typeof order.total === 'number' ? order.total.toLocaleString('es-CO') : order.total}`
- `InicioCliente.tsx:129`: Template literal updated to format total as number with `toLocaleString('es-CO')`

---

## Verification

### Backend TypeScript
- `npx tsc --noEmit` → **0 errors** ✅

### Frontend TypeScript
- `npx tsc --noEmit` → **4 pre-existing errors** (Pedidos.tsx comparison, leftIcon, StatusBadge size x2). All errors from our changes are fixed. ✅

### Backend Tests (vitest run)
- **622 passed, 13 failed (5 test files)** — all 13 failures are pre-existing:
  - Order.test.ts:1 failure (canTransitionTo from 'Listo') — pre-existing
  - PrismaCustomerRepository.test.ts:1 failure (mock mismatch) — pre-existing
  - auth.middleware.test.ts:3 failures — pre-existing
  - orders-status-transitions.integration.test.ts:6 failures — integration test DB setup issues — pre-existing
  - orders-cancel-status.integration.test.ts:2 failures — integration test DB setup issues — pre-existing

### No Breaking Changes
- All existing payment flows remain intact (PAGO_INMEDIATO, ABONO_INICIAL unaffected)
- All existing order creation flows remain intact
- Frontend displays continue to work (formatting applied where needed)

---

## Files Modified Summary

| File | Objective | Change |
|------|-----------|--------|
| `Backend/.../payments/infrastructure/container/paymentContainer.ts` | 1 | CreatePayment now checks isTrustedCustomer for CUOTA/PAGO_SALDO |
| `Backend/.../orders/application/use-cases/OrderUseCases.ts` | 2 | Added subtotal/impuestos/descuentos consistency validation |
| `Frontend/.../core/types/index.ts` | 3 | Pedido.total: string → number |
| `Frontend/.../infrastructure/api/ordersApi.ts` | 3 | toPedido: total as Number, not formatCurrency |
| `Frontend/.../shared/utils/orderPayment.ts` | 3 | parseCurrency → toNumber for Pedido.total |
| `Frontend/.../core/stores/index.ts` | 3 | parseTotal parameter widened to number |
| `Frontend/.../admin/Pagos.tsx` | 3 | parsePedidoTotal parameter widened |
| `Frontend/.../asesor/Pedidos.tsx` | 3 | _emptyPedidoForm.total: "0" → 0 |
| `Frontend/.../asesor/Dashboard.tsx` | 3 | Number(p.total) instead of parseInt(p.total.replace()) |
| `Frontend/.../admin/PortalCliente.tsx` | 3 | Display formatting for number total |
| `Frontend/.../cliente/InicioCliente.tsx` | 3 | Display formatting for number total |
