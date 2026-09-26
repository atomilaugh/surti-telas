#!/usr/bin/env python3
"""
Write a Java source file inside the container, compile and run it.
"""
import subprocess
import json

# Step 1: Write Java file inside container
java_src = '''
import java.sql.*;
public class H2Query {
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
'''

# Write to container using docker exec with echo
escaped = java_src.replace('"', '\\"').replace('\n', '\\n')
cmd = f'echo -e "{escaped}" > /tmp/H2Query.java'
result = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", cmd], capture_output=True, text=True, timeout=15)
print(f"Write result: {result.returncode}")

# Step 2: Compile inside container
result2 = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", "cd /tmp && javac H2Query.java"], capture_output=True, text=True, timeout=30)
print(f"Compile result: {result2.returncode}")
if result2.stdout:
    print(f"Compile stdout: {result2.stdout[:500]}")
if result2.stderr:
    print(f"Compile stderr: {result2.stderr[:500]}")

# Step 3: Run
result3 = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", "cd /tmp && java H2Query"], capture_output=True, text=True, timeout=30)
print(f"Run result: {result3.returncode}")
print(f"Tables:\n{result3.stdout[:5000]}")
if result3.stderr:
    print(f"Stderr: {result3.stderr[:500]}")
