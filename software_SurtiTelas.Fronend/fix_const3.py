#!/usr/bin/env python3
"""
Fix missing const in remaining files.
"""
files = [
    ("src/presentation/pages/admin/ContactoEmpresa.tsx", None),
    ("src/presentation/pages/admin/Pagos.tsx", None),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", None),
    ("src/presentation/pages/admin/Produccion.tsx", None),
    ("src/presentation/pages/admin/RegistroTalleres.tsx", None),
]

for filepath, _ in files:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    original = content
    
    # Find _name = ( patterns without const and add const
    import re
    
    # Pattern: line starts with spaces + _name = ( but not const _name
    pattern = re.compile(r'^(\s+)(?<!const )_[a-zA-Z_]\w*\s*=\s*\(', re.MULTILINE)
    
    def replacer(m):
        indent = m.group(1)
        line_start = m.start()
        line_end = content.find('\n', line_start)
        if line_end == -1:
            line_end = len(content)
        line = content[line_start:line_end]
        return indent + 'const ' + line[len(indent):]
    
    content = pattern.sub(replacer, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"OK {filepath}")
