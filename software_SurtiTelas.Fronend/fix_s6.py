#!/usr/bin/env python3
"""
Fix #6: Replace Math.random in productStore.ts
"""
filepath = "src/shared/stores/productStore.ts"

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Add import
if "generateSecureId" not in content:
    lines = content.split('\n')
    import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith('import'):
            import_idx = i + 1
    lines.insert(import_idx, "import { generateSecureId } from '@/shared/utils/cryptoUtils';")
    content = '\n'.join(lines)

# Replace Math.random usage
content = content.replace(
    '`CAM-${Math.floor(1000 + Math.random() * 9000)}`',
    '`CAM-${generateSecureId("", 4)}`'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")
