import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend'

# Revert S1168 changes - remove all "as Type[]" assertions that were incorrectly added
print("=== Reverting S1168 ===")
reverted = 0

# Pattern: [] as Type[] -> [] (only for typed arrays)
# This reverts the S1168 fix to just [] for typed arrays
for root, dirs, files in os.walk(PROJECT_DIR):
    if any(x in root for x in ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'target', '.scannerwork', 'audit']):
        continue
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            fpath = os.path.join(root, f)
            rel = os.path.relpath(fpath, PROJECT_DIR).replace('\\', '/')
            with open(fpath, encoding='utf-8', errors='ignore') as fh:
                content = fh.read()

            original = content
            # Revert: [] as Type[] -> [] (typed array assertion)
            content = re.sub(r'\[\]\s+as\s+\w+(?:<[^>]+>)?\[\]', '[]', content)
            # Revert: [] as Type -> [] (simple type assertion, NOT array)
            content = re.sub(r'\[\]\s+as\s+\w+(?:<[^>]+>)?(?!\w)', '[]', content)

            if content != original:
                with open(fpath, 'w', encoding='utf-8') as fh:
                    fh.write(content)
                print(f"  Reverted: {rel}")
                reverted += 1

print(f"Reverted in {reverted} files")
