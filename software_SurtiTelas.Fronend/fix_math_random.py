#!/usr/bin/env python3
"""
Fix Math.random replacements with inline crypto.getRandomValues.
This avoids the dash issue with generateSecureId.
"""
import os

# Utility inline code for generating random strings using crypto
inline_crypto_3 = '''(() => { const b = new Uint8Array(3); crypto.getRandomValues(b); return Array.from(b).map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 6); })()'''

inline_crypto_4 = '''(() => { const b = new Uint8Array(2); crypto.getRandomValues(b); return Array.from(b).map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 4); })()'''

# StockDevuelto.tsx - 2 occurrences of Math.random
filepath = "src/presentation/pages/admin/StockDevuelto.tsx"
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Remove any previously added import
content = content.replace("import { generateSecureId } from '@/shared/utils/cryptoUtils';\n", "")

# Replace both Math.random usages
content = content.replace(
    '`HIS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`',
    '`HIS-${Date.now()}-${(() => { const b = new Uint8Array(3); crypto.getRandomValues(b); return Array.from(b).map(x => x.toString(36).padStart(2, \'0\')).join(\'\').slice(0, 6); })()}`'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")

# AdminCatalogo.tsx
filepath = "src/presentation/pages/admin/AdminCatalogo.tsx"
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

content = content.replace(
    '`${Date.now()}-${Math.round(Math.random() * 1000)}`',
    '`${Date.now()}-${(() => { const b = new Uint8Array(2); crypto.getRandomValues(b); return Array.from(b).map(x => x.toString(36).padStart(2, \'0\')).join(\'\').slice(0, 4); })()}`'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")

# productStore.ts
filepath = "src/shared/stores/productStore.ts"
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

content = content.replace(
    '`CAM-${Math.floor(1000 + Math.random() * 9000)}`',
    '`CAM-${(() => { const b = new Uint8Array(2); crypto.getRandomValues(b); return Math.floor(new Uint8Array(2).reduce((a, b) => a * 256 + b, 0) / 65536 * 9000 + 1000); })()}`'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")
