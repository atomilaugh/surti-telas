import re

files = [
    'src/presentation/pages/admin/GestionVentas.tsx',
    'src/presentation/pages/admin/Produccion.tsx',
    'src/presentation/pages/admin/Proveedores.tsx',
    'src/presentation/pages/cliente/quotation-steps/CustomOrderSummary.tsx',
    'src/presentation/pages/cliente/quotation-steps/ProductStep.tsx',
]

for filepath in files:
    print(f'\n=== {filepath} ===')
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Find ternary expressions: condition ? expr1 : expr2
    # Look for ? followed by : at same nesting level
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        # Remove strings and JSX to find ternary operators
        stripped = line.strip()
        if '?' not in stripped or ':' not in stripped:
            continue
        # Find ? and : positions, check if they're at same bracket level
        # Simple check: look for pattern ? X : Y where X == Y
        # Use regex to find non-nested ternaries
        matches = list(re.finditer(r'\?\s*([^:?:]+?)\s*:\s*([^:?:]+?)(?:\s*[,\n)]|$)', stripped))
        for m in matches:
            true_val = m.group(1).strip()
            false_val = m.group(2).strip()
            if true_val == false_val and len(true_val) > 1:
                print(f'  Line {i}: {stripped[:150]}')
                print(f'    Both branches: {true_val}')
