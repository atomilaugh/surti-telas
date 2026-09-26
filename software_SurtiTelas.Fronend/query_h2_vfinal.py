#!/usr/bin/env python3
"""
Query SonarQube H2 database via TCP server.
"""
import subprocess
import time

# Check if H2 TCP server is running
result = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", "ps aux | grep h2"], capture_output=True, text=True, timeout=10)
print(f"H2 processes: {result.stdout[:500]}")

# Check if port 9093 is open
result2 = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", "netstat -tlnp | grep 9093"], capture_output=True, text=True, timeout=10)
print(f"Port 9093: {result2.stdout[:200]}")

# Write a proper Java query file directly
java_code = r'''
import java.sql.*;
public class SQQuery {
    public static void main(String[] args) throws Exception {
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection("jdbc:h2:tcp://localhost:9093/sonar", "sa", "");
        Statement stmt = conn.createStatement();
        
        System.out.println("=== TABLES ===");
        ResultSet rs = stmt.executeQuery("SELECT name FROM INFORMATION_SCHEMA.TABLES ORDER BY name");
        while (rs.next()) System.out.println(rs.getString(1));
        rs.close();
        
        System.out.println("=== RULES (first 50) ===");
        rs = stmt.executeQuery("SELECT RULE_ID, RULE_KEY, SEVERITY FROM RULES ORDER BY RULE_ID LIMIT 50");
        while (rs.next()) System.out.println(rs.getString(1) + "|" + rs.getString(2) + "|" + rs.getString(3));
        rs.close();
        
        System.out.println("=== PROJECTS ===");
        rs = stmt.executeQuery("SELECT UUID, NAME FROM PROJECTS");
        while (rs.next()) System.out.println(rs.getString(1) + "|" + rs.getString(2));
        rs.close();
        
        System.out.println("=== ISSUES (first 50) ===");
        rs = stmt.executeQuery("SELECT I.RULE_ID, R.RULE_KEY, I.SEVERITY, I.STATUS, I.MESSAGE, C.NAME, I.LINE FROM ISSUES I JOIN RULES R ON I.RULE_ID=R.RULE_ID JOIN COMPONENTS C ON I.COMPONENT_ID=C.ID WHERE C.NAME LIKE '%SurtiTelas%' AND I.RESOLUTION IS NULL ORDER BY I.SEVERITY DESC, R.RULE_KEY LIMIT 50");
        while (rs.next()) {
            String msg = rs.getString(5);
            if (msg.length() > 80) msg = msg.substring(0, 80);
            System.out.println(rs.getString(1) + "|" + rs.getString(2) + "|sev=" + rs.getString(3) + "|" + rs.getString(4) + "|" + msg + "|" + rs.getString(6) + ":" + rs.getString(7));
        }
        rs.close();
        
        stmt.close();
        conn.close();
    }
}
'''

# Write Java file using a heredoc approach
write_cmd = 'cat > /tmp/SQQuery.java << \'JAVAEOF\'\n' + java_code + '\nJAVAEOF'
result3 = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", write_cmd], capture_output=True, text=True, timeout=10)
print(f"Write Java: {result3.returncode}")

result4 = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", "cd /tmp && javac SQQuery.java"], capture_output=True, text=True, timeout=30)
print(f"Compile: {result4.returncode}")
if result4.stderr:
    print(f"  stderr: {result4.stderr[:500]}")

result5 = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", "cd /tmp && java -cp '/opt/sonarqube/lib/jdbc/h2/h2-2.3.232.jar:.' SQQuery"], capture_output=True, text=True, timeout=30)
print(f"Query: {result5.returncode}")
print(result5.stdout[:15000])
if result5.stderr:
    print(f"Stderr: {result5.stderr[:2000]}")
