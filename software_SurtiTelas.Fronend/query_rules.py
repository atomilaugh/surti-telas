import sqlite3
conn = sqlite3.connect('sonar_db.mv.db')
cursor = conn.cursor()
cursor.execute("SELECT DISTINCT rule FROM issues WHERE rule LIKE 'typescript:S%' OR rule LIKE 'css:S%' LIMIT 30")
for row in cursor.fetchall():
    print(row[0])
