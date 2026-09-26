#!/usr/bin/env python3
"""
Extended reliability analysis - find patterns missed in first pass.
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
print(f"Files: {len(files)}")

for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            lines = fh.readlines()
            content = ''.join(lines)
            rel_path = f.replace('src/', '').replace('\\', '/')

        # S1186: Empty code blocks (function with just {})
        for m in re.finditer(r'(?:async\s+)?(?:function\s+\w+\s*\([^)]*\)|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>))\s*\{\s*\}', content):
            line_no = content[:m.start()].count('\n') + 1
            results["S1186_empty_func"].append((rel_path, line_no))

        # Also check: arrow functions assigned with {} on same line
        for m in re.finditer(r'(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*\{\s*\}', content):
            line_no = content[:m.start()].count('\n') + 1
            results["S1186_empty_func"].append((rel_path, line_no))

        # S6208: Empty blocks in if/for/while/switch/catch
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if re.search(r'\b(if|for|while|switch|catch)\s*\([^)]*\)\s*\{\s*\}', stripped):
                results["S6208_empty_block"].append((rel_path, i))
            # Multi-line: if/for/while with { on next line, then }
            if re.search(r'\b(if|for|while)\s*\([^)]*\)\s*\{$', stripped):
                if i < len(lines) and lines[i].strip() in ('}', '{}'):
                    results["S6208_empty_block"].append((rel_path, i))

        # S125: Switch/if with 1-2 branches (already checked with 2 threshold)
        # Let me lower to 3 for switch, and check if without else
        for m in re.finditer(r'\bswitch\s*\([^)]+\)\s*\{', content):
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
            case_count = len(re.findall(r'\bcase\s+', switch_body))
            default_count = len(re.findall(r'\bdefault\s*:', switch_body))
            total = case_count + default_count
            if total <= 3:
                line_no = content[:start_pos].count('\n') + 1
                results["S125_few_branches"].append((rel_path, line_no, total))

        # S1481: Unused local variables (heuristic: const/let declared but not used)
        # This is complex to detect accurately - skip

        # S3776: Lower threshold (10) for more detection
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
                results["S3776_complexity_v2"].append((rel_path, line_no, complexity))

        # S1195: Unused imports
        # Find import statements and check if used
        for m in re.finditer(r"import\s+.*?\s+from\s+['\"][^'\"]+['\"]", content):
            import_text = m.group()
            # Extract imported names
            names = re.findall(r'(?:import\s+(\w+)|{\s*(\w+)', import_text)
            for full_name, named in names:
                if full_name and full_name not in ['type', 'typeof']:
                    if full_name not in content[m.end():] and full_name not in content[:m.start()]:
                        results["S1195_unused_import"].append((rel_path, content[:m.start()].count('\n') + 1, full_name))
                if named:
                    if named not in content[m.end():]:
                        results["S1195_unused_import"].append((rel_path, content[:m.start()].count('\n') + 1, named))

        # S3517: Expressions with identical operands
        for m in re.finditer(r'(\w+)\s*([=!]==|!=|===|!==)\s*\1\b', content):
            line_no = content[:m.start()].count('\n') + 1
            context = content[max(0,m.start()-30):m.start()+50].replace('\n', ' ')
            if not re.search(r'(if|while|for|switch|catch)\s*\(', context[:40]):
                results["S3517_identical"].append((rel_path, line_no))

        # S6578: Identical code blocks in if/else
        for m in re.finditer(r'if\s*\([^)]+\)\s*\{([^}]+)\}\s*else\s*\{([^}]+)\}', content):
            if_part = re.sub(r'\s+', ' ', m.group(1)).strip()
            else_part = re.sub(r'\s+', ' ', m.group(2)).strip()
            if if_part and else_part and if_part == else_part:
                line_no = content[:m.start()].count('\n') + 1
                results["S6578_identical_branches"].append((rel_path, line_no))

        # S2630: Missing break in switch
        for m in re.finditer(r'case\s+\w+:', content):
            case_start = m.start()
            next_case = content.find('case', m.end())
            next_default = content.find('default', m.end())
            next_break = content.find('break', m.end())
            end_marker = min(x for x in [next_case, next_default, len(content)] if x > m.end())
            if next_break == -1 or next_break > end_marker:
                line_no = content[:case_start].count('\n') + 1
                results["S2630_missing_break"].append((rel_path, line_no))

    except Exception as e:
        pass

print("\n" + "="*80)
print("EXTENDED RELIABILITY PATTERNS")
print("="*80)

for rule in sorted(results.keys()):
    items = results[rule]
    unique_files = len(set(item[0] for item in items))
    total = len(items)
    print(f"\n{rule}: {total} issues across {unique_files} files")
    
    if total <= 30:
        for item in items:
            if isinstance(item, tuple):
                print(f"  {item[0]}:{item[1]}" + (f" {item[2]}" if len(item) > 2 else ""))
    else:
        by_file = Counter(item[0] for item in items)
        for f, c in by_file.most_common(10):
            print(f"  {f}: {c}")
