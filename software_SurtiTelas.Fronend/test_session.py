#!/usr/bin/env python3
"""
Try to get a session cookie from SonarQube web UI.
"""
import urllib.request
import urllib.parse
import json
import http.cookiejar

# Try to authenticate via the web UI login form
BASE = "http://localhost:9000"

# First, get the login page to get any CSRF tokens
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

try:
    # Get login page
    req = urllib.request.Request(BASE + "/login", headers={'User-Agent': 'Mozilla/5.0'})
    with opener.open(req, timeout=15) as resp:
        login_html = resp.read().decode()
        print(f"Login page length: {len(login_html)}")
        # Check for CSRF token
        import re
        csrf_match = re.search(r'name="_sonarCSRF"[^v]*value="([^"]+)"', login_html)
        if csrf_match:
            print(f"CSRF token found: {csrf_match.group(1)[:50]}")
        else:
            print("No CSRF token found")
        
        # Check for any auth-related cookies
        for cookie in cj:
            print(f"Cookie: {cookie.name}={cookie.value[:50]}")
except Exception as e:
    print(f"Error: {e}")

# Try to login
print("\n=== Trying login ===")
data = urllib.parse.urlencode({
    'login': 'admin',
    'password': 'admin',
}).encode()

try:
    req = urllib.request.Request(BASE + "/login", data=data, headers={
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
    })
    with opener.open(req, timeout=15) as resp:
        print(f"Login response: {resp.status}")
        for cookie in cj:
            print(f"Cookie: {cookie.name}={cookie.value[:100]}")
        
        # Now try to access issues API with the cookie
        req2 = urllib.request.Request(BASE + "/api/issues/search?componentKeys=SurtiTelas-Frontend&ps=5", headers={'User-Agent': 'Mozilla/5.0'})
        with opener.open(req2, timeout=15) as resp2:
            data = json.loads(resp2.read().decode())
            total = data.get('paging', {}).get('total', 0)
            print(f"Issues API: total={total}")
            for issue in data.get('issues', [])[:5]:
                rule = issue.get('rule', '?')
                sev = issue.get('severity', '?')
                comp = issue.get('component', '?')[:60]
                line = issue.get('line', '?')
                msg = issue.get('message', '?')[:80]
                print(f"  {rule} | {sev} | {comp}:{line} | {msg}")
except urllib.error.HTTPError as e:
    print(f"Login failed: {e.code}")
    body = e.read().decode()[:500]
    print(f"  Body: {body}")
except Exception as e:
    print(f"Error: {e}")
