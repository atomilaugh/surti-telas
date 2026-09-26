#!/usr/bin/env python3
"""
Fix S1166 remaining + delete S1172 unused functions.
"""
import os
import re

# 1. Fix S1166 in CheckoutModal.tsx
filepath = "src/presentation/components/CheckoutModal.tsx"
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

old = """        } catch (_payErr) {
          // No fallamos el flujo principal si el pago no se registra;
          // el admin puede registrarlo manualmente desde Gestión de Pagos."""

new = """        } catch (_payErr) {
          void _payErr;
          // No fallamos el flujo principal si el pago no se registra;
          // el admin puede registrarlo manualmente desde Gestión de Pagos."""

if old in content:
    content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed S1166 in {filepath}")
else:
    print(f"Pattern not found: {filepath}")

# 2. Delete S1172 unused functions
deletions = [
    # (filepath, func_definition_start, func_name)
    ("src/presentation/pages/admin/ContactoEmpresa.tsx", "const _getPrioridadColor = (prioridad: string) => {", "_getPrioridadColor"),
    ("src/presentation/pages/admin/Pagos.tsx", None, "_handleVerDetalle"),
    ("src/presentation/pages/admin/Produccion.tsx", "const _handleUpdateItem = async (item: ProductionItem", "_handleUpdateItem"),
    ("src/presentation/pages/admin/RegistroTalleres.tsx", "const _handleToggleEstado = async (id: string", "_handleToggleEstado"),
    ("src/presentation/pages/admin/Webhooks.tsx", "const _handleTest = async (id: string) => {", "_handleTest"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", None, "_handleRespondToNegotiation"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", None, "_handleAcceptProposal"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", None, "_handleRejectProposal"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "const _acceptQuotation = async (order: CustomOrder) => {", "_acceptQuotation"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", "const _rejectQuotation = (order: CustomOrder) => {", "_rejectQuotation"),
    ("src/presentation/pages/features/CartPage.tsx", "const _handleCheckoutClick = () => {", "_handleCheckoutClick"),
    ("src/presentation/pages/features/CatalogPage.tsx", "const _formatPrice = (price: number) => `$", "_formatPrice"),
    ("src/shared/ui/Combobox.tsx", "const _handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {", "_handleKeyDown"),
]

for filepath, def_str, func_name in deletions:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    if def_str and def_str in content:
        # Find the function start
        start = content.index(def_str)
        # Find the opening brace
        brace_start = content.find('{', start)
        if brace_start == -1:
            print(f"Could not find { func_name} in {filepath}")
            continue
        
        # Find matching closing brace (with proper nesting)
        depth = 0
        end = brace_start
        for i in range(brace_start, len(content)):
            if content[i] == '{':
                depth += 1
            elif content[i] == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        
        # Include trailing newline
        func_text = content[start:end]
        remaining = content[end:]
        
        # Remove extra blank lines before the function
        if remaining.startswith('\n\n'):
            remaining = remaining[2:]
        elif remaining.startswith('\n'):
            remaining = remaining[1:]
        
        new_content = content[:start] + remaining
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Deleted {func_name} from {filepath}")
    else:
        print(f"Pattern not found: {filepath} ({func_name})")

# Also remove unused imports if any
# For ContactoEmpresa.tsx, check if s.prioridadAlta etc are still used after deleting _getPrioridadColor
filepath = "src/presentation/pages/admin/ContactoEmpresa.tsx"
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()
# Check if s is still used elsewhere
if 's.prioridad' in content.replace('s.prioridadAlta', '').replace('s.prioridadMedia', '').replace('s.prioridadBaja', ''):
    print(f"s still used in {filepath}")
else:
    print(f"s might be unused in {filepath} (but it's a CSS module import)")
