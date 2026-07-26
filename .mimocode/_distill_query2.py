import sqlite3
import json
from datetime import datetime

DB_PATH = r"C:\Users\HP\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Check message data structure
print("=== MESSAGE SAMPLE (first 3 messages) ===")
c.execute("SELECT id, session_id, data FROM message LIMIT 3")
for row in c.fetchall():
    data = json.loads(row[2])
    print(f"ID: {row[0]}, Session: {row[1]}")
    print(f"  Role: {data.get('role')}")
    print(f"  Keys: {list(data.keys())}")
    # Print first 200 chars of content if it exists
    content = data.get('content', '')
    if isinstance(content, str):
        print(f"  Content: {content[:200]}")
    elif isinstance(content, list):
        print(f"  Content (list): {json.dumps(content[:2], indent=2)[:300]}")
    print()

# Get user messages with proper field extraction
print("\n=== USER MESSAGES (recent, all sessions) ===")
c.execute("""
    SELECT m.id, m.session_id, m.data
    FROM message m
    WHERE json_extract(m.data, '$.role') = 'user'
    ORDER BY m.time_created DESC
    LIMIT 15
""")
for row in c.fetchall():
    data = json.loads(row[2])
    content = data.get('content', '')
    if isinstance(content, str):
        text = content[:300]
    elif isinstance(content, list):
        # Extract text parts
        texts = []
        for part in content:
            if isinstance(part, dict) and part.get('type') == 'text':
                texts.append(part.get('text', '')[:200])
        text = ' '.join(texts)[:300]
    else:
        text = str(content)[:300]
    print(f"  [{row[1]}] {text}")
    print()

# Check older sessions (March-April 2026)
print("\n=== OLDER SESSIONS (March-April 2026) ===")
c.execute("""
    SELECT m.session_id, substr(json_extract(m.data, '$.role'), 1, 10) as role, 
           substr(json_extract(m.data, '$.content'), 1, 200) as content
    FROM message m
    WHERE m.session_id IN ('ses_06578ae3effeFUWC0QlqzsVLhB', 'ses_06578ae23ffexHfvSTSlH7kZyL', 'ses_06578ae2cffejt9ExHOGemUpJ3')
    ORDER BY m.time_created
""")
for row in c.fetchall():
    print(f"  [{row[0]}] {row[1]}: {(row[2][:200] if row[2] else 'N/A')}")

# Check if there are tasks
print("\n=== TASKS ===")
c.execute("SELECT * FROM task LIMIT 10")
tasks = c.fetchall()
if tasks:
    for t in tasks:
        print(t)
else:
    print("No tasks found")

# Check workflow_runs
print("\n=== WORKFLOW RUNS ===")
c.execute("SELECT * FROM workflow_run LIMIT 5")
runs = c.fetchall()
if runs:
    for r in runs:
        print(r)
else:
    print("No workflow runs found")

# Check actor_registry
print("\n=== ACTOR REGISTRY ===")
c.execute("SELECT * FROM actor_registry LIMIT 10")
actors = c.fetchall()
if actors:
    for a in actors:
        print(a)
else:
    print("No actors found")

conn.close()
