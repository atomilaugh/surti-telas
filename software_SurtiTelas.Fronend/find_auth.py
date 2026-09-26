import os
import json

# Check for any auth-related files or tokens
paths_to_check = [
    os.path.expanduser('~/.sonar'),
    os.path.expanduser('~/.sonarqube'),
    os.path.expanduser('~/.config/sonar'),
    os.path.expanduser('~/.config/sonarqube'),
    os.environ.get('HOME', '') + '/.sonar',
    os.environ.get('APPDATA', '') + '\\sonar',
    os.environ.get('LOCALAPPDATA', '') + '\\sonar',
    r'C:\Users\usuario\.sonar',
    r'C:\Users\usuario\.sonarqube',
    r'C:\Users\usuario\.npm\_npx',
]

for p in paths_to_check:
    if os.path.exists(p):
        print(f'{p}: EXISTS')
        if os.path.isdir(p):
            for root, dirs, files in os.walk(p):
                for f in files:
                    path = os.path.join(root, f)
                    try:
                        size = os.path.getsize(path)
                        if size < 1000000:
                            with open(path, 'rb') as fh:
                                content = fh.read(200)
                            if b'admin' in content.lower() or b'token' in content.lower() or b'sonar' in content.lower() or b'secret' in content.lower():
                                print(f'  {path}: {size} bytes - might contain auth')
                    except:
                        pass
        else:
            with open(p, 'rb') as fh:
                content = fh.read(500)
            print(f'  Content: {content[:200]}')
    else:
        print(f'{p}: NOT FOUND')

# Also check environment variables
print("\n=== Environment variables ===")
for key, value in os.environ.items():
    if any(x in key.lower() for x in ['sonar', 'auth', 'token', 'secret']):
        print(f'{key}: {value[:80]}')

# Check for .npmrc or package.json with auth
print("\n=== .npmrc ===")
for root, dirs, files in os.walk(r'C:\Users\usuario\surti_telas'):
    if '.npmrc' in files:
        path = os.path.join(root, '.npmrc')
        with open(path) as f:
            print(f'{path}:')
            print(f.read()[:500])

# Check package.json for sonar config
print("\n=== package.json ===")
pkg_path = r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend\package.json'
if os.path.exists(pkg_path):
    with open(pkg_path) as f:
        content = f.read()
    # Check for sonar scripts
    for line in content.split('\n'):
        if 'sonar' in line.lower() or 'scan' in line.lower():
            print(f'  {line.strip()}')
