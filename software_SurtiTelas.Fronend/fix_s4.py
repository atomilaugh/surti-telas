#!/usr/bin/env python3
"""
Fix #4: Replace Math.random with crypto.getRandomValues in StockDevuelto.tsx
"""
filepath = "src/presentation/pages/admin/StockDevuelto.tsx"

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Add import for crypto utility at top if not present
if "generateSecureId" not in content:
    # Find first import
    lines = content.split('\n')
    import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith('import'):
            import_idx = i + 1
    lines.insert(import_idx, "import { generateSecureId } from '@/shared/utils/cryptoUtils';")
    content = '\n'.join(lines)

# Replace Math.random usages at lines 388 and 420
content = content.replace(
    '`HIS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`',
    '`HIS-${Date.now()}-${generateSecureId("", 6)}`'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")
