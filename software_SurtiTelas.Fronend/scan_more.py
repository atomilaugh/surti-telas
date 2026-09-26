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
results = {}

# ---- S4684: Short-circuit evaluation ----
print("=== S4684: Short-circuit ===")
s4684 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Find patterns like: const x = a && b && c; where result is just truthy/falsy check
    # or if (a && b && c) where could be simplified
    for match in re.finditer(r'\b\w+\s*=\s*\w+\s*&&\s*\w+\s*&&\s*\w+', content):
        s4684.append((rel, content[:match.start()].count('\n') + 1, match.group(0)[:80]))
        if len(s4684) <= 10:
            print(f"  {rel}:{match.group(0)[:80]}")

results["S4684"] = s4684
print(f"S4684 total: {len(s4684)}")

# ---- S3749: String == comparison (TS/JS patterns) ----
print("\n=== S3749: String == ===")
s3749 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # String literal == string literal
    for match in re.finditer(r'["\']([^"\']+)["\']\s*==\s*["\']([^"\']+)["\']', content):
        if match.group(1) != match.group(2):
            s3749.append((rel, content[:match.start()].count('\n') + 1))
            if len(s3749) <= 5:
                print(f"  {rel}:'{match.group(1)}' == '{match.group(2)}'")

    # Variable == string literal (might need ===)
    for match in re.finditer(r'\b\w+\s*==\s*["\']([^"\']+)["\']', content):
        s3749.append((rel, content[:match.start()].count('\n') + 1))
        if len(s3749) <= 5:
            print(f"  {rel}:var == '{match.group(1)}'")

results["S3749"] = s3749
print(f"S3749 total: {len(s3749)}")

# ---- S1481: Truly unused local variables (refined) ----
print("\n=== S1481: Refined ===")
s1481 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Skip exports and React components
    if re.search(r'export\s+(?:default\s+)?(?:function|class|const|interface|type|enum)', content):
        continue

    lines = content.split('\n')
    for match in re.finditer(r'(?:const|let)\s+(\w+)\s*[=:]', content):
        var_name = match.group(1)
        if var_name.startswith('_') or var_name[0].isupper():
            continue
        pattern = re.compile(r'\b' + re.escape(var_name) + r'\b')
        count = len(pattern.findall(content))
        if count == 1:
            line_num = content[:match.start()].count('\n') + 1
            s1481.append((rel, line_num, var_name))
            if len(s1481) <= 10:
                print(f"  {rel}:{line_num}: {var_name}")

results["S1481"] = s1481
print(f"S1481 total: {len(s1481)}")

# ---- S1144: Unused imports (refined) ----
print("\n=== S1144: Refined ===")
s1144 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    for match in re.finditer(r'import\s+(?:{([^}]+)})\s+from', content):
        imports = [i.strip() for i in match.group(1).split(',')]
        for imp in imports:
            imp_name = imp.split(' as ')[-1].strip()
            if imp_name.startswith('_') or imp_name[0].isupper():
                continue
            pattern = re.compile(r'\b' + re.escape(imp_name) + r'\b')
            count = len(pattern.findall(content))
            if count <= 1:
                s1144.append((rel, imp_name))
                if len(s1144) <= 10:
                    line_num = content[:match.start()].count('\n') + 1
                    print(f"  {rel}:{line_num}: {imp_name}")

results["S1144"] = s1144
print(f"S1144 total: {len(s1144)}")

print(f"\n=== SUMMARY ===")
total = 0
for k, v in results.items():
    n = len(v)
    print(f"{k}: {n}")
    total += n
print(f"TOTAL: {total}")
