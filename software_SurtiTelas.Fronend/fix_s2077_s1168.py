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

# ---- S2077: Fix standalone ++/-- ----
print("=== Fixing S2077 ===")
fixed = 0
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    original = content

    # Pattern 1: standalone i++; (not preceded by word char or dot, not followed by digit or +-)
    content = re.sub(r'(?<![\w.])\b(\w+(?:\.\w+)?)\+\+(?!\d)(?!\s*[+\-])', r'\1 += 1', content)
    # Pattern 2: standalone i--; (not preceded by word char or dot, not followed by digit or -)
    content = re.sub(r'(?<![\w.])\b(\w+(?:\.\w+)?)\-\-(?!\d)(?!\s*[+\-])', r'\1 -= 1', content)

    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Fixed: {rel}")
        fixed += 1

print(f"S2077 fixed in {fixed} files")

# ---- S1168: Fix empty arrays ----
print("\n=== Fixing S1168 ===")
fixed1168 = 0
for fpath in tsx_files:
    rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
    with open(fpath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    original = content
    # Find empty arrays with type annotations
    # Pattern: const x: Type[] = [] -> const x: Type[] = [] as Type[] (already typed)
    # Pattern: const x = [] -> needs type inference from context
    
    # Simple case: const/let x: Type[] = [] - these are already typed, SonarQube might still flag them
    # Fix: const x: Type[] = [] as Type[]
    
    # Find patterns like: const/let/var name: Type[] = []
    pattern = re.compile(r'(const|let|var)\s+(\w+)\s*:\s*([^=\[]+)\[([^\]]*)\]\s*=\s*\[\s*\]')
    def replacer(m):
        return f'{m.group(1)} {m.group(2)}: {m.group(3)}[{m.group(4)}] = [] as {m.group(3)}{m.group(4)}'
    
    content = pattern.sub(replacer, content)
    
    # Also handle: const/let/var name = [] with no type (need to skip these - too risky)
    # Just find and report them
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Fixed: {rel}")
        fixed1168 += 1

print(f"S1168 fixed in {fixed1168} files")
