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

# Show the exact bytes at position 109-121
print(f'Bytes 109-121: {line19[109:122]}')
print(f'Length: {len(line19[109:122])}')

# Check what's at position 109-121
segment = line19[109:122]
print(f'Segment: {segment}')
print(f'Segment as text: {segment.decode("utf-8", errors="replace")}')

# The correct export name is AdminClients (with s)
# The wrong name is AdminClients (without s)
# Let's check which one is in the file
correct = b'AdminClients'
wrong = b'AdminClients'

print(f'Correct (AdminClients) in segment: {correct in segment}')
print(f'Wrong (AdminClients) in segment: {wrong in segment}')

# Replace wrong with correct
if wrong in segment:
    print('FOUND WRONG NAME - fixing...')
    new_segment = segment.replace(wrong, correct)
    print(f'New segment: {new_segment}')
    
    # Reconstruct line 19
    new_line19 = line19[:109] + new_segment + line19[122:]
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
else:
    print('Wrong name not found in segment')
    # Check if correct name is already there
    if correct in segment:
        print('Correct name already present')
    else:
        print('Neither name found')