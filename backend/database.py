import sqlite3
import os
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "exam.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Position table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS positions (
        code TEXT PRIMARY KEY,
        name TEXT,
        org TEXT,
        unit TEXT,
        quota INTEGER,
        city TEXT,
        district TEXT,
        education TEXT,
        degree TEXT,
        major_pg TEXT,
        major_ug TEXT,
        target TEXT,
        notes TEXT,
        intro TEXT
    )
    """)
    
    # Application statistics table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        code TEXT,
        date TEXT,
        applicants INTEGER,
        passed INTEGER,
        PRIMARY KEY (code, date)
    )
    """)
    
    conn.commit()
    conn.close()

def save_positions(df):
    """Save/update positions from dataframe"""
    conn = get_db_connection()
    # Ensure codes are strings and remove any trailing .0 from Excel conversion
    df['code'] = df['职位代码'].astype(str).str.replace(r'\.0$', '', regex=True).str.strip()
    
    # Mapping
    data = []
    for _, row in df.iterrows():
        # Skip invalid codes
        if row['code'].lower() == 'nan':
            continue
            
        data.append((
            row['code'],
            row.get('职位名称', ''),
            row.get('招录机关', ''),
            row.get('用人单位', ''),
            int(row.get('招录人数', 1)),
            row.get('城市', '未知'),
            row.get('区县', '其他'),
            row.get('学历', ''),
            row.get('学位', ''),
            row.get('研究生专业', ''),
            row.get('本科专业', ''),
            row.get('招录对象', ''),
            row.get('备注', ''),
            row.get('职位简介', '')
        ))
    
    cursor = conn.cursor()
    cursor.executemany("""
    INSERT OR REPLACE INTO positions 
    (code, name, org, unit, quota, city, district, education, degree, major_pg, major_ug, target, notes, intro)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, data)
    
    conn.commit()
    conn.close()

def save_applications(df, report_date):
    """Save applications for a specific date"""
    conn = get_db_connection()
    # Ensure codes are strings and remove any trailing .0 from Excel conversion
    df['code'] = df['职位代码'].astype(str).str.replace(r'\.0$', '', regex=True).str.strip()
    
    data = []
    for _, row in df.iterrows():
        code = row['code']
        # Skip invalid codes or "Total" rows
        if not code or code.lower() == 'nan' or code == '合计':
            continue
            
        data.append((
            code,
            report_date,
            int(row.get('报名人数', 0)),
            int(row.get('审核通过人数', 0))
        ))
    
    cursor = conn.cursor()
    cursor.executemany("""
    INSERT OR REPLACE INTO applications (code, date, applicants, passed)
    VALUES (?, ?, ?, ?)
    """, data)
    
    conn.commit()
    conn.close()

def get_positions_with_stats(date=None, city=None, education=None, keyword=None, district=None, limit=1000, offset=0):
    """Unified query for positions and stats"""
    conn = get_db_connection()
    
    # If date is not provided, get the latest one
    if not date:
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(date) FROM applications")
        date = cursor.fetchone()[0]
    
    query = """
    SELECT p.*, 
           COALESCE(a.applicants, 0) as applicants, 
           COALESCE(a.passed, 0) as passed,
           ROUND(CAST(COALESCE(a.applicants, 0) AS FLOAT) / CASE WHEN p.quota = 0 THEN 1 ELSE p.quota END, 1) as competition_ratio
    FROM positions p
    LEFT JOIN applications a ON p.code = a.code AND a.date = ?
    WHERE 1=1
    """
    params = [date]
    
    if city:
        query += " AND p.city LIKE ?"
        params.append(f"%{city}%")
    if district:
        query += " AND p.district = ?"
        params.append(district)
    if education:
        query += " AND p.education LIKE ?"
        params.append(f"%{education}%")
    if keyword:
        query += """ AND (
            p.name LIKE ? OR p.org LIKE ? OR p.unit LIKE ? OR 
            p.major_pg LIKE ? OR p.major_ug LIKE ? OR p.intro LIKE ? OR p.notes LIKE ?
        )"""
        k = f"%{keyword}%"
        params.extend([k, k, k, k, k, k, k])
        
    # Count total for pagination
    count_query = f"SELECT COUNT(*) FROM ({query})"
    cursor = conn.cursor()
    cursor.execute(count_query, params)
    total = cursor.fetchone()[0]
    
    # Add ordering and limit
    query += " ORDER BY applicants DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    df = pd.read_sql_query(query, conn, params=params)
    conn.close()
    
    return df, total, date

def get_regional_stats(date=None):
    conn = get_db_connection()
    if not date:
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(date) FROM applications")
        date = cursor.fetchone()[0]
        
    query = """
    SELECT p.city as name, 
           COUNT(p.code) as positions, 
           SUM(p.quota) as quota, 
           SUM(COALESCE(a.applicants, 0)) as applicants,
           SUM(COALESCE(a.passed, 0)) as passed
    FROM positions p
    LEFT JOIN applications a ON p.code = a.code AND a.date = ?
    GROUP BY p.city
    """
    df = pd.read_sql_query(query, conn, params=[date])
    conn.close()
    return df, date

def get_wuhan_district_stats(date=None):
    conn = get_db_connection()
    if not date:
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(date) FROM applications")
        date = cursor.fetchone()[0]
        
    query = """
    SELECT p.district as name, 
           COUNT(p.code) as positions, 
           SUM(p.quota) as quota, 
           SUM(COALESCE(a.applicants, 0)) as applicants
    FROM positions p
    LEFT JOIN applications a ON p.code = a.code AND a.date = ?
    WHERE p.city = '武汉市'
    GROUP BY p.district
    """
    df = pd.read_sql_query(query, conn, params=[date])
    conn.close()
    return df, date

def get_positions_by_codes(codes, date=None):
    """Query specific positions by codes with latest stats"""
    if not codes:
        return pd.DataFrame(), 0, None
        
    conn = get_db_connection()
    
    if not date:
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(date) FROM applications")
        date = cursor.fetchone()[0]
        
    placeholders = ','.join(['?'] * len(codes))
    query = f"""
    SELECT p.*, 
           COALESCE(a.applicants, 0) as applicants, 
           COALESCE(a.passed, 0) as passed,
           ROUND(CAST(COALESCE(a.applicants, 0) AS FLOAT) / CASE WHEN p.quota = 0 THEN 1 ELSE p.quota END, 1) as competition_ratio
    FROM positions p
    LEFT JOIN applications a ON p.code = a.code AND a.date = ?
    WHERE p.code IN ({placeholders})
    ORDER BY applicants DESC
    """
    
    params = [date] + [str(c) for c in codes]
    df = pd.read_sql_query(query, conn, params=params)
    conn.close()
    
    return df, len(df), date

