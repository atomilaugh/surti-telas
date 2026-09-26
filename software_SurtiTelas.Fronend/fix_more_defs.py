#!/usr/bin/env python3
"""
Fix remaining broken definitions.
"""
import os

fixes = [
    # (filepath, line_no, expected_definition)
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", 865, "    const _handleAcceptProposal = (negotiationId: string) => {"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", 877, "    const _handleRejectProposal = (negotiationId: string, reason?: string) => {"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", 935, "  const _acceptQuotation = async (order: CustomOrder) => {"),
    ("src/presentation/pages/cliente/MisPedidosPersonalizados.tsx", 945, "  const _rejectQuotation = (order: CustomOrder) => {"),
]

for filepath, line_no, expected in fixes:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    idx = line_no - 1
    if idx < len(lines):
        actual = lines[idx].rstrip('\n')
        print(f"{filepath}:{line_no}")
        print(f"  Actual:   {actual}")
        lines[idx] = expected + '\n'
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"  Fixed!")

# Check for more broken definitions (any line with just a parameter list)
import re
broken_files = [
    "src/presentation/pages/admin/PedidosPersonalizados.tsx",
    "src/presentation/pages/cliente/MisPedidosPersonalizados.tsx",
]

for filepath in broken_files:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines, 1):
        # Check for lines that look like parameter lists without function name
        if re.match(r'^\s+const \w+:.+\) => \{', line) and ' = ' not in line.split(') =>')[0]:
            print(f"  Suspicious line {i}: {line.strip()[:100]}")
