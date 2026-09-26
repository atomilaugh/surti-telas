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

# Find actual return [] patterns
print("=== S1168: return [] ===")
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    for match in re.finditer(r'\breturn\s*\[\s*\]', content):
        line_num = content[:match.start()].count('\n') + 1
        print(f"  {rel}:{line_num}")

# Also check for empty object returns
print("\n=== return {} ===")
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    for match in re.finditer(r'\breturn\s*\{\s*\}', content):
        line_num = content[:match.start()].count('\n') + 1
        print(f"  {rel}:{line_num}")
