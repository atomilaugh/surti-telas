#!/usr/bin/env python3
import subprocess
import json

# Run H2Query with the H2 jar in classpath
cmd = 'cd /tmp && java -cp "/opt/sonarqube/lib/jdbc/h2/h2-2.3.232.jar:." H2Query'
result = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", cmd], capture_output=True, text=True, timeout=30)
print("H2Query with jar:")
print(result.stdout[:5000])
if result.stderr:
    print(f"Stderr: {result.stderr[:1000]}")
