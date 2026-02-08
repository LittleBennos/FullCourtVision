import sqlite3, json

conn = sqlite3.connect(r'C:\Projects\FullCourtVision\data\playhq.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Get tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print("Tables:", tables)

# Schema for each
for t in tables:
    c.execute(f"PRAGMA table_info({t})")
    cols = [(r[1], r[2]) for r in c.fetchall()]
    c.execute(f"SELECT COUNT(*) FROM {t}")
    count = c.fetchone()[0]
    print(f"\n{t} ({count} rows): {cols}")

# Sample featured player
c.execute("SELECT * FROM players WHERE id='f1fa18fc-a93f-45b9-ac91-f70652744dd7' OR player_id='f1fa18fc-a93f-45b9-ac91-f70652744dd7' LIMIT 1")
row = c.fetchone()
if row:
    print(f"\nFeatured player: {dict(row)}")
