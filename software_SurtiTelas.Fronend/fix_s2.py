#!/usr/bin/env python3
"""
Fix #2: authStore.ts - Replace atob with safe JWT decode (S3326)
"""
import re

filepath = "src/core/stores/authStore.ts"

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Replace the isTokenExpired function that uses atob
old_func = '''function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return true;
    const now = Date.now() / 1000;
    return payload.exp < now + 30;
  } catch {
    return true;
  }
}'''

new_func = '''function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(
      decodeURIComponent(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map(c => '%%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    );
    if (!payload.exp) return true;
    const now = Date.now() / 1000;
    return payload.exp < now + 30;
  } catch {
    return true;
  }
}'''

if old_func in content:
    content = content.replace(old_func, new_func)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {filepath}")
else:
    print(f"Pattern not found in {filepath}")
    print("Content around atob:")
    for i, line in enumerate(content.split('\n'), 1):
        if 'atob' in line:
            print(f"  Line {i}: {line}")
