#!/usr/bin/env python3
"""
Fix S3517: Identical expression in condition.
File: src/shared/config/systemModules.ts:1041
"""
filepath = "src/shared/config/systemModules.ts"

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Read around line 1041 to understand the context
lines = content.split('\n')
print(f"Lines around 1041:")
for i in range(1035, min(1050, len(lines))):
    print(f"  {i+1}: {lines[i]}")
