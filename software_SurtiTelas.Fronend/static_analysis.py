#!/usr/bin/env python3
"""
Deep static analysis of SurtiTelas Frontend to identify patterns that generate
SonarQube Reliability and Security issues.
"""
import os
import re
import json
from collections import defaultdict, Counter

SRC = "src"

results = {
    "reliability": defaultdict(list),
    "security": defaultdict(list),
}

def find_ts_files(base):
    files = []
    for root, dirs, fnames in os.walk(base):
        # skip node_modules, dist, tests
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist', '.git', 'coverage')]
        for f in fnames:
            if f.endswith(('.ts', '.tsx')) and not f.endswith('.test.tsx') and not f.endswith('.test.ts'):
                files.append(os.path.join(root, f))
    return files

def count_pattern(filepath, pattern, rule_name):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            for lineno, line in enumerate(f, 1):
                if pattern.search(line):
                    results["reliability" if "S" in rule_name else "security"][rule_name].append({
                        "file": filepath, "line": lineno, "content": line.strip()[:120]
                    })
    except Exception as e:
        pass

files = find_ts_files(SRC)
print(f"Total TS/TSX files analyzed: {len(files)}")

# === RELIABILITY PATTERNS ===

# S1166: Empty catch blocks - catch with empty body or only comments
catch_empty_pattern = re.compile(r'\bcatch\s*\{?\s*\}')
catch_comment_pattern = re.compile(r'\bcatch\s*\{?\s*\}?(?:\s*\{|[^\}]*?\/\/)')
for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            content = fh.read()
            lines = content.split('\n')
            # Find all try/catch blocks
            for i, line in enumerate(lines, 1):
                if re.search(r'\bcatch\s*\(', line) or re.search(r'\bcatch\s*\{', line):
                    # Check next lines for empty body
                    remaining = '\n'.join(lines[i-1:i+5])
                    if re.search(r'catch\s*\([^)]*\)\s*\{?\s*\}', remaining) or \
                       re.search(r'catch\s*\{?\s*\}', remaining):
                        results["reliability"]["S1166_empty_catch"].append({
                            "file": f, "line": i, "content": line.strip()[:120]
                        })
                    elif re.search(r'catch\s*\(', line):
                        # multi-line catch - check body
                        brace_start = None
                        for j in range(i, min(i+10, len(lines)+1)):
                            if '{' in lines[j-1]:
                                brace_start = j
                                break
                        if brace_start:
                            body_lines = lines[brace_start:brace_start+10]
                            body = '\n'.join(body_lines)
                            if re.search(r'\{\s*\}', body) or re.search(r'\{\s*\n\s*\}', body):
                                results["reliability"]["S1166_empty_catch"].append({
                                    "file": f, "line": i, "content": line.strip()[:120]
                                })
    except:
        pass

# S3776: Cognitive complexity - identify functions with many nested branches
# We look for functions with many if/else/switch/for/while/try/catch
func_complexity_pattern = re.compile(r'(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|(?:async\s+)?(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>))', re.MULTILINE)
complexity_threshold = 15  # SonarQube default threshold

for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            content = fh.read()
            lines = content.split('\n')
            func_start = None
            func_name = None
            brace_count = 0
            in_func = False
            complexity = 0
            func_info = None

            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                if not in_func:
                    match = re.search(r'(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))', stripped)
                    if match and stripped.startswith(('function', 'const', 'let', 'var', 'async')):
                        func_name = match.group(1) or match.group(2) or stripped[:40]
                        func_start = i
                        in_func = True
                        brace_count = 0
                        complexity = 0
                elif in_func:
                    brace_count += stripped.count('{') - stripped.count('}')
                    complexity += len(re.findall(r'\b(if|else|for|while|case|catch|&&|\|\|)\b', stripped))
                    if brace_count <= 0 and stripped.endswith('}'):
                        if complexity >= complexity_threshold and func_name:
                            results["reliability"]["S3776_high_complexity"].append({
                                "file": f, "line": func_start, "complexity": complexity,
                                "name": func_name, "content": lines[func_start-1].strip()[:100]
                            })
                        in_func = False
                        func_name = None

            # Handle arrow functions that don't end with } (expression bodies)
    except:
        pass

# S1172: Unused private functions (private methods never called)
# This requires cross-reference analysis - skip for now but note it

# S6208: Empty blocks (empty if/for/while/switch bodies)
for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            for lineno, line in enumerate(fh, 1):
                if re.search(r'\b(if|for|while|switch)\s*\([^)]*\)\s*\{\s*\}', line):
                    results["reliability"]["S6208_empty_block"].append({
                        "file": f, "line": lineno, "content": line.strip()[:120]
                    })
                # Also check if with opening brace on next line
                if re.search(r'\b(if|for|while)\s*\([^)]*\)\s*\{$', line):
                    next_line = ""
                    with open(f, 'r', encoding='utf-8', errors='replace') as fh2:
                        for j, nl in enumerate(fh2, 1):
                            if j == lineno + 1:
                                next_line = nl.strip()
                                break
                    if next_line == '}' or next_line == '{}':
                        results["reliability"]["S6208_empty_block"].append({
                            "file": f, "line": lineno, "content": line.strip()[:120]
                        })
    except:
        pass

