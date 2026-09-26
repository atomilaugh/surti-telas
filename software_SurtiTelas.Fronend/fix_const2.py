#!/usr/bin/env python3
"""
Fix: add const before function definitions that lost it.
"""
import os
import re

files_to_check = [
    "src/presentation/pages/features/CartPage.tsx",
    "src/presentation/pages/features/CatalogPage.tsx",
    "src/shared/ui/Combobox.tsx",
    "src/presentation/pages/cliente/MisPedidosPersonalizados.tsx",
    "src/presentation/pages/admin/ContactoEmpresa.tsx",
    "src/presentation/pages/admin/Pagos.tsx",
    "src/presentation/pages/admin/PedidosPersonalizados.tsx",
    "src/presentation/pages/admin/Produccion.tsx",
    "src/presentation/pages/admin/RegistroTalleres.tsx",
    "src/presentation/pages/admin/Webhooks.tsx",
]

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    changed = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Pattern: _name = ( or _name = () => or _name = async ( at start of line (with indentation)
        if re.match(r'^(\s+)_[a-zA-Z_]\w*\s*=\s*\(', stripped):
            # Check if already has const
            if not re.match(r'^(\s*)const\s', stripped):
                indent = re.match(r'^(\s*)', stripped).group(1)
                rest = stripped
                lines[i] = line.replace(stripped, indent + 'const ' + rest, 1)
                changed = True
    
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"Fixed {filepath}")
    else:
        print(f"OK {filepath}")
