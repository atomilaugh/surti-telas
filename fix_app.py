filepath = 'C:\\Users\\usuario\\surti_telas\\software_SurtiTelas.Fronend\\src\\presentation\\pages\\App.tsx'
with open(filepath, 'rb') as f:
    raw = f.read()

# Check BOM
bom = b'\xef\xbb\xbf'
has_bom = raw.startswith(bom)
print(f'Has BOM: {has_bom}')

# Remove BOM for processing
if has_bom:
    content_bytes = raw[3:]
else:
    content_bytes = raw

# Find line 19 (0-indexed: 18)
lines = content_bytes.split(b'\r\n')
if len(lines) <= 18:
    lines = content_bytes.split(b'\n')
line19 = lines[18]
print(f'Line 19 bytes: {line19}')

# Find AdminClients or AdminClients in line 19
import re
matches = re.findall(rb'Admin\w+', line19)
print(f'Admin matches: {matches}')

# Check if AdminClients (without s) exists
if b'AdminClients' in line19 and b'AdminClients' not in line19:
    print('FOUND AdminClients (without s) - needs fixing')
    # Replace AdminClients with AdminClients
    new_line19 = line19.replace(b'AdminClients', b'AdminClients')
    lines[18] = new_line19
    print(f'Fixed line 19: {new_line19}')
    
    # Reconstruct file
    new_content = b'\r\n'.join(lines) if b'\r\n' in content_bytes else b'\n'.join(lines)
    if has_bom:
        new_raw = bom + new_content
    else:
        new_raw = new_content
    
    with open(filepath, 'wb') as f:
        f.write(new_raw)
    print('File updated')
else:
    print('AdminClients (without s) not found, checking AdminClients...')
    if b'AdminClients' in line19:
        print('AdminClients (with s) found - correct')
    else:
        print('Neither found')
        # Show hex around position 109-121
        print(f'Bytes 109-121: {line19[109:122]}')
        try:
            print(f'As text: {line19[109:122].decode("utf-8", errors="replace")}')
        except:
            pass