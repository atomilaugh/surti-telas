#!/usr/bin/env python3
"""
Fix S125: Switch/if with too few branches.
4 files with 3 branches each.
"""

# 1. QuotationDecision.tsx:232 - switch with 3 cases
# Read the file to understand context
filepath = "src/presentation/pages/cliente/quotation-steps/QuotationDecision.tsx"
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

lines = content.split('\n')
print(f"=== {filepath} around line 232 ===")
for i in range(225, min(250, len(lines))):
    print(f"  {i+1}: {lines[i]}")
