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

# ---- S2077: ++/-- as statement - FIX ----
print("=== Fixing S2077 ===")
fixed_files = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    original = content

    # Fix: standalone i++; -> i += 1;
    content = re.sub(r'(?<!\w)(\w+(?:\.\w+)?)\+\+(\s*;)', r'\1 += 1\2', content)
    # Fix: standalone i--; -> i -= 1;
    content = re.sub(r'(?<!\w)(\w+(?:\.\w+)?)\-\-(\s*;)', r'\1 -= 1\2', content)

    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixed_files.append(rel)
        print(f"  Fixed: {rel}")

print(f"S2077 fixed in {len(fixed_files)} files")

# ---- S3776: Cognitive complexity ----
print("\n=== S3776: Cognitive complexity ===")
high_complexity = []
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    lines = content.split('\n')
    results = []

    # Find all functions/methods/arrow functions
    i = 0
    while i < len(lines):
        line = lines[i]
        # Match function declarations
        func_match = re.match(r'\s*(?:(?:async\s*)?function\s+\w+\s*\(|(?:?:async\s*)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:?:async\s*)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=()])\s*=>|(?:?:async\s*)?(?:\w[\w.]*)\s*\([^)]*\)\s*\{)', line)
        if not func_match:
            i += 1
            continue

        # Find the opening brace
        brace_start = line.find('{')
        if brace_start == -1:
            i += 1
            continue

        # Count complexity from this point
        complexity = 1
        depth = 1
        j = brace_start + 1
        func_lines = [line]

        while j < len(lines) and depth > 0:
            l = lines[j]
            func_lines.append(l)
            for ch in l:
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1

            # Count decision points
            stripped = l.strip()
            if re.search(r'\bif\s*\(', stripped):
                complexity += 1
            if re.search(r'\belse\s+if\s*\(', stripped):
                complexity += 1
            if re.search(r'\bcase\s+', stripped):
                complexity += 1
            if re.search(r'\bcatch\s*\(', stripped):
                complexity += 1
            # Ternary operator
            ternary_count = len(re.findall(r'\?\s*[^:{}]+\s*:\s*[^?{}]+', stripped))
            complexity += ternary_count
            # Logical operators (each && or || adds 1, but not in conditions already counted)
            logic_ops = len(re.findall(r'\b\w+\s*\?\s*[^:]+:\s*[^;]+', stripped))
            if logic_ops > 0:
                complexity += logic_ops

            j += 1

        if complexity > 15:
            func_name = re.search(r'function\s+(\w+)|(?:const|let|var)\s+(\w+)|(\w[\w.]*)\s*\(', line)
            name = func_name.group(1) or func_name.group(2) or func_name.group(3) or 'anonymous'
            results.append((i + 1, complexity, name))
            high_complexity.append((rel, i + 1, complexity, name))

        i = j

    # Print results for this file
    for line_num, comp, name in results:
        print(f"  {rel}:{line_num}: {name} complexity={comp}")

print(f"\nS3776 total: {len(high_complexity)}")
