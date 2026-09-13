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

print(f'Line 19: {line19}')

# Check for AdminClients (without s) and AdminClients (with s)
print(f'AdminClients (without s) in line19: {b"AdminClients" in line19}')
print(f'AdminClients (with s) in line19: {b"AdminClients" in line19}')

# Show the exact bytes around position 109-121
print(f'Bytes 109-121: {line19[109:122]}')
print(f'As text: {line19[109:122].decode("utf-8", errors="replace")}')

# Also check for Admin+C pattern
import re
for match in re.finditer(rb'Admin\w+', line19):
    print(f'Found Admin pattern: {match.group()} at {match.start()}')