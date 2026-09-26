#!/usr/bin/env python3
"""
Verify current state of all Reliability issues found.
Also check for additional patterns.
"""
import os
import re
from collections import Counter, defaultdict

results = defaultdict(lambda: {"count": 0, "files": set(), "details": []})

def find_ts_files(base):
    files = []
    for root, dirs, fnames in os.walk(base):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist', '.git', 'coverage')]
        for f in fnames:
            if f.endswith(('.ts', '.tsx')) and not f.endswith('.test.tsx') and not f.endswith('.test.ts'):
                files.append(os.path.join(root, f))
    return files

files = find_ts_files("src")

for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            lines = fh.readlines()
            content = ''.join(lines)
            rel = f.replace('src/', '').replace('\\', '/')

        # S1166: Empty catch blocks (checking if // ignore or void _e; fix is applied)
        for i, line in enumerate(lines, 1):
            if re.search(r'\bcatch\s*\(', line):
                block = '\n'.join(lines[i-1:min(i+10, len(lines))])
                if re.search(r'catch\s*\([^)]*\)\s*\{', block):
                    m = re.search(r'catch\s*\([^)]*\)\s*\{([^}]*)\}', block, re.DOTALL)
                    if m:
                        body = m.group(1).strip()
                        if body == '' or body.startswith('//') or body == 'void _e;':
                            results["S1166"]["count"] += 1
                            results["S1166"]["files"].add(rel)
                            results["S1166"]["details"].append((rel, i, body[:50]))

        # S1172: Unused private functions - check if they still exist with _ prefix
        for m in re.finditer(r'(?:async\s+)?function\s+_(\w+)\s*\(', content):
            name = m.group(1)
            # Check if function is called
            call_pattern = re.escape(name) + r'\s*\('
            if not re.search(call_pattern, content.replace(m.group(0), '')):
                results["S1172"]["count"] += 1
                results["S1172"]["files"].add(rel)
                results["S1172"]["details"].append((rel, content[:m.start()].count('\n') + 1, name))

        # S1172: _ prefixed const/let functions
        for m in re.finditer(r'(?:const|let|var)\s+_(\w+)\s*=\s*(?:async\s+)?(?:\(|function)', content):
            name = m.group(1)
            if f'_{name}(' not in content and f'{name}(' not in content:
                results["S1172"]["count"] += 1
                results["S1172"]["files"].add(rel)
                results["S1172"]["details"].append((rel, content[:m.start()].count('\n') + 1, name))

        # S3776: Complexity check
        func_starts = []
        for m in re.finditer(r'(?:async\s+)?function\s+\w+\s*\(', content):
            func_starts.append(m.start())
        for m in re.finditer(r'(?:async\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>)', content):
            func_starts.append(m.start())
        for start_pos in func_starts:
            bs = content.find('{', start_pos)
            if bs == -1: continue
            bc = 0
            end = bs
            for i in range(bs, len(content)):
                if content[i] == '{': bc += 1
                elif content[i] == '}':
                    bc -= 1
                    if bc == 0:
                        end = i
                        break
            body = content[start_pos:end+1]
            complexity = len(re.findall(r'\b(if|else|for|while|case|catch)\b', body))
            complexity += len(re.findall(r'\&\&|\|\|', body))
            if complexity >= 10:
                results["S3776"]["count"] += 1
                results["S3776"]["files"].add(rel)
                results["S3776"]["details"].append((rel, content[:start_pos].count('\n') + 1, complexity))

        # Check for console.error specifically (S106) - user said NO
        for i, line in enumerate(lines, 1):
            if re.search(r'console\.(error|warn|log|info|debug)\s*\(', line):
                results["S106"]["count"] += 1
                results["S106"]["files"].add(rel)

        # Check for unused imports
        for m in re.finditer(r"import\s+.*?\s+from\s+['\"][^'\"]+['\"]", content):
            it = m.group()
            names = re.findall(r'(?:import\s+(\w+)|{\s*(\w+)', it)
            for full, named in names:
                if full and full not in ['type', 'typeof']:
                    if full not in content[m.end():]:
                        results["S1195"]["count"] += 1
                        results["S1195"]["files"].add(rel)

    except Exception as e:
        pass

print("CURRENT STATE OF RELIABILITY ISSUES")
print("="*80)
total = 0
for rule in sorted(results.keys()):
    data = results[rule]
    uf = len(data["files"])
    c = data["count"]
    total += c
    print(f"\n{rule}: {c} issues across {uf} files")
    if rule == "S1166":
        for item in data["details"][:10]:
            print(f"  {item[0]}:{item[1]} body='{item[2]}'")
    elif rule == "S1172":
        for item in data["details"][:15]:
            print(f"  {item[0]}:{item[1]} func=_{item[2]}")
    elif rule == "S3776":
        for item in sorted(data["details"], key=lambda x: -x[2])[:10]:
            print(f"  {item[0]}:{item[1]} complexity={item[2]}")

print(f"\nTOTAL: {total}")
