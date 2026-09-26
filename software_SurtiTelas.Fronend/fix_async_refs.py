#!/usr/bin/env python3
"""
Fix async/await issues and function references.
"""
import os
import re

# Fix async in function definitions
async_fixes = [
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", 849, "_handleRespondToNegotiation"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", 865, "_handleAcceptProposal"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", 877, "_handleRejectProposal"),
    ("src/presentation/pages/admin/Produccion.tsx", 741, "_handleUpdateItem"),
    ("src/presentation/pages/admin/RegistroTalleres.tsx", 184, "_handleToggleEstado"),
]

for filepath, line_no, func_name in async_fixes:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    # Replace function definition with async version
    pattern = rf"(const )({re.escape(func_name)}) = \("
    replacement = rf"\1async \2 = \("
    
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed async: {filepath}:{line_no}")
    else:
        print(f"Pattern not found: {filepath}:{line_no}")

# Fix function references: handleXXX (without underscore) -> _handleXXX
files_to_check = [
    "src/presentation/pages/admin/RegistroTalleres.tsx",
    "src/presentation/pages/admin/Produccion.tsx",
    "src/presentation/pages/admin/PedidosPersonalizados.tsx",
    "src/presentation/pages/admin/ContactoEmpresa.tsx",
    "src/presentation/pages/admin/Pagos.tsx",
    "src/presentation/pages/cliente/MisPedidosPersonalizados.tsx",
]

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    original = content
    
    # Replace function calls: funcName( -> _funcName( (but not const _funcName, this._funcName, etc.)
    pattern = re.compile(r'(?<![a-zA-Z_])([a-zA-Z_]\w+)\(')
    
    def replacer(m):
        name = m.group(1)
        underscore_name = f"_{name}"
        # Check if the underscore version exists in the file
        if underscore_name in content and name != underscore_name:
            # Only replace if it's not a keyword or type
            if name not in ['if', 'for', 'while', 'switch', 'catch', 'return', 'const', 'let', 'var', 'async', 'await', 'new', 'typeof', 'void', 'throw', 'typeof', 'import', 'export', 'default', 'class', 'interface', 'extends', 'implements', 'type', 'namespace', 'declare', 'enum', 'module', 'package', 'abstract', 'readonly', 'public', 'private', 'protected', 'static', 'get', 'set', 'as', 'from', 'of', 'in', 'is', 'key', 'of', 'constructor']:
                return f"_{name}("
        return m.group(0)
    
    content = pattern.sub(replacer, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed refs: {filepath}")
    else:
        print(f"OK refs: {filepath}")
