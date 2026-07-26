import sqlite3
import json
from datetime import datetime

DB_PATH = r"C:\Users\HP\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Check older session messages structure
print("=== OLDER SESSION MESSAGES (ses_06578ae3effeFUWC0QlqzsVLhB) ===")
c.execute("""
    SELECT id, data FROM message 
    WHERE session_id = 'ses_06578ae3effeFUWC0QlqzsVLhB'
    ORDER BY time_created
""")
for row in c.fetchall():
    data = json.loads(row[1])
    print(f"  ID: {row[0]}, Keys: {list(data.keys())}")
    print(f"  Data: {json.dumps(data, indent=2)[:300]}")
    print()

# Check parts for older sessions
print("=== OLDER SESSION PARTS (ses_06578ae3effeFUWC0QlqzsVLhB) ===")
c.execute("""
    SELECT p.id, p.data FROM part p
    WHERE p.session_id = 'ses_06578ae3effeFUWC0QlqzsVLhB'
    ORDER BY p.time_created
""")
for row in c.fetchall():
    data = json.loads(row[1])
    ptype = data.get('type', '')
    if ptype == 'text':
        text = data.get('text', '')[:500]
        print(f"  [{ptype}] {text}")
        print()
    elif ptype == 'tool':
        tool = data.get('tool', '')
        state = data.get('state', {})
        inp = state.get('input', {})
        print(f"  [tool: {tool}] input preview: {json.dumps(inp)[:200]}")
        print()

# Check notes files
print("\n=== NOTES FILES ===")
import os
notes_path = r"C:\Users\HP\.local\share\mimocode\memory\sessions\ses_06574901effeFWHG7216fc1Keo\notes.md"
if os.path.exists(notes_path):
    with open(notes_path, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"Notes content ({len(content)} chars):")
    print(content[:2000])
else:
    print("No notes.md found")

# Check if there are other session directories with notes
print("\n=== CHECKING FOR OTHER NOTES ===")
sessions_dir = r"C:\Users\HP\.local\share\mimocode\memory\sessions"
for sess_id in os.listdir(sessions_dir):
    sess_path = os.path.join(sessions_dir, sess_id)
    if os.path.isdir(sess_path):
        for fname in os.listdir(sess_path):
            if fname.endswith('.md'):
                fpath = os.path.join(sess_path, fname)
                size = os.path.getsize(fpath)
                print(f"  {sess_id}/{fname} ({size} bytes)")

# Check meta hackathon session parts in detail
print("\n=== META HACKATHON SESSION PARTS (ses_06578ae23ffexHfvSTSlH7kZyL) ===")
c.execute("""
    SELECT p.id, p.data FROM part p
    WHERE p.session_id = 'ses_06578ae23ffexHfvSTSlH7kZyL'
    ORDER BY p.time_created
""")
for row in c.fetchall():
    data = json.loads(row[1])
    ptype = data.get('type', '')
    if ptype == 'text':
        text = data.get('text', '')[:800]
        print(f"  [{ptype}] {text}")
        print()
    elif ptype == 'tool':
        tool = data.get('tool', '')
        state = data.get('state', {})
        inp = state.get('input', {})
        print(f"  [tool: {tool}] input preview: {json.dumps(inp)[:300]}")
        print()

conn.close()
