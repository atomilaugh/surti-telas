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

# Find functions with cognitive complexity > 10 (more aggressive threshold)
print("=== S3776: Functions with complexity > 10 ===")
results = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    lines = content.split('\n')

    i = 0
    while i < len(lines):
        line = lines[i]
        # Simple function detection
        is_func = bool(re.search(
            r'(?:async\s+)?(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=()])\s*=>|(?:async\s*)?(?:\w[\w.]*)\s*\()',
            line
        ))
        if not is_func:
            i += 1
            continue

        brace_start = line.find('{')
        if brace_start == -1:
            i += 1
            continue

        complexity = 1
        depth = 1
        j = brace_start + 1
        func_line = i + 1

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
            ternary_count = len(re.findall(r'\?\s*[^:{};]+:\s*[^?{};]+', stripped))
            complexity += ternary_count
            j += 1

        if complexity > 10:
            func_name = re.search(r'function\s+(\w+)|(?:const|let|var)\s+(\w+)|(\w[\w.]*)\s*\(', line)
            name = func_name.group(1) or func_name.group(2) or func_name.group(3) or 'anon'
            results.append((rel, func_line, complexity, name))
            print(f"  {rel}:{func_line}: {name} complexity={complexity}")

        i = j

print(f"\nTotal functions with complexity > 10: {len(results)}")

# Save results for analysis
with open('complexity_results.json', 'w') as f:
    json.dump(results, f, indent=2)
