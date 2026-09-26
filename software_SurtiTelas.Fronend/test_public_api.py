#!/usr/bin/env python3
"""
Try all possible SonarQube API endpoints that might not require auth.
"""
import urllib.request
import json

BASE = "http://localhost:9000"

# Try endpoints that might be public in Community Edition
endpoints = [
    # These might work without auth in some configurations
    "/api/settings/values",
    "/api/server/version",
    "/api/system/status",
    "/api/core_extensions/list",
    "/api/webapi/tests",
    "/api/webapi/contexts",
    "/api/languages/list",
    "/api/qualityprofiles/search?language=ts",
    "/api/qualityprofiles/projects?language=ts",
    "/api/issues/search?ps=1",
    "/api/issues/search?componentKeys=SurtiTelas-Frontend&ps=1",
    "/api/measures/component?component=SurtiTelas-Frontend",
    "/api/measures/component?component=SurtiTelas-Frontend&metricKeys=reliability_rating",
    "/api/components/show?key=SurtiTelas-Frontend",
    "/api/resources?key=SurtiTelas-Frontend",
    "/api/issues/types",
    "/api/issues/transition",
    "/api/issues/do_transition",
    "/api/issues/bulk_change",
    "/api/issues/search?resolved=false&ps=1",
    "/api/issues/search?statuses=OPEN&ps=1",
    "/api/issues/search?statuses=CONFIRMED&ps=1",
    "/api/issues/search?statuses=REOPENED&ps=1",
    "/api/issues/search?statuses=OPEN&componentKeys=SurtiTelas-Frontend&ps=1",
    "/api/issues/search?resolved=false&componentKeys=SurtiTelas-Frontend&ps=1",
    "/api/projects/search",
    "/api/projects/show?key=SurtiTelas-Frontend",
    "/api/projects/annotations?project=SurtiTelas-Frontend",
    "/api/ce/activity?componentKeys=SurtiTelas-Frontend&ps=1",
    "/api/ce/task?id=test",
    "/api/user",
    "/api/users/identities",
    "/api/authentication/validate",
    "/api/configuration/indices",
    "/api/configuration/server",
    "/api/health",
    "/api/system/version",
    "/api/system/info",
    "/api/system/updatecenter",
    "/api/new_code_period",
    "/api/dashboards",
    "/api/dashboards/show",
]

public_endpoints = []
for ep in endpoints:
    try:
        req = urllib.request.Request(BASE + ep, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = resp.read().decode()[:200]
            public_endpoints.append(ep)
            print(f"PUBLIC: {ep}")
    except urllib.error.HTTPError as e:
        if e.code != 401:
            print(f"{e.code} {ep}")
    except Exception as e:
        pass

print(f"\nTotal public endpoints: {len(public_endpoints)}")
