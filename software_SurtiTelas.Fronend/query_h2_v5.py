#!/usr/bin/env python3
import subprocess
import json

# Use jrunscript (Nashorn) inside the container
jrunscript_code = '''
var Class = Java.type('java.lang.Class');
var DriverManager = Java.type('java.sql.DriverManager');
var SQLException = Java.type('java.sql.SQLException');

var driverClass = Class.forName('org.h2.Driver');
var conn = DriverManager.getConnection('jdbc:h2:/opt/sonarqube/data/sonar', 'sa', '');
var stmt = conn.createStatement();
var rs = stmt.executeQuery('SELECT name FROM INFORMATION_SCHEMA.TABLES ORDER BY name');
while (rs.next()) {
    print(rs.getString(1));
}
rs.close();
stmt.close();
conn.close();
'''

escaped = jrunscript_code.replace('"', '\\"').replace('\n', '\\n')
cmd = f'echo -e "{escaped}" | /opt/java/openjdk/bin/jrunscript -'
result = subprocess.run(["docker", "exec", "sonarqube", "bash", "-c", cmd], capture_output=True, text=True, timeout=30)
print("jrunscript result:")
print(result.stdout[:5000])
if result.stderr:
    print(f"Stderr: {result.stderr[:1000]}")
