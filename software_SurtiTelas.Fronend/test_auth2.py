#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json
import base64

BASE = "http://localhost:9000"

def fetch(path, params=None, auth=None):
    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    if auth:
        creds = base64.b64encode(auth.encode()).decode()
        req.add_header('Authorization', f'Basic {creds}')
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "body": e.read().decode()[:200]}
    except Exception as e:
        return {"error": str(e)}

# Try different auth combinations
auths = [
    None, "admin:admin", "sonar:admin", "admin:admin123", "admin:sonar",
    "user:password", "sonarqube:sonarqube", "admin:", ":admin",
]

print("=== TESTING AUTH ===")
for auth in auths:
    r = fetch("/api/system/status", auth=auth)
    if "error" not in r:
        print(f"SUCCESS with auth={auth}: {r}")
    else:
        print(f"FAIL auth={auth}: {r['error']}")

print("\n=== TRYING TOKEN-BASED AUTH ===")
tokens = ["", "admin", "test", "token", "sonar-token", "surtitelas"]
for token in tokens:
    r = fetch("/api/system/status", {"sonar.token": token})
    if "error" not in r:
        print(f"SUCCESS with token={token}")
    else:
        print(f"FAIL token={token}: {r.get('error')}")

print("\n=== TRYING ISSUES SEARCH WITH DIFFERENT AUTH ===")
for auth in ["admin:admin", "sonar:admin", "admin:admin123"]:
    r = fetch("/api/issues/search", {"componentKeys": "SurtiTelas-Frontend", "ps": "1"}, auth)
    if "error" not in r:
        print(f"SUCCESS issues search with {auth}: total={r.get('total', '?')}")
    else:
        print(f"FAIL issues search with {auth}: {r.get('error')}")
