#!/usr/bin/env python3
"""
Find ALL catch blocks and check which ones are empty or near-empty.
"""
import os
import re

files_to_check = []
for root, dirs, fnames in os.walk("src"):
    dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist', '.git', 'coverage')]
    for f in fnames:
        if f.endswith(('.ts', '.tsx')) and not f.endswith('.test.tsx') and not f.endswith('.test.ts'):
            files_to_check.append(os.path.join(root, f))

empty_catches = []
non_empty_catches = []

for f in files_to_check:
    with open(f, 'r', encoding='utf-8', errors='replace') as fh:
        content = fh.read()
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            if re.search(r'\bcatch\s*\(', line) or re.search(r'\bcatch\s*\{', line):
                # Get context around the catch
                context_start = max(0, i-1)
                context_end = min(len(lines), i+10)
                context = '\n'.join(lines[context_start:context_end])
                
                # Check if the catch block is empty or has only comments/void
                # Find the opening brace
                brace_match = re.search(r'catch\s*\([^)]*\)\s*\{', context)
                if brace_match:
                    # Find closing brace
                    after_brace = context[brace_match.end():]
                    if '}' in after_brace:
                        body = after_brace[:after_brace.index('}')].strip()
                        if body == '' or body.startswith('//') or body == 'void _e;' or body == 'void 0;':
                            rel_path = f.replace('src/', '').replace('\\', '/')
                            empty_catches.append(f"{rel_path}:{i}: body='{body}'")
                        else:
                            non_empty_catches.append(f"{rel_path}:{i}: body='{body[:50]}'")

print("EMPTY/NEAR-EMPTY CATCH BLOCKS:")
for item in empty_catches:
    print(f"  {item}")

print(f"\nNON-EMPTY CATCH BLOCKS: {len(non_empty_catches)}")
for item in non_empty_catches[:20]:
    print(f"  {item}")
