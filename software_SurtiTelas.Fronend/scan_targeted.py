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

# ---- S2077: Check remaining files for standalone ++/-- ----
print("=== S2077 remaining ===")
remaining = 0
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Check for standalone ++/-- (used as statement, not in expression)
    for match in re.finditer(r'(?<![\w.])\w+(?:\.\w+)?\+\+(?!\d)(?!\s*[+\-])', content):
        remaining += 1
        print(f"  {rel}: {match.group(0)[:50]}")
        break
    for match in re.finditer(r'(?<![\w.])\w+(?:\.\w+)?\-\-(?!\d)(?!\s*[+\-])', content):
        remaining += 1
        print(f"  {rel}: {match.group(0)[:50]}")
        break

print(f"S2077 remaining standalone: {remaining}")

# ---- S1168: Empty arrays ----
print("\n=== S1168 ===")
s1168_files = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    for match in re.finditer(r'=\s*\[\s*\]', content):
        s1168_files.append((rel, content[:match.start()].count('\n') + 1))

print(f"S1168: {len(s1168_files)} instances")
for rel, line in s1168_files[:20]:
    print(f"  {rel}:{line}")

# ---- S3749: String comparisons ----
print("\n=== S3749 ===")
s3749_files = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    for match in re.finditer(r'["\']([^"\']+)["\']\s*==\s*["\']([^"\']+)["\']', content):
        if match.group(1) != match.group(2):
            s3749_files.append((rel, content[:match.start()].count('\n') + 1, match.group(1), match.group(2)))

print(f"S3749: {len(s3749_files)} instances")
for rel, line, a, b in s3749_files[:20]:
    print(f"  {rel}:{line}: '{a}' == '{b}'")

# ---- S1144: Unused imports ----
print("\n=== S1144 ===")
s1144 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    # Find imports
    for match in re.finditer(r'import\s+(?:{([^}]+)})\s+from', content):
        imports = [i.strip() for i in match.group(1).split(',')]
        for imp in imports:
            imp_name = imp.split(' as ')[-1].strip()
            if imp_name.startswith('_'):
                continue
            pattern = re.compile(r'\b' + re.escape(imp_name) + r'\b')
            count = len(pattern.findall(content))
            if count <= 1:
                s1144.append((rel, imp_name))
                if len(s1144) <= 10:
                    line_num = content[:match.start()].count('\n') + 1
                    print(f"  {rel}:{line_num}: {imp_name}")

print(f"S1144 total: {len(s1144)}")

# ---- S106: Hardcoded credentials ----
print("\n=== S106 ===")
s106 = []
for fpath in tsx_files + find_files('.css'):
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    for match in re.finditer(r'(?:password|passwd|pwd|secret|token|apiKey|api_key|API_KEY)\s*[:=]\s*["\'][^"\']{6,}["\']', content, re.IGNORECASE):
        s106.append((rel, match.group(0)[:80]))
        if len(s106) <= 10:
            print(f"  {rel}: {match.group(0)[:80]}")

print(f"S106 total: {len(s106)}")
