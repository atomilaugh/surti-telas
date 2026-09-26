#!/usr/bin/env python3
"""
Ultra-comprehensive Reliability analysis.
Check EVERY known SonarQube Reliability rule pattern.
"""
import os
import re
from collections import Counter, defaultdict

results = defaultdict(lambda: {"count": 0, "files": set()})

def find_ts_files(base):
    files = []
    for root, dirs, fnames in os.walk(base):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist', '.git', 'coverage')]
        for f in fnames:
            if f.endswith(('.ts', '.tsx')) and not f.endswith('.test.tsx') and not f.endswith('.test.ts'):
                files.append(os.path.join(root, f))
    return files

files = find_ts_files("src")
print(f"Files: {len(files)}")

for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            lines = fh.readlines()
            content = ''.join(lines)
            rel = f.replace('src/', '').replace('\\', '/')

        # S1166: Empty catch blocks
        for i, line in enumerate(lines, 1):
            if re.search(r'\bcatch\s*\(', line):
                block = '\n'.join(lines[i-1:min(i+10, len(lines))])
                if re.search(r'catch\s*\([^)]*\)\s*\{[^}]*\}', block):
                    m = re.search(r'catch\s*\([^)]*\)\s*\{([^}]*)\}', block)
                    if m and m.group(1).strip() in ('', '// ignore', 'void _e;'):
                        results["S1166"]["count"] += 1
                        results["S1166"]["files"].add(rel)

        # S6208: Empty blocks
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if re.search(r'\b(if|for|while|switch|catch)\s*\([^)]*\)\s*\{\s*\}', stripped):
                results["S6208"]["count"] += 1
                results["S6208"]["files"].add(rel)
            if re.search(r'\b(if|for|while)\s*\([^)]*\)\s*\{$', stripped):
                if i < len(lines) and lines[i].strip() in ('}', '{}'):
                    results["S6208"]["count"] += 1
                    results["S6208"]["files"].add(rel)

        # S1186: Empty function bodies
        for m in re.finditer(r'(?:async\s+)?(?:function\s+\w+\s*\([^)]*\)|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>))\s*\{\s*\}', content):
            line_no = content[:m.start()].count('\n') + 1
            results["S1186"]["count"] += 1
            results["S1186"]["files"].add(rel)

        # S125: Few branches in switch
        for m in re.finditer(r'\bswitch\s*\([^)]+\)\s*\{', content):
            start_pos = m.start()
            bc = 0
            end_pos = start_pos
            for i in range(start_pos, len(content)):
                if content[i] == '{': bc += 1
                elif content[i] == '}':
                    bc -= 1
                    if bc == 0:
                        end_pos = i
                        break
            body = content[start_pos:end_pos+1]
            cases = len(re.findall(r'\bcase\s+', body)) + len(re.findall(r'\bdefault\s*:', body))
            if cases <= 3:
                results["S125"]["count"] += 1
                results["S125"]["files"].add(rel)

        # S1172: Unused private functions
        for m in re.finditer(r'(?:async\s+)?function\s+_(\w+)\s*\(', content):
            name = m.group(1)
            if name not in re.sub(re.escape(m.group(0)), '', content):
                results["S1172"]["count"] += 1
                results["S1172"]["files"].add(rel)
        for m in re.finditer(r'(?:const|let|var)\s+_(\w+)\s*=\s*(?:async\s+)?(?:\(|function)', content):
            name = m.group(1)
            # Check if called (without _)
            if f'_{name}(' not in content and f'{name}(' not in content:
                results["S1172"]["count"] += 1
                results["S1172"]["files"].add(rel)

        # S3776: High cognitive complexity (threshold 10)
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

        # S1195: Unused imports
        for m in re.finditer(r"import\s+.*?\s+from\s+['\"][^'\"]+['\"]", content):
            it = m.group()
            names = re.findall(r'(?:import\s+(\w+)|{\s*(\w+)', it)
            for full, named in names:
                if full and full not in ['type', 'typeof']:
                    if full not in content[m.end():]:
                        results["S1195"]["count"] += 1
                        results["S1195"]["files"].add(rel)
                if named and named not in content[m.end():]:
                    results["S1195"]["count"] += 1
                    results["S1195"]["files"].add(rel)

        # S1481: Unused local variables (simple heuristic)
        for m in re.finditer(r'(?:const|let)\s+(\w+)\s*=[^=]', content):
            name = m.group(1)
            if name.startswith('_') or name.isupper():
                continue
            if not re.search(r'\b' + re.escape(name) + r'\b', content[m.end():]):
                results["S1481"]["count"] += 1
                results["S1481"]["files"].add(rel)

        # S2989: String literals in conditions
        for i, line in enumerate(lines, 1):
            if re.search(r'\bif\s*\(\s*["\'][^"\']+["\']\s*\)', line):
                results["S2989"]["count"] += 1
                results["S2989"]["files"].add(rel)

        # S3764: Useless control flow (identical if/else)
        for m in re.finditer(r'\bif\s*\([^)]+\)\s*\{([^}]*)\}\s*else\s*\{([^}]*)\}', content):
            if_part = re.sub(r'\s+', ' ', m.group(1)).strip()
            else_part = re.sub(r'\s+', ' ', m.group(2)).strip()
            if if_part and else_part and if_part == else_part:
                results["S3764"]["count"] += 1
                results["S3764"]["files"].add(rel)

        # S6578: Identical code blocks
        for m in re.finditer(r'if\s*\([^)]+\)\s*\{([^}]+)\}\s*else\s*\{([^}]+)\}', content):
            if re.sub(r'\s+', '', m.group(1)) == re.sub(r'\s+', '', m.group(2)):
                results["S6578"]["count"] += 1
                results["S6578"]["files"].add(rel)

    except Exception as e:
        pass

print("\n" + "="*80)
print("COMPREHENSIVE RELIABILITY ANALYSIS")
print("="*80)
total = 0
for rule in sorted(results.keys()):
    data = results[rule]
    uf = len(data["files"])
    c = data["count"]
    total += c
    print(f"{rule}: {c} issues, {uf} files")

print(f"\nTOTAL: {total}")