# S125: Switch/if with only one or two cases
for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            content = fh.read()
            # Find switch statements with few cases
            switches = re.finditer(r'\bswitch\s*\([^)]+\)\s*\{', content)
            for m in switches:
                start = content[:m.start()].count('\n') + 1
                # Find end of switch
                brace_count = 0
                end = m.start()
                for i in range(m.start(), len(content)):
                    if content[i] == '{':
                        brace_count += 1
                    elif content[i] == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end = i
                            break
                switch_body = content[m.start():end]
                case_count = len(re.findall(r'\bcase\s+', switch_body))
                default_count = len(re.findall(r'\bdefault\s*:', switch_body))
                if case_count + default_count <= 2:
                    results["reliability"]["S125_few_cases"].append({
                        "file": f, "line": start, "cases": case_count + default_count,
                        "content": switch_body[:200].replace('\n', ' ')
                    })
    except:
        pass

# === SECURITY PATTERNS ===

# S5247: Sensitive token in localStorage
for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            for lineno, line in enumerate(fh, 1):
                if re.search(r'localStorage\.(setItem|getItem)\s*\(', line):
                    if re.search(r'token|accessToken|auth|session|secret|credential', line, re.I) or \
                       re.search(r'token|accessToken|auth|session|secret|credential', open(f,'r',encoding='utf-8',errors='replace').read()[:5000], re.I):
                        results["security"]["S5247_localStorage_token"].append({
                            "file": f, "line": lineno, "content": line.strip()[:120]
                        })
    except:
        pass

# S3749: document.write / document.writeln
for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            for lineno, line in enumerate(fh, 1):
                if re.search(r'document\.(write|writeln)\s*\(', line):
                    results["security"]["S3749_document_write"].append({
                        "file": f, "line": lineno, "content": line.strip()[:120]
                    })
    except:
        pass

# S4790/S5246: Math.random
for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            for lineno, line in enumerate(fh, 1):
                if re.search(r'Math\.random\s*\(', line):
                    results["security"]["S4790_Math_random"].append({
                        "file": f, "line": lineno, "content": line.strip()[:120]
                    })
    except:
        pass

# S5246: Math.random used for security purposes
for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            content = fh.read()
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                if re.search(r'Math\.random\s*\(', line):
                    context = '\n'.join(lines[max(0,i-3):min(len(lines),i+3)])
                    if re.search(r'id|key|token|secret|password|nonce|salt|hash|encrypt|sign|auth', context, re.I):
                        results["security"]["S5246_math_random_security"].append({
                            "file": f, "line": i, "content": line.strip()[:120]
                        })
    except:
        pass

# S2078: Password in plain text in variable names
for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            for lineno, line in enumerate(fh, 1):
                if re.search(r'(password|passwd|pwd)\s*[:=]\s*["\'][^"\']{3,}["\']', line, re.I):
                    results["security"]["S2078_hardcoded_password"].append({
                        "file": f, "line": lineno, "content": line.strip()[:120]
                    })
    except:
        pass

# S5547: Hardcoded credentials in URLs
for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            for lineno, line in enumerate(fh, 1):
                if re.search(r'https?://[^/\s:@]+:[^/\s:@]+@', line):
                    results["security"]["S5547_hardcoded_creds_url"].append({
                        "file": f, "line": lineno, "content": line.strip()[:120]
                    })
    except:
        pass

# === Print summary ===
print("\n" + "="*80)
print("RELIABILITY PATTERNS")
print("="*80)
for rule, items in sorted(results["reliability"].items()):
    files_affected = len(set(item["file"] for item in items))
    print(f"\n{rule}: {len(items)} issues across {files_affected} files")
    if len(items) <= 20:
        for item in items:
            print(f"  {item['file']}:{item.get('line', '?')} complexity={item.get('complexity','')} name={item.get('name','')} {item['content']}")
    else:
        by_file = Counter(item["file"] for item in items)
        for f, c in by_file.most_common(10):
            print(f"  {f}: {c} issues")
        print(f"  ... and {len(items) - sum(c for _,c in by_file.most_common(10))} more")

print("\n" + "="*80)
print("SECURITY PATTERNS")
print("="*80)
for rule, items in sorted(results["security"].items()):
    files_affected = len(set(item["file"] for item in items))
    print(f"\n{rule}: {len(items)} issues across {files_affected} files")
    for item in items:
        print(f"  {item['file']}:{item.get('line', '?')} {item['content']}")
