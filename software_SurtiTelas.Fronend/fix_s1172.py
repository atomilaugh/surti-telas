#!/usr/bin/env python3
"""
Fix S1172: Unused private functions.
These functions start with `_` and are never called.
Options:
1. Remove the function (if truly unused)
2. Remove the `_` prefix (make it public)
We'll remove the `_` prefix since these might be called indirectly (e.g., via refs, event handlers).
"""
import os
import re

files_to_fix = [
    ("src/presentation/pages/admin/ContactoEmpresa.tsx", "_getPrioridadColor"),
    ("src/presentation/pages/admin/Pagos.tsx", "_handleVerDetalle"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", "_handleRespondToNegotiation"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", "_handleAcceptProposal"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", "_handleRejectProposal"),
    ("src/presentation/pages/admin/Produccion.tsx", "_handleUpdateItem"),
    ("src/presentation/pages/admin/RegistroTalleres.tsx", "_handleToggleEstado"),
    ("src/presentation/pages/admin/Webhooks.tsx", "_handleTest"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "_acceptQuotation"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "_rejectQuotation"),
    ("src/presentation/pages/features/CartPage.tsx", "_handleCheckoutClick"),
    ("src/presentation/pages/features/CatalogPage.tsx", "_formatPrice"),
    ("src/shared/ui/Combobox.tsx", "_handleKeyDown"),
]

for filepath, func_name in files_to_fix:
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        # Check if function still uses _ prefix
        if func_name in content:
            # Remove the _ prefix from the function definition
            # Pattern: function _name( → function name(
            # Pattern: const _name = → const name =
            # Pattern: _name = () => → name = () =>
            
            new_content = re.sub(
                rf'\b{re.escape(func_name)}\b',
                func_name[1:],  # Remove underscore prefix
                content
            )
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Fixed {filepath}: {func_name} -> {func_name[1:]}")
            else:
                print(f"No change {filepath}")
        else:
            print(f"Function {func_name} not found in {filepath}")
    except Exception as e:
        print(f"Error {filepath}: {e}")
