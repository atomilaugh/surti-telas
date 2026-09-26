import re
from collections import Counter

with open('src/presentation/pages/admin/AdminCatalogo.module.css', 'r') as f:
    content = f.read()

pattern = re.compile(r'([.a-zA-Z_][^{]*)\{([^}]*)\}')
for m in pattern.finditer(content):
    name = m.group(1).strip()
    body = m.group(2)
    lines = body.strip().split('\n')
    props = []
    for line in lines:
        mm = re.match(r'\s*([a-zA-Z-]+)\s*:', line)
        if mm:
            props.append(mm.group(1))
    counts = Counter(props)
    dups = {k: v for k, v in counts.items() if v > 1}
    if dups:
        print(f'{name}: {dups}')
