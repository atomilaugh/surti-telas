import re
from collections import Counter

with open('src/presentation/pages/admin/AdminReportes.module.css', 'r') as f:
    content = f.read()

pattern = re.compile(r'([.a-zA-Z_][^{]*)\{([^}]*)\}')
rules = [(m.group(1), m.group(2)) for m in pattern.finditer(content)]

for i, (name, body) in enumerate(rules):
    if 'border-collapse' in body:
        print(f'RULE {i}: {name.strip()}')
        for line in body.strip().split('\n'):
            if 'border-collapse' in line:
                print(f'  {line.strip()}')
        print()

rule_names = {}
for i, (name, body) in enumerate(rules):
    n = name.strip()
    if n not in rule_names:
        rule_names[n] = []
    rule_names[n].append((i, body))

for n, occurrences in rule_names.items():
    if len(occurrences) > 1:
        print(f'DUPLICATE RULE: {n} (appears {len(occurrences)} times)')
