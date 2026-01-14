
import sqlite3
import os

DB_PATH = 'backend/data/exam.db'

if not os.path.exists(DB_PATH):
    print(f"Database not found at {DB_PATH}")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("--- Distinct Dates in Applications Table ---")
cursor.execute("SELECT DISTINCT date FROM applications ORDER BY date")
dates = cursor.fetchall()
for d in dates:
    print(d[0])

if not dates:
    print("No data found in applications table.")
else:
    print(f"Found {len(dates)} dates.")
    
    # Check sample data for a code
    print("\n--- Sample Data for a Code ---")
    cursor.execute("SELECT code, date, applicants FROM applications LIMIT 5")
    rows = cursor.fetchall()
    for r in rows:
        print(r)

conn.close()
