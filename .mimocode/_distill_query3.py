import sqlite3
import json
from datetime import datetime

DB_PATH = r"C:\Users\HP\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Get user messages from parts table
print("=== USER MESSAGES (from parts table) ===")
c.execute("""
    SELECT m.session_id, p.data
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'user'
    ORDER BY m.time_created DESC
    LIMIT 20
""")
for row in c.fetchall():
    data = json.loads(row[1])
    ptype = data.get('type', '')
    if ptype == 'text':
        text = data.get('text', '')[:300]
        print(f"  [{row[0]}] {text}")
        print()
    elif ptype == 'tool':
        # Skip tool results from user
        pass

# Get assistant text responses
print("\n=== ASSISTANT TEXT RESPONSES (recent) ===")
c.execute("""
    SELECT m.session_id, p.data
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'text'
    ORDER BY m.time_created DESC
    LIMIT 15
""")
for row in c.fetchall():
    data = json.loads(row[1])
    text = data.get('text', '')[:400]
    print(f"  [{row[0]}] {text[:300]}...")
    print()

# Check repeated file access patterns
print("\n=== REPEATED FILE ACCESS ===")
c.execute("""
    SELECT json_extract(p.data, '$.tool') as tool,
           json_extract(p.data, '$.state.input') as input_data,
           count(*) as n
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'tool'
      AND json_extract(p.data, '$.tool') = 'read'
    GROUP BY tool, input_data
    HAVING count(*) > 1
    ORDER BY n DESC
""")
for row in c.fetchall():
    data = json.loads(row[1])
    filepath = data.get('file_path', 'N/A')
    print(f"  [{row[2]}x] {filepath}")

# Check repeated bash commands
print("\n=== REPEATED BASH COMMANDS ===")
c.execute("""
    SELECT json_extract(p.data, '$.state.input') as input_data,
           count(*) as n
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'tool'
      AND json_extract(p.data, '$.tool') = 'bash'
    GROUP BY input_data
    HAVING count(*) > 1
    ORDER BY n DESC
""")
for row in c.fetchall():
    data = json.loads(row[1])
    cmd = data.get('command', 'N/A')[:200]
    print(f"  [{row[1]}x] {cmd}")

# Check the full content of older sessions
print("\n=== OLDER SESSION DETAILS (ses_06578ae3effeFUWC0QlqzsVLhB) ===")
c.execute("""
    SELECT m.role, p.data
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_06578ae3effeFUWC0QlqzsVLhB'
    ORDER BY m.time_created
""")
for row in c.fetchall():
    data = json.loads(row[1])
    ptype = data.get('type', '')
    if ptype == 'text':
        text = data.get('text', '')[:500]
        print(f"  [{row[0]}] {text}")
        print()

# Check meta hackathon sessions
print("\n=== META HACKATHON SESSIONS ===")
c.execute("""
    SELECT m.role, p.data
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id IN ('ses_06578ae23ffexHfvSTSlH7kZyL', 'ses_06578ae2cffejt9ExHOGemUpJ3')
    ORDER BY m.session_id, m.time_created
""")
for row in c.fetchall():
    data = json.loads(row[1])
    ptype = data.get('type', '')
    if ptype == 'text':
        text = data.get('text', '')[:500]
        print(f"  [{row[0]}] {text}")
        print()

conn.close()
