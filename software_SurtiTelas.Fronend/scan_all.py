import os
import re
import sys
import json

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

# ---- S3776: Cognitive complexity ----
print("=== S3776 ===")
s3776 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    lines = content.split('\n')

    i = 0
    while i < len(lines):
        line = lines[i]
        # Function/method/arrow function detection
        is_func = bool(re.match(r'\s*(?:async\s+)?(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=()])\s*=>|(?:async\s*)?(?:\w[\w.]*)\s*\()', line))
        if not is_func:
            i += 1
            continue

        # Find opening brace
        brace_start = line.find('{')
        if brace_start == -1:
            i += 1
            continue

        complexity = 1
        depth = 1
        j = brace_start + 1

        while j < len(lines) and depth > 0:
            l = lines[j]
            for ch in l:
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
            stripped = l.strip()
            if re.search(r'\bif\s*\(', stripped): complexity += 1
            if re.search(r'\belse\s+if\s*\(', stripped): complexity += 1
            if re.search(r'\bcase\s+', stripped): complexity += 1
            if re.search(r'\bcatch\s*\(', stripped): complexity += 1
            if re.search(r'\b&&\b', stripped): complexity += 1
            if re.search(r'\b\|\|\b', stripped): complexity += 1
            # Ternary
            ternaries = re.findall(r'\?\s*[^:{};]+:\s*[^?{};]+', stripped)
            complexity += len(ternaries)
            j += 1

        if complexity > 15:
            func_name = re.search(r'function\s+(\w+)|(?:const|let|var)\s+(\w+)|(\w[\w.]*)\s*\(', line)
            name = func_name.group(1) or func_name.group(2) or func_name.group(3) or 'anon'
            s3776.append((rel, i + 1, complexity, name))
            print(f"  {rel}:{i+1}: {name} complexity={complexity}")
        i = j

results["S3776"] = s3776
print(f"S3776 total: {len(s3776)}")

# ---- S1313: Indentation ----
print("\n=== S1313: Indentation ===")
s1313 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    lines = content.split('\n')
    for idx, line in enumerate(lines, 1):
        if line.strip() == '':
            continue
        # Check indentation: should be multiple of 2 (or 4)
        leading = len(line) - len(line.lstrip())
        if leading > 0 and leading % 2 != 0:
            s1313.append((rel, idx, leading))
            if len(s1313) <= 10:
                print(f"  {rel}:{idx}: {leading} spaces")

results["S1313"] = s1313
print(f"S1313 total: {len(s1313)}")

# ---- S1168: Empty arrays ----
print("\n=== S1168 ===")
s1168 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    for match in re.finditer(r'=\s*\[\s*\]', content):
        s1168.append(rel)
        line_num = content[:match.start()].count('\n') + 1
        if len(s1168) <= 10:
            print(f"  {rel}:{line_num}")

results["S1168"] = s1168
print(f"S1168 total: {len(s1168)}")

# ---- S3749: String comparisons ----
print("\n=== S3749 ===")
s3749 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    for match in re.finditer(r'["\']([^"\']+)["\']\s*==\s*["\']([^"\']+)["\']', content):
        if match.group(1) != match.group(2):
            s3749.append(rel)
            line_num = content[:match.start()].count('\n') + 1
            if len(s3749) <= 10:
                print(f"  {rel}:{line_num}: '{match.group(1)}' == '{match.group(2)}'")

results["S3749"] = s3749
print(f"S3749 total: {len(s3749)}")

# ---- S4684: Short-circuit evaluation ----
print("\n=== S4684 ===")
s4684 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    for match in re.finditer(r'\b\w+\s*\?\s*\w+\s*:\s*\1\b', content):
        s4684.append(rel)
        line_num = content[:match.start()].count('\n') + 1
        if len(s4684) <= 10:
            print(f"  {rel}:{line_num}")

results["S4684"] = s4684
print(f"S4684 total: {len(s4684)}")

# ---- S1848: Static mutable access ----
print("\n=== S1848 ===")
s1848 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    for match in re.finditer(r'static\s+(?:readonly\s+)?\w+\s*[=:]', content):
        s1848.append(rel)
        if len(s1848) <= 5:
            line_num = content[:match.start()].count('\n') + 1
            print(f"  {rel}:{line_num}")

results["S1848"] = s1848
print(f"S1848 total: {len(s1848)}")

# ---- S1481: Truly unused variables (refined) ----
print("\n=== S1481 (refined) ===")
s1481_refined = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Skip component exports and type exports
    if re.search(r'export\s+(?:default\s+)?(?:function|class|const|interface|type|enum)', content):
        continue

    lines = content.split('\n')
    for match in re.finditer(r'(?:const|let)\s+(\w+)\s*[=:]', content):
        var_name = match.group(1)
        if var_name.startswith('_') or var_name.startswith('use') or var_name[0].isupper():
            continue
        # Check if used more than once (declaration + usage)
        pattern = re.compile(r'\b' + re.escape(var_name) + r'\b')
        count = len(pattern.findall(content))
        if count == 1:
            line_num = content[:match.start()].count('\n') + 1
            s1481_refined.append((rel, line_num, var_name))
            if len(s1481_refined) <= 10:
                print(f"  {rel}:{line_num}: {var_name}")

results["S1481_refined"] = s1481_refined
print(f"S1481 refined total: {len(s1481_refined)}")

print(f"\n=== SUMMARY ===")
total = 0
for k, v in results.items():
    n = len(v)
    print(f"{k}: {n}")
    total += n
print(f"TOTAL: {total}")
