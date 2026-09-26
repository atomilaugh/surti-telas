#!/usr/bin/env python3
"""
Revert S1172: Put _ prefix back on all functions.
We'll handle these in a later iteration by either using them or deleting them properly.
"""
import os
import re

files_to_revert = [
    ("src/presentation/pages/admin/ContactoEmpresa.tsx", "getPrioridadColor"),
    ("src/presentation/pages/admin/Pagos.tsx", "handleVerDetalle"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", "handleRespondToNegotiation"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", "handleAcceptProposal"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", "handleRejectProposal"),
    ("src/presentation/pages/admin/Produccion.tsx", "handleUpdateItem"),
    ("src/presentation/pages/admin/RegistroTalleres.tsx", "handleToggleEstado"),
    ("src/presentation/pages/admin/Webhooks.tsx", "handleTest"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "acceptQuotation"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "rejectQuotation"),
    ("src/presentation/pages/features/CartPage.tsx", "handleCheckoutClick"),
    ("src/presentation/pages/features/CatalogPage.tsx", "formatPrice"),
    ("src/shared/ui/Combobox.tsx", "handleKeyDown"),
]

for filepath, func_name_no_underscore in files_to_revert:
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        func_name = f"_{func_name_no_underscore}"
        
        if func_name in content:
            print(f"  {filepath}: already has underscore, skipping")
            continue
        
        if func_name_no_underscore in content:
            # Only revert if it's a function definition
            patterns = [
                (rf'(?:function\s+){re.escape(func_name_no_underscore)}\b', f'function {func_name}'),
                (rf'(?:const|let|var)\s+{re.escape(func_name_no_underscore)}\s*=', f'{func_name} ='),
                (rf'(?:async\s+)?{re.escape(func_name_no_underscore)}\s*=\s*(?:async\s+)?\(', f'{func_name} = ('),
            ]
            
            changed = False
            for pattern, replacement in patterns:
                new_content = re.sub(pattern, replacement, content)
                if new_content != content:
                    content = new_content
                    changed = True
            
            if changed:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Reverted {filepath}")
            else:
                print(f"  {filepath}: no pattern matched")
        else:
            print(f"  {filepath}: function name not found")
    except Exception as e:
        print(f"Error {filepath}: {e}")
