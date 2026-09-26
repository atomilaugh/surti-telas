#!/usr/bin/env python3
"""
Comprehensive static analysis for Reliability rules.
"""
import os
import re
from collections import Counter, defaultdict

results = defaultdict(lambda: {"count": 0, "files": set(), "lines": []})

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

        # S1186: Empty function bodies - broader detection
        for m in re.finditer(r'(?:async\s+)?(?:function\s+\w+\s*\([^)]*\)|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>))\s*\{\s*\}', content):
            line_no = content[:m.start()].count('\n') + 1
            results["S1186_empty_func"]["count"] += 1
            results["S1186_empty_func"]["files"].add(rel)
            results["S1186_empty_func"]["lines"].append((rel, line_no))

        # S6208: Empty blocks (if/for/while/switch with empty body)
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if re.search(r'\b(if|for|while|switch|catch)\s*\([^)]*\)\s*\{\s*\}', stripped):
                results["S6208_empty_block"]["count"] += 1
                results["S6208_empty_block"]["files"].add(rel)
                results["S6208_empty_block"]["lines"].append((rel, i))
            if re.search(r'\b(if|for|while)\s*\([^)]*\)\s*\{$', stripped):
                if i < len(lines) and lines[i].strip() in ('}', '{}'):
                    results["S6208_empty_block"]["count"] += 1
                    results["S6208_empty_block"]["files"].add(rel)
                    results["S6208_empty_block"]["lines"].append((rel, i))

        # S1195: Unused imports
        for m in re.finditer(r"import\s+.*?\s+from\s+['\"][^'\"]+['\"]", content):
            import_text = m.group()
            names = re.findall(r'(?:import\s+(\w+)|{\s*(\w+)', import_text)
            for full_name, named in names:
                if full_name and full_name not in ['type', 'typeof']:
                    rest = content[m.end():]
                    if full_name not in rest:
                        results["S1195_unused_import"]["count"] += 1
                        results["S1195_unused_import"]["files"].add(rel)
                        results["S1195_unused_import"]["lines"].append((rel, content[:m.start()].count('\n') + 1))
                if named:
                    if named not in content[m.end():]:
                        results["S1195_unused_import"]["count"] += 1
                        results["S1195_unused_import"]["files"].add(rel)
                        results["S1195_unused_import"]["lines"].append((rel, content[:m.start()].count('\n') + 1))

        # S1481: Unused local variables (heuristic: const/let declared but not used after declaration)
        # This is complex - use a simpler heuristic: find const/let declarations and check if name is used later
        for m in re.finditer(r'(?:const|let)\s+(\w+)\s*=', content):
            name = m.group(1)
            if name.startswith('_') or name.isupper():
                continue  # skip constants and underscore vars
            before = content[:m.end()]
            after = content[m.end():]
            # Check if name is used after declaration (excluding the declaration itself)
            if re.search(r'\b' + re.escape(name) + r'\b', after):
                pass  # used, skip
            else:
                results["S1481_unused_local"]["count"] += 1
                results["S1481_unused_local"]["files"].add(rel)
                results["S1481_unused_local"]["lines"].append((rel, content[:m.start()].count('\n') + 1))

        # S3776: Lower threshold for complexity
        func_starts = []
        for m in re.finditer(r'(?:async\s+)?function\s+\w+\s*\(', content):
            func_starts.append(m.start())
        for m in re.finditer(r'(?:async\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>)', content):
            func_starts.append(m.start())
        
        for start_pos in func_starts:
            brace_start = content.find('{', start_pos)
            if brace_start == -1:
                continue
            brace_count = 0
            end = brace_start
            for i in range(brace_start, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end = i
                        break
            func_body = content[start_pos:end+1]
            complexity = len(re.findall(r'\b(if|else|for|while|case|catch)\b', func_body))
            complexity += len(re.findall(r'\&\&|\|\|', func_body))
            if complexity >= 10:
                line_no = content[:start_pos].count('\n') + 1
                results["S3776_complexity"]["count"] += 1
                results["S3776_complexity"]["files"].add(rel)
                results["S3776_complexity"]["lines"].append((rel, line_no, complexity))

    except Exception as e:
        pass

print("\n" + "="*80)
print("RELIABILITY PATTERNS - COMPREHENSIVE")
print("="*80)

for rule in sorted(results.keys()):
    data = results[rule]
    unique_files = len(data["files"])
    total = data["count"]
    print(f"\n{rule}: {total} issues across {unique_files} files")
    if total <= 30:
        for item in data["lines"][:20]:
            if len(item) == 3:
                print(f"  {item[0]}:{item[1]} complexity={item[2]}")
            else:
                print(f"  {item[0]}:{item[1]}")
    else:
        by_file = Counter(item[0] for item in data["lines"])
        for f, c in by_file.most_common(10):
            print(f"  {f}: {c} issues")
        remaining = total - sum(c for _, c in by_file.most_common(10))
        if remaining > 0:
            print(f"  ... and {remaining} more")
