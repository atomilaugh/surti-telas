#!/usr/bin/env python3
"""
Fix Security: document.write in DataTable.tsx
Use Blob URL instead of document.write for XSS safety.
"""
filepath = "src/shared/ui/DataTable.tsx"

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Find and replace the document.write block
old_block = '''    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);'''

new_block = '''    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    printWindow.location.href = url;
    setTimeout(() => { printWindow.print(); URL.revokeObjectURL(url); }, 500);'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {filepath}")
else:
    print(f"Pattern not found in {filepath}")
    # Try to find the relevant lines
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'document.write' in line:
            print(f"  Found document.write at line {i+1}: {line.strip()[:100]}")
            # Print surrounding context
            for j in range(max(0,i-3), min(len(lines), i+4)):
                print(f"    {j+1}: {lines[j].strip()[:120]}")
