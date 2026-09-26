import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend'

def find_files(ext):
    matches = []
    for root, dirs, files in os.walk(PROJECT_DIR):
        if any(x in root for x in ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'target', '.scannerwork', 'audit']):
            continue
        for f in files:
            if f.endswith(ext):
                matches.append(os.path.join(root, f))
    return matches

tsx_files = find_files('.tsx') + find_files('.ts')

# ---- S2077: ++/-- as statement ----
print("=== Fixing S2077 ===")
fixed = 0
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Find standalone ++/-- (not in assignment or expression)
    new_content = content
    
    # Pattern: line with just i++ or i-- or obj.prop++ etc as a standalone statement
    patterns = [
        # i++ or i-- as standalone statement (with optional spaces and semicolon)
        (r'(\s+)(\w+(?:\.\w+)?)\+\+(\s*;?\s*)$', r'\1\1\2 += 1\3'),
        (r'(\s+)(\w+(?:\.\w+)?)\-\-(\s*;?\s*)$', r'\1\1\2 -= 1\3'),
    ]
    
    changed = False
    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, new_content, flags=re.MULTILINE)
        if new_content != content:
            changed = True
    
    # Also check for ++/-- in the middle of line used as statement
    # Pattern: someVar++; or someVar--;
    pattern_mid = re.compile(r'(\b\w+(?:\.\w+)?)\+\+(\s*;)', re.MULTILINE)
    pattern_mid2 = re.compile(r'(\b\w+(?:\.\w+)?)\-\-(\s*;)', re.MULTILINE)
    
    if pattern_mid.search(new_content) or pattern_mid2.search(new_content):
        new_content = pattern_mid.sub(r'\1 += 1\2', new_content)
        new_content = pattern_mid2.sub(r'\1 -= 1\2', new_content)
        changed = True
    
    if changed and new_content != content:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  Fixed: {rel}")
        fixed += 1

print(f"S2077 fixed in {fixed} files")
