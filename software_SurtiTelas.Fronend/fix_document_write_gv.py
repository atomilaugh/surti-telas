#!/usr/bin/env python3
"""
Fix Security: document.write in GestionVentas.tsx
"""
filepath = "src/presentation/pages/admin/GestionVentas.tsx"

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

old_block = '''          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }'''

new_block = '''          const printWindow = window.open('', '_blank');
          if (printWindow) {
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            printWindow.location.href = url;
            setTimeout(() => { printWindow.print(); URL.revokeObjectURL(url); }, 500);
          }'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {filepath}")
else:
    print(f"Pattern not found in {filepath}")
    for i, line in enumerate(content.split('\n'), 1):
        if 'document.write' in line:
            print(f"  Line {i}: {line.strip()[:100]}")
