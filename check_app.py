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

# Check for AdminClients (without s) and AdminClients (with s)
has_without_s = b'AdminClients' in line19
has_with_s = b'AdminClients' in line19
print(f'AdminClients (without s) in line19: {has_without_s}')
print(f'AdminClients (with s) in line19: {has_with_s}')

# Show the exact bytes around position 109-121
print(f'Bytes 109-121: {line19[109:122]}')
try:
    print(f'As text: {line19[109:122].decode("utf-8", errors="replace")}')
except:
    pass

# Check the whole file
has_without_s_file = b'AdminClients' in content_bytes
has_with_s_file = b'AdminClients' in content_bytes
print(f'AdminClients (without s) in file: {has_without_s_file}')
print(f'AdminClients (with s) in file: {has_with_s_file}')

# Also check for Admin+C pattern
import re
for match in re.finditer(rb'Admin\w+', line19):
    print(f'Found Admin pattern: {match.group()} at {match.start()}')