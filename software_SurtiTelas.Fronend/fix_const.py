#!/usr/bin/env python3
"""
Fix missing const/let/var keywords caused by S1172 revert.
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
        content = f.read()
    
    original = content
    
    # Pattern: functionName = (params) => {  OR  functionName = () => {  (without const/let/var)
    # But NOT: const functionName =, let functionName =, var functionName =
    # And NOT: this.functionName =
    pattern = re.compile(
        r'(?<!const\s)(?<!let\s)(?<!var\s)(?<!this\.)(\b_[a-zA-Z_]\w*\s*=\s*\(?)',
        re.MULTILINE
    )
    
    def replacer(m):
        # Check if it's already preceded by const/let/var/this
        before = content[max(0, m.start()-20):m.start()]
        if re.search(r'\b(const|let|var|this)\s*$', before):
            return m.group(0)
        return 'const ' + m.group(0)
    
    content = pattern.sub(replacer, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"OK {filepath}")
