import subprocess
import json
import os

# Try to use H2 jar to query the SonarQube database
# First copy the database out
print("=== Copying H2 database ===")
result = subprocess.run(
    ["docker", "cp", "sonarqube:/opt/sonarqube/data/sonar.mv.db", "sonar_db.mv.db"],
    capture_output=True, text=True, timeout=30
)
print(f"Copy result: {result.returncode}")
if result.stderr:
    print(f"Stderr: {result.stderr[:200]}")

if os.path.exists("sonar_db.mv.db"):
    size = os.path.getsize("sonar_db.mv.db")
    print(f"Database copied: {size} bytes")

# Try to query with H2 jar
print("\n=== Querying with H2 ===")
# H2 provides a way to run SQL via the jar
h2_jar = "/opt/sonarqube/lib/jdbc/h2/h2-2.3.232.jar"
# Copy the jar out too
result2 = subprocess.run(
    ["docker", "cp", f"sonarqube:{h2_jar}", "h2.jar"],
    capture_output=True, text=True, timeout=30
)
print(f"H2 jar copy: {result2.returncode}")

if os.path.exists("h2.jar"):
    print("H2 jar available")
    # Use H2 to run a shell script
    # Create a SQL script
    sql_script = """SET LISTENER OUTPUT TO STDOUT;
SCRIPT 'SELECT * FROM ALERTS LIMIT 5';
"""
    with open("query.sql", "w") as f:
        f.write(sql_script)
    
    # Run H2 Shell
    result3 = subprocess.run(
        ["java", "-cp", "h2.jar", "org.h2.tools.Shell", "-url", "jdbc:h2:sonar_db", "-user", "sa", "-password", ""],
        input="SELECT name FROM INFORMATION_SCHEMA.TABLES;\n",
        capture_output=True, text=True, timeout=30
    )
    print(f"H2 Shell stdout: {result3.stdout[:2000]}")
    print(f"H2 Shell stderr: {result3.stderr[:500]}")
    
    # Try different approach - use the Script tool
    result4 = subprocess.run(
        ["java", "-cp", "h2.jar", "org.h2.tools.Script", "-url", "jdbc:h2:sonar_db.mv.db", "-user", "sa", "-password", "", "-script", "output.sql", "-compress", "false"],
        capture_output=True, text=True, timeout=30
    )
    print(f"H2 Script result: {result4.returncode}")
    if result4.stderr:
        print(f"H2 Script stderr: {result4.stderr[:500]}")
    if os.path.exists("output.sql"):
        with open("output.sql", "r") as f:
            content = f.read()
            print(f"SQL dump size: {len(content)}")
            print(content[:2000])
