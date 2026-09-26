#!/usr/bin/env python3
import subprocess
import json

# Write SQL script inside container and run via H2 Shell
# H2 provides org.h2.tools.Shell

# Create a simple script file inside container
sql_commands = "SELECT name FROM INFORMATION_SCHEMA.TABLES ORDER BY name;\n"

# Write to container
escaped = sql_commands.replace('"', '\\"')
cmd_write = f'echo "{escaped}" > /tmp/queries.sql'
subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", cmd_write], capture_output=True, text=True, timeout=10)

# Now run it through a simple Java program that reads the SQL and executes it
# Actually, let me use a different approach - write the query inside a Java program
java_src = '''
import java.sql.*;
public class H2Query2 {
    public static void main(String[] args) throws Exception {
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection("jdbc:h2:/opt/sonarqube/data/sonar", "sa", "");
        Statement stmt = conn.createStatement();
        // Get all tables
        ResultSet rs = stmt.executeQuery("SELECT name FROM INFORMATION_SCHEMA.TABLES ORDER BY name");
        System.out.println("=== TABLES ===");
        while (rs.next()) {
            System.out.println(rs.getString(1));
        }
        rs.close();

        // Get all rules
        System.out.println("=== RULES (first 20) ===");
        rs = stmt.executeQuery("SELECT RULE_ID, RULE_KEY, NAME, SEVERITY FROM RULES ORDER BY RULE_ID LIMIT 20");
        while (rs.next()) {
            System.out.println(rs.getString(1) + " | " + rs.getString(2) + " | " + rs.getString(3) + " | " + rs.getString(4));
        }
        rs.close();

        // Get issues for our project
        System.out.println("=== PROJECT ===");
        rs = stmt.executeQuery("SELECT UUID, NAME FROM PROJECTS WHERE NAME LIKE '%SurtiTelas%'");
        while (rs.next()) {
            System.out.println(rs.getString(1) + " | " + rs.getString(2));
        }
        rs.close();

        stmt.close();
        conn.close();
    }
}
'''

escaped = java_src.replace('"', '\\"').replace('\n', '\\n')
cmd_write2 = f'echo -e "{escaped}" > /tmp/H2Query2.java'
subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", cmd_write2], capture_output=True, text=True, timeout=10)
subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", "cd /tmp && javac H2Query2.java"], capture_output=True, text=True, timeout=30)
result = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", "cd /tmp && java -cp '/opt/sonarqube/lib/jdbc/h2/h2-2.3.232.jar:.' H2Query2"], capture_output=True, text=True, timeout=30)
print(result.stdout[:10000])
if result.stderr:
    print(f"Stderr: {result.stderr[:1000]}")
