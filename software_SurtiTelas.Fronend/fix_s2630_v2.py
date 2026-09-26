#!/usr/bin/env python3
"""
Fix S2630: Proper restructure to avoid fall-through.
Use explicit return for each case instead of fall-through.
"""
filepath = "src/presentation/pages/cliente/QuotationInlineDisplay.tsx"

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix getStatusConfig - VENCIDA/VENCIDO
old1 = """    case 'VENCIDA':
    case 'VENCIDO':
      return { label: 'Vencida', variant: 'warning' as const, icon: AlertTriangle };"""

new1 = """    case 'VENCIDA':
      return { label: 'Vencida', variant: 'warning' as const, icon: AlertTriangle };
    case 'VENCIDO':
      return { label: 'Vencida', variant: 'warning' as const, icon: AlertTriangle };"""

content = content.replace(old1, new1)
print("Fixed getStatusConfig")

# Fix getStatusMessage - ENVIADA/COTIZADO
old2 = """    case 'ENVIADA':
    case 'COTIZADO':
      return 'Esta cotización está pendiente de revisión.';"""

new2 = """    case 'ENVIADA':
      return 'Esta cotización está pendiente de revisión.';
    case 'COTIZADO':
      return 'Esta cotización está pendiente de revisión.';"""

content = content.replace(old2, new2)
print("Fixed getStatusMessage ENVIADA/COTIZADO")

# Fix getStatusMessage - VENCIDA/VENCIDO
old3 = """    case 'VENCIDA':
    case 'VENCIDO':
      return 'Esta cotización ha vencido.';"""

new3 = """    case 'VENCIDA':
      return 'Esta cotización ha vencido.';
    case 'VENCIDO':
      return 'Esta cotización ha vencido.';"""

content = content.replace(old3, new3)
print("Fixed getStatusMessage VENCIDA/VENCIDO")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")
