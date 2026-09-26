import subprocess
import json

# Try running java directly in the container with inline code
# Use jshell if available
result = subprocess.run(
    ["docker", "exec", "sonarqube", "bash", "-c", 
     'echo "Class.forName(\"org.h2.Driver\"); java.sql.Connection conn = java.sql.DriverManager.getConnection(\"jdbc:h2:/opt/sonarqube/data/sonar\", \"sa\", \"\"); java.sql.Statement stmt = conn.createStatement(); java.sql.ResultSet rs = stmt.executeQuery(\"SELECT name FROM INFORMATION_SCHEMA.TABLES ORDER BY name\"); while (rs.next()) System.out.println(rs.getString(1)); rs.close(); stmt.close(); conn.close();" | jshell -'],
    capture_output=True, text=True, timeout=30
)
print("jshell approach:")
print(result.stdout[:2000])
print(result.stderr[:500])

# Alternative: use groovy if available
result2 = subprocess.run(
    ["docker", "exec", "sonarqube", "bash", "-c", "which groovy 2>&1; which jsse 2>&1; which jrunscript 2>&1; which jjs 2>&1"],
    capture_output=True, text=True, timeout=15
)
print("\nAvailable scripting:")
print(result2.stdout[:500])
