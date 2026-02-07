import sqlite3
c = sqlite3.connect('data/playhq.db')
for t in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
    cnt = c.execute(f"SELECT count(*) FROM [{t[0]}]").fetchone()[0]
    print(f"{t[0]}: {cnt}")
# Check player_stats columns
print("\nplayer_stats columns:")
for col in c.execute("PRAGMA table_info(player_stats)").fetchall():
    print(f"  {col}")
# Check if organisations table has link to teams/players
print("\norganisations columns:")
for col in c.execute("PRAGMA table_info(organisations)").fetchall():
    print(f"  {col}")
print("\nteams columns:")
for col in c.execute("PRAGMA table_info(teams)").fetchall():
    print(f"  {col}")
print("\ngrades columns:")
for col in c.execute("PRAGMA table_info(grades)").fetchall():
    print(f"  {col}")
print("\nseasons columns:")
for col in c.execute("PRAGMA table_info(seasons)").fetchall():
    print(f"  {col}")
