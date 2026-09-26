#!/usr/bin/env python3
"""
Fix #3: Create a shared crypto utility for Math.random replacements
"""
import os

util_path = "src/shared/utils/cryptoUtils.ts"

content = '''/**
 * Cryptographically secure random utilities.
 * Replaces Math.random (S4790) which is not suitable for identifiers.
 */
export function secureRandomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

export function secureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const value = new DataView(bytes.buffer).getUint32(0, false) % range;
  return min + value;
}

export function generateSecureId(prefix: string, length: number = 6): string {
  return `${prefix}-${secureRandomHex(length)}`;
}
'''

os.makedirs(os.path.dirname(util_path), exist_ok=True)
with open(util_path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Created {util_path}")
