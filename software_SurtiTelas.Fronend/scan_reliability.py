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

results = {}

# ---- S3776: Cognitive complexity ----
print("=== S3776: Cognitive complexity ===")
s3776 = []
tsx_files = find_files('.tsx') + find_files('.ts')
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    lines = content.split('\n')
    in_function = False
    depth = 0
    complexity = 1
    func_start = 0
    
    i = 0
    while i < len(lines):
        line = lines[i]
        # Function start
        if re.search(r'\b(function|const\s+\w+\s*=\s*(async\s*)?\(?\w*\s*=>|function\s+\w+\s*\(|method\s+\w+\s*\(|:\s*\w+\s*\([^)]*\)\s*\{)\s*$', line) and not re.search(r'\.(tsx?|css|json)', rel):
            if in_function:
                if complexity > 15:
                    s3776.append(f"{rel}:{func_start+1}: complexity={complexity}")
                    print(f"  {rel}:{func_start+1}: complexity={complexity}")
                complexity = 1
                depth = 0
            in_function = True
            func_start = i
        
        if in_function:
            # Count decision points
            if re.search(r'\bif\s*\(', line):
                complexity += 1
            if re.search(r'\bcase\s+', line):
                complexity += 1
            if re.search(r'\bcatch\s*\(', line):
                complexity += 1
            if re.search(r'\?\s*[^:]+:', line):
                complexity += 1
            if re.search(r'\b&&\b', line):
                complexity += 1
            if re.search(r'\b\|\|\b', line):
                complexity += 1
        
        # Track braces for function end
        for ch in line:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0 and in_function:
                    if complexity > 15:
                        s3776.append(f"{rel}:{func_start+1}: complexity={complexity}")
                        print(f"  {rel}:{func_start+1}: complexity={complexity}")
                    complexity = 1
                    in_function = False
        i += 1

results["S3776"] = s3776
print(f"S3776 total: {len(s3776)}")

# ---- S1481: Unused local variables ----
print("\n=== S1481: Unused local variables ===")
s1481 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    lines = content.split('\n')
    # Find variable declarations and check if used
    for match in re.finditer(r'(?:const|let)\s+(\w+)\s*[=:]', content):
        var_name = match.group(1)
        # Skip if starts with underscore or is a React hook
        if var_name.startswith('_') or var_name.startswith('use'):
            continue
        # Count occurrences (declaration + usage)
        pattern = re.compile(r'\b' + re.escape(var_name) + r'\b')
        count = len(pattern.findall(content))
        if count == 1:  # Only declared, never used
            line_num = content[:match.start()].count('\n') + 1
            s1481.append(f"{rel}:{line_num}: {var_name}")
            print(f"  {rel}:{line_num}: {var_name}")

results["S1481"] = s1481
print(f"S1481 total: {len(s1481)}")

# ---- S2077: Increment/decrement used as statement ----
print("\n=== S2077: Inc/dec as statement ===")
s2077 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    for match in re.finditer(r'(\w+)\+\+|(\w+)--', content):
        s2077.append(f"{rel}")
        print(f"  {rel}")
        break  # Just count per file

results["S2077"] = s2077
print(f"S2077 total: {len(s2077)}")

# ---- S3749: String comparisons ----
print("\n=== S3749: String comparisons ===")
s3749 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Find string == string patterns (should use === or .localeCompare)
    for match in re.finditer(r'["\'][^"\']*["\']\s*==\s*["\'][^"\']*["\']', content):
        s3749.append(f"{rel}")
        print(f"  {rel}: {match.group(0)[:80]}")
        break  # Count per file

results["S3749"] = s3749
print(f"S3749 total: {len(s3749)}")

# ---- S2259: Null pointer ----
print("\n=== S2259: Null pointer ===")
s2259 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Find potential null dereferences: obj.prop where obj might be null
    # Simplified: find patterns like x.y where x is a return value that could be null
    for match in re.finditer(r'\b\w+\.\w+\.\w+\s*[=.;()]', content):
        s2259.append(f"{rel}")
        print(f"  {rel}: {match.group(0)[:80]}")
        break

results["S2259"] = s2259
print(f"S2259 total: {len(s2259)}")

# ---- S3516: HTML injection ----
print("\n=== S3516: HTML injection ===")
s3516 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Find dangerous: dangerouslySetInnerHTML
    if 'dangerouslySetInnerHTML' in content:
        s3516.append(f"{rel}")
        print(f"  {rel}")

results["S3516"] = s3516
print(f"S3516 total: {len(s3516)}")

# ---- S2638: Null check missing ----
print("\n=== S2638: Null check ===")
s2638 = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Find API calls without null checks
    for match in re.finditer(r'\.then?\s*\(\s*\(?\s*(?:\([^)]*\)|[^)])*\)\s*=>\s*\{?\s*(?:const\s+\w+\s*=\s*)?(?:await\s+)?\w+\.', content):
        s2638.append(f"{rel}")
        print(f"  {rel}")
        break

results["S2638"] = s2638
print(f"S2638 total: {len(s2638)}")

print(f"\n=== SUMMARY ===")
total = 0
for k, v in results.items():
    print(f"{k}: {len(v)}")
    total += len(v)
print(f"TOTAL: {total}")
