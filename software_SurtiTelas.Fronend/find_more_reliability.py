#!/usr/bin/env python3
"""
Find more Reliability patterns:
- S6208: Empty blocks (if/for/while with no body or just } next line)
- S1186: Empty function bodies
- S2630: Missing break in switch
- S2989: String literals in conditions
- S3764: Useless control flow
"""
import os
import re
from collections import Counter, defaultdict

results = defaultdict(list)

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

        # S6208: Empty blocks (broader detection)
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            # if/for/while with { on same line followed by }
            if re.search(r'\b(if|for|while)\s*\([^)]*\)\s*\{\s*\}', stripped):
                results["S6208"].append((rel, i))
            # if/for/while with { on this line, } on next
            if re.search(r'\b(if|for|while)\s*\([^)]*\)\s*\{$', stripped):
                if i < len(lines) and lines[i].strip() in ('}', '{}'):
                    results["S6208"].append((rel, i))

        # S1186: Empty function bodies (function with just {})
        for m in re.finditer(r'(?:async\s+)?(?:function\s+\w+\s*\([^)]*\)|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>))\s*\{\s*\}', content):
            line_no = content[:m.start()].count('\n') + 1
            results["S1186"].append((rel, line_no))

        # S2630: Missing break in switch (switch with case that falls through)
        switches = re.finditer(r'\bswitch\s*\([^)]+\)\s*\{', content)
        for m in switches:
            start_pos = m.start()
            brace_count = 0
            end_pos = start_pos
            for i in range(start_pos, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_pos = i
                        break
            switch_body = content[start_pos:end_pos+1]
            cases = list(re.finditer(r'case\s+', switch_body))
            for j, case_match in enumerate(cases):
                case_start = case_match.start()
                next_case = cases[j+1].start() if j+1 < len(cases) else switch_body.find('default')
                if next_case == -1:
                    next_case = end_pos - start_pos
                case_body = switch_body[case_start:next_case]
                if 'break' not in case_body and 'return' not in case_body and 'throw' not in case_body:
                    line_no = content[:start_pos+case_start].count('\n') + 1
                    results["S2630"].append((rel, line_no))

        # S2989: String literals in conditions (if ("something") or if ('x'))
        for m in re.finditer(r'\bif\s*\(\s*["\'][^"\']+["\']\s*\)', content):
            line_no = content[:m.start()].count('\n') + 1
            results["S2989"].append((rel, line_no))

        # S3764: Useless control flow (if/else where both branches do the same thing, or if that always evaluates to true/false)
        for m in re.finditer(r'\bif\s*\([^)]+\)\s*\{[^}]*\}\s*else\s*\{[^}]*\}', content):
            if_part = re.sub(r'\s+', ' ', m.group(0).split('else')[0]).strip()
            else_part = re.sub(r'\s+', ' ', m.group(0).split('else')[1]).strip()
            # Check if both bodies are the same
            if_part_body = re.search(r'\{([^}]*)\}', if_part)
            else_part_body = re.search(r'\{([^}]*)\}', else_part)
            if if_part_body and else_part_body:
                if if_part_body.group(1).strip() == else_part_body.group(1).strip():
                    line_no = content[:m.start()].count('\n') + 1
                    results["S3764"].append((rel, line_no))

    except Exception as e:
        pass

print("RELIABILITY PATTERNS (extended)")
print("="*60)
for rule in sorted(results.keys()):
    items = results[rule]
    unique_files = len(set(item[0] for item in items))
    print(f"{rule}: {len(items)} issues across {unique_files} files")
    for item in items[:10]:
        print(f"  {item[0]}:{item[1]}")
    if len(items) > 10:
        print(f"  ... and {len(items)-10} more")
