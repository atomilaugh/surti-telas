#!/usr/bin/env python3
"""
Fix S125: Fix QuotationDecision.tsx getStatusBadge
"""
filepath = "src/presentation/pages/cliente/quotation-steps/QuotationDecision.tsx"

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

old = """  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACEPTADO':
        return <StatusBadge status="ACEPTADO" className={s.statusBadge}>Aceptado</StatusBadge>;
      case 'RECHAZADO':
        return <StatusBadge status="RECHAZADO" className={s.statusBadge}>Rechazado</StatusBadge>;
      default:
        return <StatusBadge status="Pendiente" className={s.statusBadge}>Pendiente</StatusBadge>;
    }
  };"""

new = """  const getStatusBadge = (status: string) => {
    if (status === 'ACEPTADO') return <StatusBadge status="ACEPTADO" className={s.statusBadge}>Aceptado</StatusBadge>;
    if (status === 'RECHAZADO') return <StatusBadge status="RECHAZADO" className={s.statusBadge}>Rechazado</StatusBadge>;
    return <StatusBadge status="Pendiente" className={s.statusBadge}>Pendiente</StatusBadge>;
  };"""

if old in content:
    content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {filepath}")
else:
    print("Pattern not found")
