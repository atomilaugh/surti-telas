import re
import os
import sys

def find_css_duplicates(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    rules = re.findall(r'([^{]+)\{([^{}]+)\}', content, re.DOTALL)
    issues = []
    
    for selector, body in rules:
        sel = selector.strip()
        props = {}
        for prop_match in re.finditer(r'([\-a-zA-Z]+)\s*:', body):
            prop = prop_match.group(1).strip()
            if prop not in props:
                props[prop] = []
            props[prop].append(prop_match.start())
        
        for prop, locations in props.items():
            if len(locations) > 1:
                issues.append((sel, prop, len(locations)))
    
    return issues

sys.stdout.reconfigure(encoding='utf-8')

files_to_check = [
    r'src/presentation/pages/cliente/quotation-steps/QuotationDecision.module.css',
    r'src/presentation/pages/admin/AdminCatalogo.module.css',
    r'src/presentation/pages/admin/AdminReportes.module.css',
]

for f in files_to_check:
    if os.path.exists(f):
        issues = find_css_duplicates(f)
        if issues:
            print(f"\n=== {f} ===")
            for selector, prop, count in issues:
                print(f"  {selector}: duplicate '{prop}' ({count} times)")
        else:
            print(f"\n=== {f} === No duplicates found")
    else:
        print(f"\n=== {f} === FILE NOT FOUND")
