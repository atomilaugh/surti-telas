#!/usr/bin/env python3
"""
Fix Security: document.write in Recibos.tsx (2 occurrences)
"""
filepath = "src/presentation/pages/admin/Recibos.tsx"

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

replacements = [
    (
        '''    printWindow.document.write(getReceiptHtml(recibo));
    printWindow.document.close();
    printWindow.print();''',
        '''    const blob = new Blob([getReceiptHtml(recibo)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    printWindow.location.href = url;
    setTimeout(() => { printWindow.print(); URL.revokeObjectURL(url); }, 500);'''
    ),
    (
        '''    printWindow.document.write(getReceiptHtml(selectedReceiptForViewer));
    printWindow.document.close();
    printWindow.print();''',
        '''    const blob = new Blob([getReceiptHtml(selectedReceiptForViewer)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    printWindow.location.href = url;
    setTimeout(() => { printWindow.print(); URL.revokeObjectURL(url); }, 500);'''
    ),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print("Replaced one occurrence")
    else:
        print("Pattern not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed {filepath}")
