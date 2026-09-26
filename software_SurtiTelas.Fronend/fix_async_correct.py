#!/usr/bin/env python3
"""
Fix broken async function definitions.
"""
import os

fixes = [
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", 849, "    const _handleRespondToNegotiation = async (negotiationId: string, message: string, proposalData?: ProposalData) => {"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", 865, "    const _handleAcceptProposal = async (negotiationId: string) => {"),
    ("src/presentation/pages/admin/PedidosPersonalizados.tsx", 877, "    const _handleRejectProposal = async (negotiationId: string, reason?: string) => {"),
    ("src/presentation/pages/admin/Produccion.tsx", 741, "  const _handleUpdateItem = async (item: ProductionItem, e: React.FormEvent<HTMLFormElement>) => {"),
    ("src/presentation/pages/admin/RegistroTalleres.tsx", 184, "  const _handleToggleEstado = async (id: string, estadoActual: string) => {"),
]

for filepath, line_no, expected in fixes:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    idx = line_no - 1
    if idx < len(lines):
        actual = lines[idx].rstrip('\n')
        print(f"{filepath}:{line_no}")
        print(f"  Actual:   {actual[:120]}")
        lines[idx] = expected + '\n'
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"  Fixed!")
