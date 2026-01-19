
import sqlite3
import pandas as pd

try:
    conn = sqlite3.connect('backend/data/exam.db')
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT date FROM applications ORDER BY date")
    dates = [row[0] for row in cursor.fetchall()]
    print(f"Dates in DB: {dates}")
    
    # Check simple count for a date
    if dates:
        last_date = dates[-1]
        cursor.execute("SELECT count(*) FROM applications WHERE date = ?", (last_date,))
        count = cursor.fetchone()[0]
        print(f"Count for {last_date}: {count}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
