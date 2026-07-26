import sqlite3
import json
from datetime import datetime, timedelta

DB_PATH = r"C:\Users\HP\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# 1. List tables
print("=== TABLES ===")
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
for row in c.fetchall():
    print(row[0])

# 2. List all sessions
print("\n=== ALL SESSIONS ===")
c.execute("SELECT id, title, time_created FROM session ORDER BY time_created DESC")
sessions = c.fetchall()
for s in sessions:
    dt = datetime.fromtimestamp(s[2]/1000)
    print(f"{s[0]} | {dt} | {s[1][:80] if s[1] else 'N/A'}")

# 3. Count messages per session
print("\n=== MESSAGES PER SESSION ===")
c.execute("SELECT session_id, count(*) FROM message GROUP BY session_id ORDER BY count(*) DESC")
for row in c.fetchall():
    print(f"  {row[0]}: {row[1]} messages")

# 4. Tool usage across all sessions
print("\n=== TOOL USAGE (all sessions) ===")
c.execute("""
    SELECT json_extract(p.data, '$.tool') as tool,
           substr(json_extract(p.data, '$.state.input'), 1, 200) as input_preview,
           count(*) as n
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'tool'
    GROUP BY tool, input_preview
    ORDER BY n DESC
    LIMIT 50
""")
for row in c.fetchall():
    print(f"  [{row[2]}x] {row[0]}: {row[1][:120] if row[1] else 'N/A'}")

# 5. User message patterns
print("\n=== USER MESSAGES (all sessions) ===")
c.execute("""
    SELECT m.session_id, substr(json_extract(m.data, '$.content'), 1, 300) as content
    FROM message m
    WHERE json_extract(m.data, '$.role') = 'user'
    ORDER BY m.time_created DESC
    LIMIT 30
""")
for row in c.fetchall():
    print(f"  [{row[0]}] {(row[1][:200] if row[1] else 'N/A')}")

# 6. Check for repeated keywords in user messages
print("\n=== REPEATED KEYWORDS IN USER MESSAGES ===")
c.execute("""
    SELECT json_extract(m.data, '$.content') as content
    FROM message m
    WHERE json_extract(m.data, '$.role') = 'user'
""")
keywords = {}
for row in c.fetchall():
    if row[0]:
        content = row[0].lower()
        for kw in ["again", "every time", "like last time", "the usual", "repeat", "same as before", "do what you did", "just like", "workflow", "pattern"]:
            if kw in content:
                keywords[kw] = keywords.get(kw, 0) + 1
for kw, count in sorted(keywords.items(), key=lambda x: -x[1]):
    print(f"  '{kw}': {count} occurrences")

# 7. Check part types breakdown
print("\n=== PART TYPES BREAKDOWN ===")
c.execute("""
    SELECT json_extract(p.data, '$.type') as ptype, count(*) as n
    FROM part p
    GROUP BY ptype
    ORDER BY n DESC
""")
for row in c.fetchall():
    print(f"  {row[0]}: {row[1]}")

# 8. Most common tools (just tool names)
print("\n=== MOST COMMON TOOLS ===")
c.execute("""
    SELECT json_extract(p.data, '$.tool') as tool, count(*) as n
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'tool'
    GROUP BY tool
    ORDER BY n DESC
""")
for row in c.fetchall():
    print(f"  {row[0]}: {row[1]} calls")

conn.close()
