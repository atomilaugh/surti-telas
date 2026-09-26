import os, glob

base = r'C:\Users\usuario'
results = []
for root, dirs, files in os.walk(base):
    # Skip too deep paths
    depth = root.count(os.sep)
    if depth > 8:
        dirs.clear()
        continue
    for f in files:
        lower = f.lower()
        if 'sonar' in lower and (lower.endswith('.log') or lower.endswith('.out') or 'sonar.log' in lower):
            path = os.path.join(root, f)
            try:
                size = os.path.getsize(path)
                if size > 0:
                    results.append((path, size))
            except:
                pass

for path, size in sorted(results, key=lambda x: -x[1])[:20]:
    print(f'{size:>12,} bytes: {path}')
