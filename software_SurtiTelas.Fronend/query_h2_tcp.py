#!/usr/bin/env python3
"""
Try to start an H2 TCP server inside the SonarQube container 
and query the database from outside.
"""
import subprocess
import json

# Start H2 TCP server in the SonarQube container on a different port
# SonarQube uses port 9092 for embedded H2, let's try to start TCP on 9093
result = subprocess.run(
    ["docker", "exec", "-d", "sonarqube", 
     "java", "-cp", "/opt/sonarqube/lib/jdbc/h2/h2-2.3.232.jar",
     "org.h2.tools.Server", "-tcp", "-tcpPort", "9093", "-tcpAllowOthers", "-baseDir", "/opt/sonarqube/data"],
    capture_output=True, text=True, timeout=15
)
print(f"Start H2 TCP: {result.returncode}")
if result.stdout:
    print(f"  stdout: {result.stdout[:200]}")
if result.stderr:
    print(f"  stderr: {result.stderr[:200]}")

# Wait a moment for server to start
import time
time.sleep(3)

# Try to connect from outside using Python and jaydebeapi or just check if port is open
result2 = subprocess.run(
    ["docker", "exec", "sonarqube", "curl", "-s", "http://localhost:9093/"],
    capture_output=True, text=True, timeout=10
)
print(f"H2 TCP check: {result2.stdout[:200]} {result2.stderr[:200]}")

# Alternative: write a Java program that queries via TCP
java_code = '''
import java.sql.*;
public class H2TCPQuery {
    public static void main(String[] args) throws Exception {
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection("jdbc:h2:tcp://localhost:9093/sonar", "sa", "");
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

# Write and compile inside container
escaped = java_code.replace('"', '\\"').replace('\n', '\\n')
cmd = f'echo -e "{escaped}" > /tmp/H2TCPQuery.java && cd /tmp && javac H2TCPQuery.java'
result3 = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", cmd], capture_output=True, text=True, timeout=30)
print(f"Compile: {result3.returncode}")

# Run via TCP from inside container (but pointing to localhost since server is in same container)
java_code2 = '''
import java.sql.*;
public class H2TCPQuery2 {
    public static void main(String[] args) throws Exception {
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection("jdbc:h2:tcp://localhost:9093/sonar", "sa", "");
        Statement stmt = conn.createStatement();
        
        // Get all tables
        System.out.println("=== TABLES ===");
        ResultSet rs = stmt.executeQuery("SELECT name FROM INFORMATION_SCHEMA.TABLES ORDER BY name");
        while (rs.next()) {
            System.out.println(rs.getString(1));
        }
        rs.close();
        
        // Get rules
        System.out.println("=== RULES (first 30) ===");
        rs = stmt.executeQuery("SELECT RULE_ID, RULE_KEY, NAME, SEVERITY FROM RULES ORDER BY RULE_ID LIMIT 30");
        while (rs.next()) {
            System.out.println(rs.getString(1) + " | " + rs.getString(2) + " | " + rs.getString(3) + " | " + rs.getString(4));
        }
        rs.close();
        
        // Get projects
        System.out.println("=== PROJECTS ===");
        rs = stmt.executeQuery("SELECT UUID, NAME FROM PROJECTS WHERE NAME LIKE '%SurtiTelas%'");
        while (rs.next()) {
            System.out.println(rs.getString(1) + " | " + rs.getString(2));
        }
        rs.close();
        
        // Get issues for our project
        System.out.println("=== ISSUES (first 20) ===");
        rs = stmt.executeQuery("SELECT I.RULE_ID, R.RULE_KEY, I.SEVERITY, I.STATUS, I.MESSAGE, C.NAME AS COMPONENT_NAME, I.LINE FROM ISSUES I JOIN RULES R ON I.RULE_ID = R.RULE_ID JOIN COMPONENTS C ON I.PROJECT_ID = C.ID AND I.COMPONENT_ID = C.ID WHERE C.NAME LIKE '%SurtiTelas%' AND I.RESOLUTION IS NULL ORDER BY I.SEVERITY DESC, R.RULE_KEY LIMIT 20");
        while (rs.next()) {
            System.out.println(rs.getString(1) + " | " + rs.getString(2) + " | sev=" + rs.getString(3) + " | " + rs.getString(4) + " | " + rs.getString(5)[:80] + " | " + rs.getString(6) + ":" + rs.getString(7));
        }
        rs.close();
        
        stmt.close();
        conn.close();
    }
}
'''
escaped2 = java_code2.replace('"', '\\"').replace('\n', '\\n')
cmd2 = f'echo -e "{escaped2}" > /tmp/H2TCPQuery2.java && cd /tmp && javac H2TCPQuery2.java && java -cp "/opt/sonarqube/lib/jdbc/h2/h2-2.3.232.jar:." H2TCPQuery2'
result4 = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", cmd2], capture_output=True, text=True, timeout=30)
print(f"Query result: {result4.returncode}")
print(result4.stdout[:10000])
if result4.stderr:
    print(f"Stderr: {result4.stderr[:1000]}")
