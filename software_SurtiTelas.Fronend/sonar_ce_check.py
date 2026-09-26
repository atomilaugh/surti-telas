#!/usr/bin/env python3
"""
Try to get issues from SonarQube CE task status and any available data.
"""
import urllib.request
import json
import time

BASE = "http://localhost:9000"

# Check CE task status (the last scan)
print("=== CE Task Status ===")
try:
    req = urllib.request.Request(BASE + "/api/ce/task?id=8325ac65-d48f-40ff-a79c-22c563229471", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        task = data.get('task', {})
        print(f"Status: {task.get('status')}")
        print(f"Type: {task.get('type')}")
        print(f"Component: {task.get('component')}")
        print(f"Has submitter: {bool(task.get('submitter'))}")
        print(f"Full: {json.dumps(data, indent=2)[:1000]}")
except Exception as e:
    print(f"ERROR: {e}")

# Try to get task details via different endpoint
print("\n=== Try /api/ce/tasks ===")
try:
    req = urllib.request.Request(BASE + "/api/ce/tasks", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        print(json.dumps(data, indent=2)[:1000])
except Exception as e:
    print(f"ERROR: {e}")
