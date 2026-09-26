#!/usr/bin/env python3
"""
Deep count of all reliability-generating patterns in the codebase.
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

        # S1166: Empty catch blocks - improved detection
        for i, line in enumerate(lines, 1):
            if re.search(r'\bcatch\s*\(', line):
                # Check this and next few lines for empty/catch body
                block = ''.join(lines[i-1:min(i+8, len(lines))])
                # Pattern: catch(...) {} or catch(...) { }
                if re.search(r'catch\s*\([^)]*\)\s*\{\s*\}', block):
                    results["S1166_empty_catch"].append(rel_path)
                elif re.search(r'catch\s*\([^)]*\)\s*\{', block) and not re.search(r'catch\s*\([^)]*\)\s*\{[^}]', block):
                    # Catch with opening brace but nothing meaningful inside
                    results["S1166_empty_catch"].append(rel_path)
                else:
                    # Check if body has only comments
                    catch_match = re.search(r'catch\s*\([^)]*\)\s*\{', block)
                    if catch_match:
                        after = block[catch_match.end():]
                        # Find matching close brace
                        depth = 1
                        for j, ch in enumerate(after):
                            if ch == '{':
                                depth += 1
                            elif ch == '}':
                                depth -= 1
                                if depth == 0:
                                    body = after[:j]
                                    stripped = body.strip()
                                    if stripped == '' or stripped.startswith('//') or (stripped.startswith('/*') and stripped.endswith('*/')):
                                        results["S1166_empty_catch"].append(rel_path)
                                    break

        # S6208: Empty if/for/while/switch blocks
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if re.search(r'\b(if|for|while)\s*\([^)]*\)\s*\{\s*\}', stripped):
                results["S6208_empty_block"].append(rel_path)
            if re.search(r'\bswitch\s*\([^)]*\)\s*\{\s*\}', stripped):
                results["S6208_empty_block"].append(rel_path)

        # S125: Switch with <=2 branches or if with no else
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
            total_branches = case_count + default_count
            if total_branches <= 2:
                line_no = content[:start_pos].count('\n') + 1
                results["S125_few_branches"].append((rel_path, line_no, total_branches))

        # S3776: High complexity (heuristic)
        # Find function declarations and count branching
        func_starts = []
        for m in re.finditer(r'(?:async\s+)?function\s+\w+\s*\(', content):
            func_starts.append((m.start(), content[m.start():m.start()+50]))
        for m in re.finditer(r'(?:async\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\w+\s*=>)', content):
            func_starts.append((m.start(), content[m.start():m.start()+60]))
        
        for start_pos, func_text in func_starts:
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
            if complexity >= 15:
                line_no = content[:start_pos].count('\n') + 1
                results["S3776_high_complexity"].append((rel_path, line_no, complexity, func_text[:50].replace('\n', ' ')))

        # S3749: document.write (security but counts in reliability too sometimes)
        for i, line in enumerate(lines, 1):
            if re.search(r'document\.(write|writeln)\s*\(', line):
                results["S3749_document_write"].append((rel_path, i))

        # S106: console.error / console.log
        for i, line in enumerate(lines, 1):
            if re.search(r'console\.(error|warn|log|info|debug)\s*\(', line):
                results["S106_console"].append((rel_path, i))

        # S1186: Empty code blocks (function bodies with just {})
        for m in re.finditer(r'(?:async\s+)?(?:function\s+\w+\s*\([^)]*\)|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>))\s*\{', content):
            start = m.start()
            # Find the body
            brace_start = content.find('{', start)
            if brace_start != -1:
                next_char = content[brace_start+1:brace_start+3]
                if next_char == '}' or next_char == ' {':
                    line_no = content[:start].count('\n') + 1
                    results["S1186_empty_func"].append((rel_path, line_no))

        # S1172: Unused private functions (functions starting with _ that are never called)
        # Find all private functions
        for m in re.finditer(r'(?:async\s+)?(?:function\s+_\w+|(?:const|let|var)\s+_\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>))', content):
            func_text = m.group()
            func_name_match = re.search(r'(_\w+)', func_text)
            if func_name_match:
                func_name = func_name_match.group(1)
                # Check if it's called anywhere
                if func_name not in re.sub(re.escape(func_name), '', content):
                    line_no = content[:m.start()].count('\n') + 1
                    results["S1172_unused_private"].append((rel_path, line_no, func_name))

    except Exception as e:
        print(f"Error in {f}: {e}")

# Print comprehensive summary
print("\n" + "="*80)
print("RELIABILITY PATTERNS - DETAILED")
print("="*80)

for rule in sorted(results.keys()):
    items = results[rule]
    unique_files = len(set(items) if isinstance(items, list) and items and isinstance(items[0], str) else set(item[0] for item in items if isinstance(item, tuple)))
    total = len(items)
    
    print(f"\n{rule}: {total} occurrences, {unique_files} files")
    
    if rule == "S1166_empty_catch":
        by_file = Counter(items)
        for f, c in by_file.most_common(20):
            print(f"  {f}: {c}")
    elif rule in ("S3749_document_write", "S106_console"):
        for item in items[:20]:
            print(f"  {item[0]}:{item[1]}")
        if len(items) > 20:
            print(f"  ... and {len(items)-20} more")
    elif rule in ("S6208_empty_block", "S1186_empty_func"):
        for item in items[:20]:
            print(f"  {item}")
        if len(items) > 20:
            print(f"  ... and {len(items)-20} more")
    elif rule == "S3776_high_complexity":
        for item in sorted(items, key=lambda x: -x[2])[:20]:
            print(f"  {item[0]}:{item[1]} complexity={item[2]} {item[3]}")
        if len(items) > 20:
            print(f"  ... and {len(items)-20} more")
    elif rule == "S125_few_branches":
        for item in items[:20]:
            print(f"  {item[0]}:{item[1]} branches={item[2]}")
        if len(items) > 20:
            print(f"  ... and {len(items)-20} more")
    elif rule == "S1172_unused_private":
        for item in items[:20]:
            print(f"  {item[0]}:{item[1]} func={item[2]}")
        if len(items) > 20:
            print(f"  ... and {len(items)-20} more")

# Total impact estimation
print("\n" + "="*80)
print("IMPACT ESTIMATION")
print("="*80)
total_issues = sum(len(items) for items in results.values())
print(f"Total potential issues across all rules: {total_issues}")
for rule in sorted(results.keys()):
    print(f"  {rule}: {len(results[rule])}")
