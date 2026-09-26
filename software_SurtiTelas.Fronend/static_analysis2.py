#!/usr/bin/env python3
"""
Deep static analysis of SurtiTelas Frontend - Reliability & Security patterns
"""
import os
import re
import json
from collections import defaultdict, Counter

results = defaultdict(list)

def find_ts_files(base):
    files = []
    for root, dirs, fnames in os.walk(base):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist', '.git', 'coverage')]
        for f in fnames:
            if f.endswith(('.ts', '.tsx')) and not f.endswith('.test.tsx') and not f.endswith('.test.ts'):
                files.append(os.path.join(root, f))
    return files

def scan():
    files = find_ts_files("src")
    for f in files:
        try:
            with open(f, 'r', encoding='utf-8', errors='replace') as fh:
                lines = fh.readlines()
                content = ''.join(lines)

            # S1166: Empty catch blocks
            for i, line in enumerate(lines, 1):
                if re.search(r'\bcatch\s*\(', line):
                    # check if body is empty or just comment
                    next_lines = ''.join(lines[i:min(i+5, len(lines))])
                    if re.search(r'catch\s*\([^)]*\)\s*\{\s*\}', next_lines) or \
                       re.search(r'catch\s*\([^)]*\)\s*\{\s*\n\s*//', next_lines) or \
                       re.search(r'catch\s*\([^)]*\)\s*\{\s*\n\s*\}', next_lines):
                        results["S1166_empty_catch"].append({"file": f, "line": i})

            # S6208: Empty if/for/while blocks
            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                if re.search(r'\b(if|for|while)\s*\([^)]*\)\s*\{\s*\}', stripped):
                    results["S6208_empty_block"].append({"file": f, "line": i})

            # S1186: Empty code blocks
            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                if re.search(r'\{\s*\}', stripped) and not re.search(r'\{[^}]*\w', stripped) and \
                   (stripped.startswith('const ') or stripped.startswith('let ') or stripped.startswith('var ') or
                    stripped.startswith('async') or 'function' in stripped or '=>' in stripped):
                    pass  # too broad, skip

            # S125: Switch/if with too few branches
            # Find switch statements
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
                if case_count + default_count <= 2:
                    line_no = content[:start_pos].count('\n') + 1
                    results["S125_few_branches"].append({
                        "file": f, "line": line_no,
                        "branches": case_count + default_count
                    })

            # S3749: document.write / document.writeln
            for i, line in enumerate(lines, 1):
                if re.search(r'document\.(write|writeln)\s*\(', line):
                    results["S3749_document_write"].append({"file": f, "line": i, "content": line.strip()[:100]})

            # S4790: Math.random
            for i, line in enumerate(lines, 1):
                if re.search(r'Math\.random\s*\(', line):
                    results["S4790_Math_random"].append({"file": f, "line": i, "content": line.strip()[:100]})

            # S5247: localStorage with sensitive data
            for i, line in enumerate(lines, 1):
                if re.search(r'localStorage\.(setItem|getItem|removeItem)\s*\(', line):
                    context_start = max(0, i-3)
                    context_end = min(len(lines), i+3)
                    context = '\n'.join(lines[context_start:context_end])
                    if re.search(r'token|accessToken|auth|session|secret|credential|password|key', context, re.I):
                        results["S5247_localStorage_sensitive"].append({"file": f, "line": i})

            # S3326: atob/atob usage (weak decoding)
            for i, line in enumerate(lines, 1):
                if re.search(r'\batob\s*\(', line):
                    results["S3326_atob"].append({"file": f, "line": i})

            # S2078: Hardcoded passwords
            for i, line in enumerate(lines, 1):
                if re.search(r'(password|passwd|pwd)\s*[:=]\s*["\'][^"\']+["\']', line, re.I):
                    results["S2078_hardcoded_pwd"].append({"file": f, "line": i, "content": line.strip()[:100]})

            # S1172: Unused private functions (heuristic: private functions with no calls)
            # This is complex - skip for now

            # S3776: High cognitive complexity - heuristic: functions with many if/else/for/while
            func_pattern = re.compile(r'(?:^\s*(?:export\s+)?(?:async\s+)?(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>))|\(?:[^)]*\)\s*=>)', re.MULTILINE)
            for m in func_pattern.finditer(content):
                func_start_line = content[:m.start()].count('\n') + 1
                func_text = content[m.start():m.start()+200]
                if 'function' in func_text or '=>' in func_text:
                    # Count complexity indicators in the function body
                    # Find matching closing brace
                    brace_start = content.find('{', m.start())
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
                    func_body = content[m.start():end+1]
                    complexity = len(re.findall(r'\b(if|else|for|while|case|catch)\b', func_body))
                    complexity += len(re.findall(r'\&\&|\|\|', func_body))
                    if complexity >= 20:
                        results["S3776_high_complexity"].append({
                            "file": f, "line": func_start_line, "complexity": complexity
                        })

            # S2259: Null dereference risk (nullable not checked)
            # Heuristic: variable?. or variable && followed by usage
            # Skip - too many false positives

        except Exception as e:
            print(f"Error scanning {f}: {e}")

    return files

def print_summary():
    print("\n" + "="*80)
    print("STATIC ANALYSIS RESULTS")
    print("="*80)
    
    for rule in sorted(results.keys()):
        items = results[rule]
        files_affected = len(set(item["file"] for item in items))
        total = len(items)
        
        # Determine category
        if rule.startswith("S5") or rule.startswith("S4") or rule.startswith("S3") or rule.startswith("S2"):
            category = "SECURITY"
        else:
            category = "RELIABILITY/MAINTAINABILITY"
        
        print(f"\n[{category}] {rule}: {total} issues across {files_affected} files")
        
        if total <= 30:
            for item in items:
                file_short = item["file"].replace("src/", "")
                extra = f" complexity={item.get('complexity','')}" if 'complexity' in item else ""
                extra += f" branches={item.get('branches','')}" if 'branches' in item else ""
                content = f" :: {item['content']}" if 'content' in item else ""
                print(f"  {file_short}:{item['line']}{extra}{content}")
        else:
            by_file = Counter(item["file"] for item in items)
            for f, c in by_file.most_common(15):
                print(f"  {f.replace('src/', '')}: {c} issues")
            remaining = total - sum(c for _, c in by_file.most_common(15))
            if remaining > 0:
                print(f"  ... and {remaining} more in other files")

files = scan()
print_summary()

# Also count specific patterns for reliability
print("\n\n" + "="*80)
print("RELIABILITY IMPACT ESTIMATION")
print("="*80)

# SonarQube Reliability rating depends on:
# Number of issues by severity (Blocker > Critical > Major > Minor > Info)
# Common high-count Reliability rules in TS projects:
print("""
Common Reliability rules that likely contribute to D rating:
- S1166: Empty catch blocks (counted above)
- S6208: Empty blocks (counted above)
- S3776: High cognitive complexity (counted above, threshold>=20)
- S125: Too few branches (counted above)
- S1186: Empty code blocks
- S1172: Unused private functions
- S1481: Unused variables (partially fixed)
- S106: Console errors (partially fixed)
- S2638: Super type calls (unlikely in this project)
""")
