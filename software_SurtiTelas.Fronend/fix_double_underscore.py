#!/usr/bin/env python3
"""
Fix double underscore prefix from bad revert.
"""
import os
import re

# Fix CartPage.tsx
filepath = "src/presentation/pages/features/CartPage.tsx"
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()
content = content.replace("__handleCheckoutClick", "_handleCheckoutClick")
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")

# Fix CatalogPage.tsx
filepath = "src/presentation/pages/features/CatalogPage.tsx"
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()
content = content.replace("__formatPrice", "_formatPrice")
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")

# Fix Combobox.tsx
filepath = "src/shared/ui/Combobox.tsx"
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()
content = content.replace("__handleKeyDown", "_handleKeyDown")
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")

# Fix MisPedidosPersonalizados.tsx
filepath = "src/presentation/pages/cliente/MisPedidosPersonalizados.tsx"
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()
content = content.replace("__acceptQuotation", "_acceptQuotation")
content = content.replace("__rejectQuotation", "_rejectQuotation")
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")

# Fix all other double-underscore patterns
files_to_check = [
    "src/presentation/pages/admin/ContactoEmpresa.tsx",
    "src/presentation/pages/admin/Pagos.tsx",
    "src/presentation/pages/admin/PedidosPersonalizados.tsx",
    "src/presentation/pages/admin/Produccion.tsx",
    "src/presentation/pages/admin/RegistroTalleres.tsx",
    "src/presentation/pages/admin/Webhooks.tsx",
]

for filepath in files_to_check:
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        # Replace any __ with _ in function definitions
        new_content = re.sub(r'\b__([a-zA-Z_]\w*)', r'_\1', content)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {filepath}")
        else:
            print(f"OK {filepath}")
    except Exception as e:
        print(f"Error {filepath}: {e}")
