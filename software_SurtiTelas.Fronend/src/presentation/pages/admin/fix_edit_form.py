with open(r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend\src\presentation\pages\admin\Produccion.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the edit modal form and fix indentation
# The form starts at line 1364 (0-indexed: 1363)
# We need to indent all content inside the form by 2 more spaces

in_edit_form = False
form_indent = 0
new_lines = []

for i, line in enumerate(lines):
    stripped = line.lstrip()
    
    if '               <form id="editOrdenForm"' in line:
        in_edit_form = True
        form_indent = len(line) - len(line.lstrip())
        new_lines.append(line)
        continue
    
    if in_edit_form and '              </form>' in line:
        in_edit_form = False
        new_lines.append(line)
        continue
    
    if in_edit_form and stripped and not stripped.startswith('{') and not stripped.startswith('</'):
        # This is content inside the form - increase indentation by 2
        current_indent = len(line) - len(line.lstrip())
        new_indent = current_indent + 2
        new_lines.append(' ' * new_indent + stripped + '\n')
        continue
    
    new_lines.append(line)

with open(r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend\src\presentation\pages\admin\Produccion.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Fixed edit form indentation')
