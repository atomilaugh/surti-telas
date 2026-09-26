#!/usr/bin/env python3
import subprocess
import json
import re

# Query tables list from inside the container
script = """
import java.sql.*;
Class.forName("org.h2.Driver");
Connection conn = DriverManager.getConnection("jdbc:h2:/opt/sonarqube/data/sonar", "sa", "");
DatabaseMetaData meta = conn.getMetaData();
ResultSet tables = meta.getTables(null, null, "%", null);
while (tables.next()) {
    System.out.println(tables.getString("TABLE_NAME"));
}
conn.close();
"""

# Write to a temp file and run with jshell or groovy
# Actually, let me just use a simpler approach - run java directly

print("=== Getting table list ===")
# Use the H2 jar with a simple Java program
java_code = """
import java.sql.*;
public class SQQuery {
    public static void main(String[] args) throws Exception {
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection("jdbc:h2:/opt/sonarqube/data/sonar", "sa", "");
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery("SELECT name FROM INFORMATION_SCHEMA.TABLES ORDER BY name");
        while (rs.next()) {
            System.out.println(rs.getString(1));
        }
        rs.close();
        stmt.close();
        conn.close();
    }
}
"""

with open("/tmp/SQQuery.java", "w") as f:
    f.write(java_code)

result = subprocess.run(
    ["docker", "exec", "sonarqube", "bash", "-c", 
     "cd /tmp && javac SQQuery.java && java SQQuery"],
    capture_output=True, text=True, timeout=60
)
print(f"Tables: {result.stdout[:3000]}")
if result.stderr:
    print(f"Stderr: {result.stderr[:500]}")
