# SurtiTelas — Fase 5 Diagnostic Report (Ruta del Día / Domicilios)

**Date**: 2026-09-17

## Objective
Diagnose Ruta del Día and Domicilios module (READ-ONLY, no code changes).

---

## 1. Backend — Delivery Entity (Delivery.ts)

| Field | Type | Notes |
|-------|------|-------|
| id | string? | Auto-generated |
| orderId | string | **@unique** in Prisma (1:1 with Order) |
| domiciliarioId | string? | Nullable |
| estado | DeliveryEstado | ASIGNADO, EN_RUTA, ENTREGADO, FALLIDO |
| direccion, ciudad, telefono, notas, motivo | string? | Optional |
| asignadoEn, inicioRutaEn, entregadoEn | DateTime? | Timestamps |
| createdAt, updatedAt | Date | Auto |
| orderNumero, clienteNombre, domiciliarioNombre | string? | Denormalized |

**Missing**: No `fallidoEn` timestamp for FALLIDO state tracking.

**Domain methods**: `asignar()`, `marcarEnRuta()`, `marcarEntregado()`, `marcarFallido()` — clean state-machine methods.

---

## 2. DeliveryRepository + PrismaDeliveryRepository

**Interface** (`DeliveryRepository.ts`): Standard CRUD (list, getById, create, update, delete) + DeliveryData/DeliveryFilters/DeliveryListResult types.

**PrismaDeliveryRepository**: Well-implemented. Uses `include` with order+cliente and domiciliario. Soft delete via `deletedAt`. Create maps all fields including date timestamps. `update` uses `toUpdateInput` with selective field updates.

