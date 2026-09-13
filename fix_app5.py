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

# Replace AdminClients (without s) with AdminClients (with s)
# We need to be careful to only replace the exact word
new_content = content_bytes.replace(b'AdminClients', b'AdminClients')

# Verify
if b'AdminClients' in new_content:
    print('ERROR: AdminClients still present')
elif b'AdminClients' in new_content:
    print('SUCCESS: AdminClients replaced with AdminClients')
else:
    print('Neither found')

# Write back
if has_bom:
    new_raw = bom + new_content
else:
    new_raw = new_content

with open(filepath, 'wb') as f:
    f.write(new_raw)

print('File updated')