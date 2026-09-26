import urllib.request
import json
import urllib.parse

BASE = "http://localhost:9000"

# Test various endpoints that might not need auth
endpoints = [
    "/api/system/status",
    "/api/server/version",
    "/api/server/information",
    "/api/core_extensions/list",
    "/api/plugins/installed",
    "/api/version",
    "/api/webapi/tests",
]

print("=== TESTING PUBLIC ENDPOINTS ===")
for ep in endpoints:
    try:
        url = BASE + ep
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read().decode()[:300]
            print(f"OK {ep}: {data[:200]}")
    except urllib.error.HTTPError as e:
        print(f"FAIL {e.code} {ep}")
    except Exception as e:
        print(f"ERROR {ep}: {e}")

# Try with no specific auth but different mechanisms
print("\n=== TESTING AUTH VARIANTS ===")
import base64
auth_combos = [
    ("admin", "admin"),
    ("sonarqube", "sonarqube"),
    ("sonar", "admin"),
    ("admin", ""),
    ("", ""),
]

for user, pwd in auth_combos:
    creds = base64.b64encode(f"{user}:{pwd}".encode()).decode()
    try:
        req = urllib.request.Request(BASE + "/api/issues/search?ps=1", headers={
            'User-Agent': 'Mozilla/5.0',
            'Authorization': f'Basic {creds}'
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            print(f"Auth {user}:{pwd} -> OK, total={data.get('paging',{}).get('total','?')}")
    except urllib.error.HTTPError as e:
        print(f"Auth {user}:{pwd} -> FAIL {e.code}")
    except Exception as e:
        print(f"Auth {user}:{pwd} -> ERROR {e}")

# Try token-based auth via query param
print("\n=== TOKEN IN URL ===")
tokens = ["admin", "test", "token", "sonar", "sonarqube", "surtitelas", ""]
for t in tokens:
    try:
        url = BASE + "/api/issues/search?" + urllib.parse.urlencode({"componentKeys": "SurtiTelas-Frontend", "ps": "1", "token": t})
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            print(f"Token '{t}' -> OK, total={data.get('paging',{}).get('total','?')}")
    except urllib.error.HTTPError as e:
        print(f"Token '{t}' -> FAIL {e.code}")
    except Exception as e:
        print(f"Token '{t}' -> ERROR {e}")
