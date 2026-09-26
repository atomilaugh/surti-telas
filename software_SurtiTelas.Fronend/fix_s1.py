#!/usr/bin/env python3
"""
Fix #1: tokenStorage.ts - Replace localStorage with in-memory store
This addresses S5247 (sensitive token in localStorage)
"""
import os

filepath = "src/infrastructure/api/tokenStorage.ts"

new_content = '''const ACCESS_KEY = 'surtitelas.accessToken';
let cachedToken: string | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    return cachedToken;
  },
  getRefreshToken(): string | null {
    return null;
  },
  setTokens(accessToken: string, _refreshToken: string): void {
    this.setAccessToken(accessToken);
  },
  setAccessToken(accessToken: string): void {
    cachedToken = accessToken;
  },
  clear(): void {
    cachedToken = null;
  },
};
'''

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Fixed {filepath}")
