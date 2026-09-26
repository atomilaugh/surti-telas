#!/usr/bin/env python3
"""
Fix overly aggressive reference replacements.
"""
import os

fixes = [
    # (filepath, old_text, new_text)
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", "customOrdersApi._remove(", "customOrdersApi.remove("),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "Object._values(", "Object.values("),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "_acceptQuotation(order.id)", "acceptQuotation(order.id)"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "_rejectQuotation(rejectConfirm.id", "rejectQuotation(rejectConfirm.id"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "_acceptQuotation(quotationDecisionOrder.id", "acceptQuotation(quotationDecisionOrder.id"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "_rejectQuotation(quotationDecisionOrder.id", "rejectQuotation(quotationDecisionOrder.id"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "_acceptQuotationWithDecisions", "acceptQuotationWithDecisions"),
]

for filepath, old, new in fixes:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    if old in content:
        content = content.replace(old, new)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}: {old[:40]}")
    else:
        print(f"Pattern not found: {filepath}: {old[:40]}")
        # Search for what's there
        import re
        for match in re.finditer(re.escape(old.replace('(', '\\(').replace(')', '\\)')), content):
            start = max(0, match.start()-20)
            end = min(len(content), match.end()+20)
            print(f"  Found: ...{content[start:end]}...")