**Key observation**: `ListRutaDelDia` use case does NOT use repository — it takes `PrismaClient` directly (see issue #2).

---

## 3. DeliveryUseCases

### ListRutaDelDia (lines 21-110)
- **Does NOT use DeliveryRepository** — injected with `PrismaClient` directly (breaks DIP).
- Uses `as any` casts on `include` and `domiciliariosRaw`.
- Logic: When `domiciliarioId` filter is set, uses `OR: [{ domiciliarioId }, { domiciliarioId: null, order.estado in ['DESPACHADO','EN_CAMINO'] }]`.
- Without filter: `estado: { in: ['ASIGNADO', 'EN_RUTA', 'ENTREGADO', 'FALLIDO'] }`.
- Also queries `prisma.domiciliario.findMany({ where: { activo: true } })` — implies separate `Domiciliario` model exists in Prisma.
- Builds `domiciliarioZonaMap` from userId→zona.
- Returns unmapped array (not paginated).

### ChangeDeliveryStatus (lines 179-248)
- **Transitions**: ASIGNADO→[EN_RUTA, FALLIDO], EN_RUTA→[ENTREGADO, FALLIDO], ENTREGADO→[], FALLIDO→[].
- **Role check**: Non-DOMICILIARIO users CANNOT mark ENTREGADO/FALLIDO (includes ADMIN).
- On ENTREGADO: calls `orderRepo.updateStatus(existing.orderId, 'Entregado')`.
- Publishes `DeliveryStatusUpdatedEvent` only when status actually changes.

### CreateDelivery (lines 122-154)
- Sets `estado: 'ASIGNADO'`, `asignadoEn: new Date()` automatically.
- Publishes `DeliveryCreatedEvent` with **`total: 0`** — should be order total (hardcoded bug).

### UpdateDelivery (lines 157-176): Standard update + `DeliveryUpdatedEvent`.

### DeleteDelivery (lines 251-269): Soft delete + `DeliveryCompletedEvent`.

---

## 4. Delivery Controller + Routes

**Controller** (`delivery.controller.ts`): 7 endpoints. All use `parseDto` validation. DOMICILIARIO role auto-filtered in list/ruta endpoints. `clearCache` after mutations.

**Routes** (`delivery.routes.ts`):
- GET `/` — `orders:read` → listDeliveries (paginated)
- GET `/ruta-del-dia` — `orders:read` → listRutaDelDia (**not paginated**)
- GET `/:id` — `orders:read` + UUID/CUID validation
- POST `/` — `orders:create` + rate limiter
- PATCH `/:id` — `orders:update` + rate limiter + validation
- PATCH `/:id/status` — `orders:update` + rate limiter + validation
- DELETE `/:id` — `requireRole('ADMIN')` + rate limiter + validation

---

## 5. Prisma Schema — Delivery Model (lines 850-872)

```prisma
model Delivery {
  id             String    @id @default(cuid())
  orderId        String    @unique @map("order_id")  // 1:1 with Order
  domiciliarioId String?   @map("domiciliario_id")
  estado         String    @default("ASIGNADO")
  direccion      String
  ciudad         String?
  telefono       String?
  notas          String?
  asignadoEn     DateTime?
  entregadoEn    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime? @map("deleted_at")
  inicioRutaEn   DateTime? @map("inicio_ruta_en")
  motivo         String?
  domiciliario   User?     @relation("DomiciliarioDeliveries", fields: [domiciliarioId], references: [id])
  order          Order     @relation(fields: [orderId], references: [id])
  @@index([domiciliarioId])
  @@index([deletedAt])
  @@map("deliveries")
}
```

**Missing**: No `fallidoEn`. No cascade delete on Order relation. `orderId` @unique = strict 1:1.

---

## 6. DeliveryMapper

Clean explicit mapping. `toDeliveryData` (row→data), `toDelivery` (data→entity), `toCreateInput` (entity→create), `toUpdateInput` (changes→partial update). No issues.

---

## 7. Events (events.ts:760-824)

| Event | Type | Key Payload |
|-------|------|-------------|
| DeliveryCreatedEvent | `delivery.created` | deliveryId, orderId, orderNumero, total (**0 hardcoded**) |
| DeliveryUpdatedEvent | `delivery.updated` | deliveryId, orderId, cambios |
| DeliveryStatusUpdatedEvent | `delivery.status.updated` | deliveryId, orderId, previousStatus, newStatus |
| DeliveryCompletedEvent | `delivery.completed` | deliveryId, orderId (on delete) |

---

## 8. Container (deliveriesContainer.ts)

```ts
listRutaDelDia: new ListRutaDelDia(prisma),  // ← PrismaClient injected, not repository
```
All other use cases use `deliveryRepository`. DI inconsistency.

---

## 9. Validators (delivery.validators.ts)

Clean Zod schemas. `DeliveryStatusEnum` matches entity states exactly. `CreateDeliverySchema` requires `orderId`. `DeliveryFiltersSchema` supports pagination with cursor.

---

## 10. Tests

**No tests found** for deliveries module (`grep` in `**/*.test.ts` under `src/modules/deliveries` returned no files).

---

## 11. Frontend — RutaDelDiaAdmin.tsx (745 lines)

**Features**: Stats grid (total, sinDomiciliario, pendientes, enRuta, entregados, fallidos). Search, filter by estado + domiciliario. Row actions: assign driver, start route, mark failure, view detail. Detail modal with timeline. Failure modal with predefined reasons (`MOTIVOS_FALLO`). Assign driver modal with search. Export enabled.

**Uses**: `deliveriesApi.rutaDelDia()`, `deliveriesApi.updateStatus()`, `deliveriesApi.update()`, `usersApi.list({ role: 'DOMICILIARIO', estado: 'ACTIVO' })`.

---

## 12. Frontend — AdminDomicilios.tsx (302 lines)

**Features**: CRUD for domiciliarios (zona, vehículo, capacidad). Stats: total, activos, inactivos, pendientes. Search by nombre/email. Edit modal, delete soft-delete (`activo: false`).

**Uses**: `domiciliariosApi.list/update`, `usersApi.list({ role: 'DOMICILIARIO' })`.

---

## 13. Frontend — deliveriesApi.ts

- `DeliveryDTO`: Full delivery DTO with nested `order`.
- `Delivery` (separate): Simplified entity for mapping.
- `DeliveryRutaItem`: Extended type for Ruta del Día with all fields + order details.
- `toDelivery(dto)`: Maps DeliveryDTO→Delivery (simplified, drops nested order).
- `toDomiciliario(dto)`: **Semantic mismatch** — converts a delivery into a "Domiciliario" (aggregation by domiciliarioId). Used by `aggregateDomiciliarios`.
- `deliveriesApi`: `list()` (paginated), `rutaDelDia()` (array, no pagination), `updateStatus()`, `update()`.

---

## 14. Frontend Routing (App.tsx)

- `/admin/ruta-del-dia` under `AdminDomiciliosLayout` → `RutaDelDiaAdmin`
- `/admin/domicilios` under `AdminDomiciliosLayout` → `AdminDomicilios`
- Domiciliario role: `/ruta` → `RutaDelDia` (driver view)

---

## 15. Key Issues Summary

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | ✅ RESUELTO — `ListRutaDelDia` ya usa `DeliveryRepository` (sin Prisma directo) | Medium | DeliveryUseCases.ts:22 → ahora usa repo.listRutaDelDia() |
| 2 | ~~`ListRutaDelDia` uses `as any` casts~~ | ~~Low~~ | ~~DeliveryUseCases.ts:31, 61~~ → eliminados al mover lógica a PrismaDeliveryRepository |
| 3 | ~~`CreateDelivery` publishes `total: 0` — should be order total~~ | ~~High~~ | ~~DeliveryUseCases.ts:148~~ → **RESUELTO** |
| 4 | No `fallidoEn` timestamp in model/entity/mapper/schema | Low | Prisma schema, Delivery.ts, DeliveryMapper.ts |
| 5 | No tests for deliveries module | High | N/A |
| 6 | `toDomiciliario()` in deliveriesApi.ts — semantic mismatch (Delivery→Domiciliario conversion) | Low | deliveriesApi.ts:76-86 |
| 7 | `listRutaDelDia` endpoint returns non-paginated response vs `listDeliveries` (paginated) | Medium | delivery.controller.ts:42-43 |
| 8 | Non-DOMICILIARIO (incl. ADMIN) cannot mark ENTREGADO/FALLIDO via ChangeDeliveryStatus | Design | DeliveryUseCases.ts:203-205 |
| 9 | `orderId` is `@unique` — strict 1:1 means each order has exactly one delivery | Design | Prisma schema:852 |
| 10 | No cascade delete on Delivery→Order relation | Low | Prisma schema:867 |

---

## 16. Implementations Performed (NOT READ-ONLY)

Following this diagnostic, the following implementations were performed:

| Phase | Issue | Implementation |
|-------|-------|---------------|
| Fase 3 | CreatePayment INSTALLMENTS validation | Backend validates isTrustedCustomer before allowing CUOTA/PAGO_SALDO |
| Fase 3 | Order total vs items validation | CreateOrder validates subtotal/impuestos/descuentos consistency |
| Fase 3 | Pedido.total type sync | Frontend Pedido.total: string → number across 8 files |
| Fase 5 Issue #3 | CreateDelivery total: 0 | CreateDelivery now looks up order total via PrismaClient |
| Fase 5 Issue #1 | ListRutaDeldia Prisma coupling | ListRutaDelDia now uses DeliveryRepository instead of PrismaClient |

---

## 17. FOLLOW-UP: Fase 3 Implementation (COMPLETED)

The issues identified in this diagnostic were addressed in the Fase 3 implementation:

| Issue | Status | Implementation |
|-------|--------|---------------|
| CreateDelivery total: 0 | ✅ Resuelto | See Fase 5 Issue #3 Fix |
| ListRutaDelDia DI | ✅ Resuelto | See Fase 5 Issue #1 Fix |
| No delivery tests | Not in scope | Tracked separately |
| CreatePayment INSTALLMENTS validation | ✅ Implemented | See Fase 3 Implementation Report |
| Order total vs items validation | ✅ Implemented | See Fase 3 Implementation Report |
| Pedido.total type sync | ✅ Implemented | See Fase 3 Implementation Report |

---

## 19. FOLLOW-UP: Fase 5 Issue #1 Fix (COMPLETED)

**Issue**: `ListRutaDelDia` use case had direct coupling to `PrismaClient`, breaking Dependency Inversion Principle and Repository Pattern.

**Fix** (2026-09-17):
1. Added `listRutaDelDia(filters?)` method to `DeliveryRepository` interface.
2. Added `DeliveryRutaItem` type to `Delivery.ts` (exported by `DeliveryRepository.ts`).
3. Implemented `listRutaDelDia` in `PrismaDeliveryRepository` (moved query + mapping logic from use case).
4. Simplified `ListRutaDelDia` use case to delegate: `return this.repo.listRutaDelDia(filters)`.
5. Updated container: `new ListRutaDelDia(deliveryRepository)` (no longer takes `PrismaClient`).
6. Updated test `ListRutaDelDia.test.ts` to use mock `DeliveryRepository`.

**Files changed**:
- `DeliveryRepository.ts` — added `listRutaDelDia` method + `DeliveryRutaItem` re-export
- `Delivery.ts` — added `DeliveryRutaItem` interface
- `PrismaDeliveryRepository.ts` — implemented `listRutaDelDia` (full query + mapping logic)
- `DeliveryUseCases.ts` — simplified `ListRutaDelDia` to delegate to repository
- `deliveriesContainer.ts` — updated `new ListRutaDelDia(deliveryRepository)`
- `tests/unit/application/deliveries/ListRutaDelDia.test.ts` — updated to use mock repository

**Verification**:
- `npx tsc --noEmit` → **0 errors**
- `ListRutaDelDia.test.ts` → **3/3 passing**
- No other delivery tests affected
