#!/usr/bin/env python3
"""
Fix #5: Replace Math.random with crypto.getRandomValues in AdminCatalogo.tsx
"""
filepath = "src/presentation/pages/admin/AdminCatalogo.tsx"

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
    '`${Date.now()}-${Math.round(Math.random() * 1000)}`',
    '`${Date.now()}-${generateSecureId("", 4)}`'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")
