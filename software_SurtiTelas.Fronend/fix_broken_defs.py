#!/usr/bin/env python3
"""
Fix broken function definitions where function name and = ( were lost.
"""
import os

# Each file: (filepath, line_number, expected_function_definition)
fixes = [
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", 849, "    const _handleRespondToNegotiation = (negotiationId: string, message: string, proposalData?: ProposalData) => {"),
    ("src/presentation/pages/admin/Produccion.tsx", 741, "  const _handleUpdateItem = (item: ProductionItem, e: React.FormEvent<HTMLFormElement>) => {"),
    ("src/presentation/pages/admin/RegistroTalleres.tsx", 184, "  const _handleToggleEstado = (id: string, estadoActual: string) => {"),
    ("src/presentation/pages/admin/ContactoEmpresa.tsx", 111, "  const _getPrioridadColor = (prioridad: string) => {"),
    ("src/presentation/pages/admin/Pagos.tsx", 465, "  const _handleVerDetalle = (factura: Factura) => {"),
]

for filepath, line_no, expected in fixes:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    idx = line_no - 1  # 0-indexed
    if idx < len(lines):
        actual = lines[idx].rstrip('\n')
        print(f"{filepath}:{line_no}")
        print(f"  Actual:   {actual}")
        print(f"  Expected: {expected}")
        lines[idx] = expected + '\n'
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"  Fixed!")
