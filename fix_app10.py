filepath = 'C:\\Users\\usuario\\surti_telas\\software_SurtiTelas.Fronend\\src\\presentation\\pages\\App.tsx'
with open(filepath, 'rb') as f:
    raw = f.read()

# Check BOM
bom = b'\xef\xbb\xbf'
has_bom = raw.startswith(bom)

# Remove BOM for processing
if has_bom:
    content_bytes = raw[3:]
else:
    content_bytes = raw

# Find line 19
lines = content_bytes.split(b'\r\n')
if len(lines) <= 18:
    lines = content_bytes.split(b'\n')
line19 = lines[18]

# The correct export name is AdminClients (with s)
# The wrong name in the file is AdminClients (without s)
# We need to replace AdminClients with AdminClients

# Replace all occurrences of AdminClients (without s) with AdminClients (with s)
# But we need to be careful not to replace AdminClients (with s) with AdminClients (with s)
# So we replace AdminClients with AdminClients only when it's not followed by 's'

import re

# Replace AdminClients (without s) with AdminClients (with s)
# Use negative lookahead to ensure we don't match AdminClients (with s)
new_line19 = re.sub(rb'AdminClients(?!s)', b'AdminClients', line19)

# Verify
if b'AdminClients' in new_line19:
    print('ERROR: AdminClients still present')
elif b'AdminClients' in new_line19:
    print('SUCCESS: AdminClients replaced with AdminClients')
else:
    print('Neither found')

# Update line 19
lines[18] = new_line19

# Reconstruct file
new_content = b'\r\n'.join(lines) if b'\r\n' in content_bytes else b'\n'.join(lines)
if has_bom:
    new_raw = bom + new_content
else:
    new_raw = new_content

with open(filepath, 'wb') as f:
    f.write(new_raw)

print('File updated')
print(f'New line 19: {new_line19}')