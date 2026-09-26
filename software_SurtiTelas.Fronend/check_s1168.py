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

# Check context of each empty array
print("=== S1168 context check ===")
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    lines = content.split('\n')
    for idx, line in enumerate(lines, 1):
        if re.search(r'=\s*\[\s*\]', line):
            # Check if it's a return statement or function return
            # or just a variable declaration
            context_before = lines[max(0, idx-3):idx]
            context_after = lines[idx:idx+3]
            is_return = any('return' in l or '=>' in l for l in context_before)
            is_param = any('=>' in l for l in context_before)
            is_var_decl = bool(re.search(r'(?:const|let|var)\s+\w+\s*[:=]', line))
            
            if is_return and not is_var_decl:
                print(f"  RETURN: {rel}:{idx}: {line.strip()[:100]}")
            elif is_var_decl:
                print(f"  VAR: {rel}:{idx}: {line.strip()[:100]}")
