import re

with open('src/presentation/pages/cliente/quotation-steps/QuotationDecision.module.css', 'r') as f:
    content = f.read()

pattern = re.compile(r'([.a-zA-Z_][^{]*)\{([^}]*)\}')
for m in pattern.finditer(content):
    name = m.group(1)
    body = m.group(2)
    lines = body.strip().split('\n')
    has_padding_top = any('padding-top:' in l for l in lines)
    has_padding_shorthand = any(re.match(r'\s*padding\s*:', l) for l in lines)
    if has_padding_top and has_padding_shorthand:
        print(f'RULE: {name.strip()}')
        for line in lines:
            if 'padding' in line:
                print(f'  {line.strip()}')
        print()
