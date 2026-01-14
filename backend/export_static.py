import sqlite3
import pandas as pd
import json
import os
import datetime

# Configuration
DB_PATH = os.path.join(os.path.dirname(__file__), "data", "exam.db")
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "data"))

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def export_summary():
    print("Exporting summary...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get latest date
    cursor.execute("SELECT MAX(date) FROM applications")
    latest_date = cursor.fetchone()[0]
    
    if not latest_date:
        print("No data found!")
        return

    # Total stats for latest date
    cursor.execute("""
        SELECT COUNT(p.code) as total_positions, 
               SUM(p.quota) as total_quota,
               SUM(a.applicants) as total_applicants,
               SUM(a.passed) as total_passed
        FROM positions p
        LEFT JOIN applications a ON p.code = a.code AND a.date = ?
    """, (latest_date,))
    row = cursor.fetchone()
    
    summary = {
        "total_positions": row['total_positions'],
        "total_quota": row['total_quota'],
        "total_applicants": row['total_applicants'] or 0,
        "total_passed": row['total_passed'] or 0,
        "date": latest_date,
        "daily_files": [] # We will populate this from trend query
    }
    
    # Get all available dates for trend/files
    cursor.execute("SELECT DISTINCT date FROM applications ORDER BY date")
    dates = [r[0] for r in cursor.fetchall()]
    summary["daily_files"] = dates
    
    with open(os.path.join(OUTPUT_DIR, "summary.json"), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

def export_trend():
    print("Exporting trend...")
    conn = get_db_connection()
    
    # 1. Global Trend
    query = """
    SELECT date, 
           SUM(applicants) as applicants, 
           SUM(passed) as passed
    FROM applications
    GROUP BY date
    ORDER BY date
    """
    df = pd.read_sql_query(query, conn)
    trend_data = df.to_dict(orient='records')
    
    with open(os.path.join(OUTPUT_DIR, "trend.json"), 'w', encoding='utf-8') as f:
        json.dump({"data": trend_data}, f, ensure_ascii=False, indent=2)

    # 2. City-specific Trends
    # Get all cities first
    city_cursor = conn.cursor()
    city_cursor.execute("SELECT DISTINCT city FROM positions WHERE city IS NOT NULL AND city != ''")
    cities = [r[0] for r in city_cursor.fetchall()]
    
    for city in cities:
        # Query for specific city
        # Join positions to filter by city, then group by date
        city_query = """
        SELECT a.date, 
               SUM(a.applicants) as applicants, 
               SUM(a.passed) as passed
        FROM applications a
        JOIN positions p ON a.code = p.code
        WHERE p.city = ?
        GROUP BY a.date
        ORDER BY a.date
        """
        df_city = pd.read_sql_query(city_query, conn, params=(city,))
        city_trend_data = df_city.to_dict(orient='records')
        
        # Save to file, e.g., trend_武汉市.json
        # Check for filename safety if needed, but Chinese usually works on modern OS/web servers
        filename = f"trend_{city}.json"
        with open(os.path.join(OUTPUT_DIR, filename), 'w', encoding='utf-8') as f:
            json.dump({"data": city_trend_data}, f, ensure_ascii=False, indent=2)

    conn.close()

def export_positions():
    print("Exporting positions...")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(date) FROM applications")
    latest_date = cursor.fetchone()[0]
    
    # Fetch all positions with latest stats
    # We rename columns here to match what frontend expects locally or mapped in python
    query = """
    SELECT p.code as "职位代码", 
           p.name as "职位名称", 
           p.org as "招录机关", 
           p.unit as "用人单位", 
           p.quota as "招录人数", 
           p.city as "城市", 
           p.district as "district", -- Keep internal for filtering if needed, or map to user friendly
           p.education as "学历", 
           p.degree as "学位", 
           p.major_pg as "研究生专业", 
           p.major_ug as "本科专业", 
           p.target as "招录对象", 
           p.notes as "备注", 
           p.intro as "职位简介",
           COALESCE(a.applicants, 0) as "报名人数", 
           COALESCE(a.passed, 0) as "审核通过人数"
    FROM positions p
    LEFT JOIN applications a ON p.code = a.code AND a.date = ?
    """
    df = pd.read_sql_query(query, conn, params=(latest_date,))
    
    # Calculate competition ratio
    # Avoid division by zero
    df['竞争比'] = df.apply(lambda row: round(row['报名人数'] / max(row['招录人数'], 1), 1), axis=1)
    
    # Convert to list of dicts
    data = df.fillna("").to_dict(orient='records')
    
    # Save full data
    with open(os.path.join(OUTPUT_DIR, "positions.json"), 'w', encoding='utf-8') as f:
        json.dump({"data": data, "date": latest_date, "total": len(data)}, f, ensure_ascii=False) # remove indent to save space

    conn.close()

def export_filters():
    print("Exporting filters...")
    conn = get_db_connection()
    
    # Cities (From main.py map logic + DB distinct)
    # We will trust DB content since we normalized it
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT city FROM positions WHERE city IS NOT NULL AND city != '' ORDER BY city")
    cities = [r[0] for r in cursor.fetchall()]
    
    # Add '省直' if missing and sort (usually handled in DB, but let's ensure '省直' is at top or handled)
    if "省直" in cities:
        cities.remove("省直")
        cities.insert(0, "省直")
    
    cursor.execute("SELECT DISTINCT education FROM positions WHERE education IS NOT NULL AND education != '' ORDER BY education")
    education = [r[0] for r in cursor.fetchall()]
    
    cursor.execute("SELECT DISTINCT degree FROM positions WHERE degree IS NOT NULL AND degree != '' ORDER BY degree")
    degree = [r[0] for r in cursor.fetchall()]
    
    filters = {
        "cities": cities,
        "education": education,
        "degree": degree
    }
    
    with open(os.path.join(OUTPUT_DIR, "filters.json"), 'w', encoding='utf-8') as f:
        json.dump(filters, f, ensure_ascii=False, indent=2)
        
    conn.close()

def export_maps():
    print("Exporting map data...")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(date) FROM applications")
    latest_date = cursor.fetchone()[0]
    
    # Province Map Data
    query_prov = """
    SELECT p.city as name, 
           COUNT(p.code) as positions, 
           SUM(p.quota) as quota, 
           SUM(COALESCE(a.applicants, 0)) as applicants
    FROM positions p
    LEFT JOIN applications a ON p.code = a.code AND a.date = ?
    GROUP BY p.city
    """
    df_prov = pd.read_sql_query(query_prov, conn, params=(latest_date,))
    
    # Wuhan District Data
    query_wuhan = """
    SELECT p.district as name, 
           COUNT(p.code) as positions, 
           SUM(p.quota) as quota, 
           SUM(COALESCE(a.applicants, 0)) as applicants
    FROM positions p
    LEFT JOIN applications a ON p.code = a.code AND a.date = ?
    WHERE p.city = '武汉市'
    GROUP BY p.district
    """
    df_wuhan = pd.read_sql_query(query_wuhan, conn, params=(latest_date,))
    
    # Calculate competition ratios
    df_prov['competition_ratio'] = (df_prov['applicants'] / df_prov['quota'].replace(0, 1)).round(1)
    df_wuhan['competition_ratio'] = (df_wuhan['applicants'] / df_wuhan['quota'].replace(0, 1)).round(1)
    
    map_data = {
        "province": df_prov.fillna(0).to_dict(orient='records'),
        "wuhan": df_wuhan.fillna(0).to_dict(orient='records'),
        "date": latest_date
    }
    
    with open(os.path.join(OUTPUT_DIR, "map_data.json"), 'w', encoding='utf-8') as f:
        json.dump(map_data, f, ensure_ascii=False, indent=2)
        
    conn.close()

def export_surge():
    """Export top surge positions (biggest daily increase)"""
    print("Exporting surge data...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get latest two dates
    cursor.execute("SELECT DISTINCT date FROM applications ORDER BY date DESC LIMIT 2")
    dates = [r[0] for r in cursor.fetchall()]
    
    if len(dates) < 2:
        print("Not enough dates for surge calculation, skipping...")
        # Still create empty file
        with open(os.path.join(OUTPUT_DIR, "surge.json"), 'w', encoding='utf-8') as f:
            json.dump({"data": [], "date": dates[0] if dates else None, "prev_date": None}, f, ensure_ascii=False)
        conn.close()
        return
    
    latest_date = dates[0]
    prev_date = dates[1]
    
    # Query to get delta between two dates
    query = """
    SELECT p.code as code,
           p.name as name,
           p.unit as unit,
           p.city as city,
           p.quota as quota,
           COALESCE(a_today.applicants, 0) as applicants_today,
           COALESCE(a_prev.applicants, 0) as applicants_prev,
           COALESCE(a_today.applicants, 0) - COALESCE(a_prev.applicants, 0) as delta
    FROM positions p
    LEFT JOIN applications a_today ON p.code = a_today.code AND a_today.date = ?
    LEFT JOIN applications a_prev ON p.code = a_prev.code AND a_prev.date = ?
    ORDER BY delta DESC
    LIMIT 30
    """
    df = pd.read_sql_query(query, conn, params=(latest_date, prev_date))
    
    # Filter only positive deltas (actual surges)
    df = df[df['delta'] > 0]
    
    surge_data = df.to_dict(orient='records')
    
    # Also calculate for Wuhan specifically
    query_wuhan = """
    SELECT p.code as code,
           p.name as name,
           p.unit as unit,
           p.district as district,
           p.quota as quota,
           COALESCE(a_today.applicants, 0) as applicants_today,
           COALESCE(a_prev.applicants, 0) as applicants_prev,
           COALESCE(a_today.applicants, 0) - COALESCE(a_prev.applicants, 0) as delta
    FROM positions p
    LEFT JOIN applications a_today ON p.code = a_today.code AND a_today.date = ?
    LEFT JOIN applications a_prev ON p.code = a_prev.code AND a_prev.date = ?
    WHERE p.city = '武汉市'
    ORDER BY delta DESC
    LIMIT 20
    """
    df_wuhan = pd.read_sql_query(query_wuhan, conn, params=(latest_date, prev_date))
    df_wuhan = df_wuhan[df_wuhan['delta'] > 0]
    surge_wuhan = df_wuhan.to_dict(orient='records')
    
    result = {
        "data": surge_data,
        "wuhan": surge_wuhan,
        "date": latest_date,
        "prev_date": prev_date
    }
    
    with open(os.path.join(OUTPUT_DIR, "surge.json"), 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    conn.close()

def export_all():
    """Execute all export functions"""
    try:
        print(f"Exporting static data to {OUTPUT_DIR}...")
        export_summary()
        export_trend()
        export_positions()
        export_filters()
        export_maps()
        export_surge()
        print("Static data export completed!")
        return True
    except Exception as e:
        print(f"Export failed: {e}")
        return False

if __name__ == "__main__":
    export_all()
