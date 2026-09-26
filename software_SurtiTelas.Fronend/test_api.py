import urllib.request
import urllib.parse
import json
import base64

BASE = "http://localhost:9000"

# Try accessing issues through different mechanisms
endpoints = [
    "/api/issues/search?componentKeys=SurtiTelas-Frontend&ps=500",
    "/api/issues/search?projectKeys=SurtiTelas-Frontend&ps=500",
    "/api/issues/search?projects=SurtiTelas-Frontend&ps=500",
    "/api/issues/search?resolved=false&ps=500",
    "/api/issues/search?ps=500",
]

for ep in endpoints:
    url = BASE + ep
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            total = data.get('paging', {}).get('total', 0)
            print(f"SUCCESS: {ep}")
            print(f"  Total: {total}")
            issues = data.get('issues', [])
            if issues:
                for issue in issues[:5]:
                    print(f"  Rule: {issue.get('rule', '?')}", end="")
                    print(f"  Severity: {issue.get('severity', '?')}", end="")
                    print(f"  Component: {issue.get('component', '?')[:80]}")
                    print(f"  Line: {issue.get('line', '?')}")
                    print(f"  Status: {issue.get('status', '?')}")
                    print(f"  Message: {issue.get('message', '?')[:100]}")
                    print()
            break
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f"FAIL {e.code}: {ep} -> {body}")
    except Exception as e:
        print(f"ERROR: {ep} -> {e}")

# Also try with basic auth
print("\n=== WITH BASIC AUTH ===")
for ep in endpoints[:2]:
    url = BASE + ep
    try:
        creds = base64.b64encode(b"admin:admin").decode()
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0',
            'Authorization': f'Basic {creds}'
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            total = data.get('paging', {}).get('total', 0)
            print(f"SUCCESS with auth: {ep}")
            print(f"  Total: {total}")
            issues = data.get('issues', [])
            for issue in issues[:10]:
                print(f"  Rule: {issue.get('rule', '?')} | Severity: {issue.get('severity', '?')} | {issue.get('component', '?')[:60]}:{issue.get('line', '?')} | {issue.get('message', '?')[:80]}")
            break
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f"FAIL {e.code} with auth: {ep} -> {body}")
    except Exception as e:
        print(f"ERROR with auth: {ep} -> {e}")

# Try issue types
print("\n=== TRYING API / ISSUES / TYPES ===")
try:
    req = urllib.request.Request(BASE + "/api/issues/types", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(resp.read().decode()[:500])
except Exception as e:
    print(f"FAIL: {e}")

# Try project badges
print("\n=== TRYING API / PROJECTS / SHOW ===")
try:
    req = urllib.request.Request(BASE + "/api/projects/show?key=SurtiTelas-Frontend", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(resp.read().decode()[:500])
except Exception as e:
    print(f"FAIL: {e}")
