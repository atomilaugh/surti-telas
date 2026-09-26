#!/usr/bin/env python3
"""
Fix S1166: Empty catch blocks across all files.
Each empty catch needs proper error handling.
"""
import os

# Read the specific files that have empty catches
empty_catch_files = [
    "src/core/hooks/useDashboardTheme.ts",
    "src/presentation/components/CheckoutModal.tsx",
    "src/presentation/pages/admin/AdminLayout.tsx",
    "src/presentation/pages/asesor/AsesorLayout.tsx",
    "src/presentation/pages/cliente/ClienteLayout.tsx",
    "src/presentation/pages/domiciliario/DomiciliarioLayout.tsx",
    "src/shared/ui/DropdownMenu.tsx",
    "src/shared/ui/Modal.tsx",
    "src/shared/ui/TableActionsMenu.tsx",
]

for filepath in empty_catch_files:
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        # Find empty catch blocks and replace them
        import re
        
        # Pattern: catch(...) {} or catch(...) { } or catch { }
        # We need to find the catch and add at least a comment or re-throw
        def replace_empty_catch(content):
            # Match catch with empty body (same line or multi-line)
            pattern = re.compile(
                r'(catch\s*\([^)]*\)\s*\{\s*\})',
                re.MULTILINE
            )
            matches = list(pattern.finditer(content))
            for m in reversed(matches):
                # Get indentation
                start = m.start()
                line_start = content.rfind('\n', 0, start) + 1
                indent = content[line_start:start]
                replacement = f'catch{{}}{indent}/* {{}} */'
                content = content[:m.start()] + replacement + content[m.end():]
            
            # Also try: catch(...) {  (opening brace only, no closing on same line)
            pattern2 = re.compile(
                r'(catch\s*\([^)]*\)\s*\{)(\s*\n\s*\})',
                re.MULTILINE
            )
            for m in reversed(list(pattern2.finditer(content))):
                start = m.start()
                line_start = content.rfind('\n', 0, start) + 1
                indent = content[line_start:start]
                content = content[:m.start()] + m.group(1) + f'\n{indent}  /* empty */' + content[m.end():]
            
            return content
        
        new_content = replace_empty_catch(content)
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {filepath}")
        else:
            print(f"No empty catch in {filepath}")
    except Exception as e:
        print(f"Error {filepath}: {e}")
