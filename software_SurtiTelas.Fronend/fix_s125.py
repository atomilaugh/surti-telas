#!/usr/bin/env python3
"""
Fix S125: Switch with too few branches.
Convert to if/else or object lookup.
"""

# 1. DomiciliarioEntregas.tsx:66 - accionesDisponibles
filepath = "src/presentation/pages/domiciliario/DomiciliarioEntregas.tsx"
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

old1 = """  const accionesDisponibles = (estado: DeliveryDTO['estado']) => {
    switch (estado) {
      case 'ASIGNADO':
        return [{ label: 'Iniciar entrega', estado: 'EN_RUTA' as const, variant: 'primary' as const }];
      case 'EN_RUTA':
        return [
          { label: 'Marcar entregado', estado: 'ENTREGADO' as const, variant: 'success' as const },
          { label: 'Marcar fallido', estado: 'FALLIDO' as const, variant: 'danger' as const },
        ];
      default:
        return [];
    }
  };"""

new1 = """  const accionesDisponibles = (estado: DeliveryDTO['estado']) => {
    if (estado === 'ASIGNADO') return [{ label: 'Iniciar entrega', estado: 'EN_RUTA' as const, variant: 'primary' as const }];
    if (estado === 'EN_RUTA') return [
      { label: 'Marcar entregado', estado: 'ENTREGADO' as const, variant: 'success' as const },
      { label: 'Marcar fallido', estado: 'FALLIDO' as const, variant: 'danger' as const },
    ];
    return [];
  };"""

if old1 in content:
    content = content.replace(old1, new1)
    print("Fixed accionesDisponibles")
else:
    print("Pattern not found for accionesDisponibles")

# 2. DomiciliarioEntregas.tsx:83 - estadosDisponibles
old2 = """  const estadosDisponibles = (estadoActual: DeliveryDTO['estado']): DeliveryDTO['estado'][] => {
    switch (estadoActual) {
      case 'ASIGNADO':
        return ['EN_RUTA'];
      case 'EN_RUTA':
        return ['ENTREGADO', 'FALLIDO'];
      default:
        return [];
    }
  };"""

new2 = """  const estadosDisponibles = (estadoActual: DeliveryDTO['estado']): DeliveryDTO['estado'][] => {
    if (estadoActual === 'ASIGNADO') return ['EN_RUTA'];
    if (estadoActual === 'EN_RUTA') return ['ENTREGADO', 'FALLIDO'];
    return [];
  };"""

if old2 in content:
    content = content.replace(old2, new2)
    print("Fixed estadosDisponibles")
else:
    print("Pattern not found for estadosDisponibles")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")

# 3. QuotationDecision.tsx:232 - getStatusBadge
filepath2 = "src/presentation/pages/cliente/quotation-steps/QuotationDecision.tsx"
with open(filepath2, 'r', encoding='utf-8', errors='replace') as f:
    content2 = f.read()

old3 = """  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACEPTADO':
        return <StatusBadge status="ACEPTADO" className={s.statusBadge}>Aceptado</StatusBadge>;
      case 'RECHAZADO':
        return <StatusBadge status="RECHAZADO" className={s.statusBadge}>Rechazado</StatusBadge>;
      default:
        return <StatusBadge status="Pendiente" className={s.statusBadge}>Pendiente</StatusBadge>;
    }
  };"""

new3 = """  const getStatusBadge = (status: string) => {
    if (status === 'ACEPTADO') return <StatusBadge status="ACEPTADO" className={s.statusBadge}>Aceptado</StatusBadge>;
    if (status === 'RECHAZADO') return <StatusBadge status="RECHAZADO" className={s.statusBadge}>Rechazado</StatusBadge>;
    return <StatusBadge status="Pendiente" className={s.statusBadge}>Pendiente</StatusBadge>;
  };"""

if old3 in content2:
    content2 = content2.replace(old3, new3)
    print("Fixed getStatusBadge")
else:
    print("Pattern not found for getStatusBadge")

with open(filepath2, 'w', encoding='utf-8') as f:
    f.write(content2)
print(f"Fixed {filepath2}")

# 4. MisEntregas.tsx:121 - estadosDisponibles
filepath3 = "src/presentation/pages/domiciliario/MisEntregas.tsx"
with open(filepath3, 'r', encoding='utf-8', errors='replace') as f:
    content3 = f.read()

old4 = """  const estadosDisponibles = (estadoActual: Entrega['estado']): Entrega['estado'][] => {
    switch (estadoActual) {
      case 'Pendiente':
        return ['En camino'];
      case 'En camino':
        return ['Entregado', 'Fallido'];
      default:
        return [];
    }
  };"""

new4 = """  const estadosDisponibles = (estadoActual: Entrega['estado']): Entrega['estado'][] => {
    if (estadoActual === 'Pendiente') return ['En camino'];
    if (estadoActual === 'En camino') return ['Entregado', 'Fallido'];
    return [];
  };"""

if old4 in content3:
    content3 = content3.replace(old4, new4)
    print("Fixed MisEntregas estadosDisponibles")
else:
    print("Pattern not found for MisEntregas")

with open(filepath3, 'w', encoding='utf-8') as f:
    f.write(content3)
print(f"Fixed {filepath3}")
