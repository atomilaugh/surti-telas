#!/usr/bin/env python3
"""
Fix Security: authStore.ts - atob with proper decode
"""
filepath = "src/core/stores/authStore.ts"

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Replace atob-based JWT decode with a proper implementation
old = """function isTokenExpired(token: string): boolean {
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
}"""

new = """function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(decoded);
    if (!payload.exp) return true;
    const now = Date.now() / 1000;
    return payload.exp < now + 30;
  } catch {
    return true;
  }
}"""

if old in content:
    content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {filepath}")
else:
    print(f"Pattern not found in {filepath}")
    for i, line in enumerate(content.split('\n'), 1):
        if 'atob' in line:
            print(f"  Line {i}: {line}")
