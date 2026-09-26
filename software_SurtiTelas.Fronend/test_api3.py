import urllib.request
import urllib.parse
import json

BASE = "http://localhost:9000"

# Check if anonymous access works for different endpoints
# SonarQube Community Edition allows anonymous reading for some endpoints
endpoints = [
    "/api/settings/values",
    "/api/settings",
    "/api/qualityprofiles/search",
    "/api/qualityprofiles/projects",
    "/api/measures/component_tree?component=SurtiTelas-Frontend&metricKeys=reliability_rating",
    "/api/measures/component?component=SurtiTelas-Frontend&metricKeys=reliability_rating",
    "/api/measures/component?component=SurtiTelas-Frontend",
    "/api/components/tree?key=SurtiTelas-Frontend",
    "/api/resources?key=SurtiTelas-Frontend",
    "/api/issues/search?componentKeys=SurtiTelas-Frontend&ps=500",
    "/api/issues/search?projectKeys=SurtiTelas-Frontend&ps=500",
]

print("=== TESTING ALL ENDPOINTS ===")
for ep in endpoints:
    try:
        url = BASE + ep
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read().decode()[:500]
            try:
                j = json.loads(data)
                if 'issues' in j:
                    total = j.get('paging', {}).get('total', '?')
                    print(f"OK {ep} -> total_issues={total}")
                    for issue in j.get('issues', [])[:3]:
                        print(f"  {issue.get('rule','?')} sev={issue.get('severity','?')} {issue.get('component','?')[:60]}:{issue.get('line','?')} msg={issue.get('message','?')[:60]}")
                else:
                    print(f"OK {ep} -> {data[:200]}")
            except:
                print(f"OK {ep} -> {data[:200]}")
    except urllib.error.HTTPError as e:
        print(f"FAIL {e.code} {ep}")
    except Exception as e:
        print(f"ERROR {ep}: {str(e)[:100]}")
