"""
湖北省公务员考试报名数据可视化 - 后端API
根据实际数据格式调整
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
from datetime import date, datetime
import os
import json
from typing import Optional, List
import re
from database import init_db, save_positions, save_applications, get_positions_with_stats, get_regional_stats, get_wuhan_district_stats, get_db_connection

# 初始化数据库
init_db()

app = FastAPI(title="湖北省公务员考试报名数据可视化")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据目录
DATA_DIR = "data"
POSITION_FILE = os.path.join(DATA_DIR, "positions.xlsx")  # 职位表
DAILY_DIR = os.path.join(DATA_DIR, "daily")  # 每日报名数据

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(DAILY_DIR, exist_ok=True)

# 字段映射 - 将实际字段映射到标准字段
POSITION_FIELD_MAP = {
    '机构名称': '招录机关',
    '招录机关': '用人单位',
    '招录职位': '职位名称',
    '职位代码': '职位代码',
    '招录数量': '招录人数',
    '学历': '学历',
    '学位': '学位',
    '机构层级': '工作地点',  # 用机构层级代替工作地点
    '研究生专业': '专业',
    '本科专业': '本科专业',
    '备注': '备注',
    '招录对象': '招录对象',
    '户籍要求': '户籍要求',
}

DAILY_FIELD_MAP = {
    '职位代码': '职位代码',
    '报考人数': '报名人数',
    '招录人数': '招录人数',
}


def clean_region_name(name: str) -> str:
    """清理地区名称"""
    if pd.isna(name):
        return "未知"
    return str(name).strip()


def extract_city_from_org(org_name: str) -> str:
    """
    从机构名称提取城市/地区
    例如: "武汉市人大常委会" -> "武汉市"
          "省人大常委会办公厅" -> "省直"
    """
    if pd.isna(org_name):
        return "未知"
    
    org = str(org_name).strip()
    
    # 省级机关
    if org.startswith('省') or '省委' in org or '省政府' in org:
        return "省直"
    
    # 提取市名
    city_pattern = r'^([\u4e00-\u9fa5]+(?:市|州))'
    match = re.match(city_pattern, org)
    if match:
        return match.group(1)
    
    # 提取区/县名
    district_pattern = r'^([\u4e00-\u9fa5]+(?:区|县|林区))'
    match = re.match(district_pattern, org)
    if match:
        return match.group(1)
    
    return org[:4] if len(org) >= 4 else org


def standardize_position_df(df: pd.DataFrame) -> pd.DataFrame:
    """标准化职位表字段"""
    # 创建新的标准化DataFrame
    std_df = pd.DataFrame()
    
    # 映射字段
    for orig_col, std_col in POSITION_FIELD_MAP.items():
        if orig_col in df.columns:
            std_df[std_col] = df[orig_col]
    
    # 确保关键字段存在
    if '职位代码' not in std_df.columns:
        std_df['职位代码'] = range(1, len(df) + 1)
    
    if '招录人数' not in std_df.columns:
        std_df['招录人数'] = 1
    else:
        std_df['招录人数'] = pd.to_numeric(std_df['招录人数'], errors='coerce').fillna(1)
    
    # 从机构名称提取城市信息
    if '招录机关' in std_df.columns:
        std_df['城市'] = std_df['招录机关'].apply(extract_city_from_org)
    else:
        std_df['城市'] = "未知"
    
    # 合并专业字段
    if '专业' not in std_df.columns or std_df['专业'].isna().all():
        if '本科专业' in std_df.columns:
            std_df['专业'] = std_df['本科专业']
    
    return std_df


def standardize_daily_df(df: pd.DataFrame) -> pd.DataFrame:
    """标准化每日报名数据字段"""
    std_df = pd.DataFrame()
    
    # 检查是否需要跳过标题行（第一行是中文描述）
    if df.columns[0].startswith('湖北省') or '统计表' in str(df.columns[0]):
        # 使用第一行数据作为列名
        df.columns = df.iloc[0]
        df = df.iloc[1:].reset_index(drop=True)
    
    # 映射字段
    for col in df.columns:
        if '职位代码' in str(col):
            std_df['职位代码'] = df[col]
        elif '报考人数' in str(col) or '报名人数' in str(col):
            std_df['报名人数'] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        elif '审核' in str(col) and '人数' in str(col):
            std_df['审核通过人数'] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    if '审核通过人数' not in std_df.columns:
        std_df['审核通过人数'] = 0
    
    return std_df


@app.get("/")
async def root():
    return {"message": "湖北省公务员考试报名数据可视化API"}


@app.post("/upload/positions")
async def upload_positions(file: UploadFile = File(...)):
    """上传职位表并同步到数据库"""
    try:
        df = pd.read_excel(file.file, dtype=str)
        
        # 标准化字段
        std_df = standardize_position_df(df)
        
        # 保存到 Excel (备份)
        std_df.to_excel(POSITION_FILE, index=False)
        
        # 保存到数据库
        save_positions(std_df)
        
        # 获取基本统计
        stats = {
            "total_positions": len(std_df),
            "total_quota": int(std_df['招录人数'].sum()),
            "columns": list(std_df.columns),
            "cities": sorted(std_df['城市'].unique().tolist()),
        }
        
        return {"status": "success", "message": "职位表上传并入库成功", "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"上传失败: {str(e)}")


@app.post("/upload/daily")
async def upload_daily(
    file: UploadFile = File(...),
    report_date: Optional[str] = Query(None, description="报名日期 YYYY-MM-DD, 默认今天")
):
    """上传每日报名数据并同步到数据库"""
    try:
        if report_date is None:
            report_date = date.today().isoformat()
        
        df = pd.read_excel(file.file, dtype=str)
        
        # 标准化字段
        std_df = standardize_daily_df(df)
        
        # 保存到 Excel (备份)
        daily_path = os.path.join(DAILY_DIR, f"{report_date}.xlsx")
        std_df.to_excel(daily_path, index=False)
        
        # 保存到数据库
        save_applications(std_df, report_date)
        
        stats = {
            "date": report_date,
            "total_positions": len(std_df),
            "total_applicants": int(std_df['报名人数'].sum()),
        }
        
        return {"status": "success", "message": f"{report_date} 报名数据上传并入库成功", "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"上传失败: {str(e)}")


@app.get("/stats/dates")
async def get_available_dates():
    """获取所有可用的报名数据日期列表"""
    if not os.path.exists(DAILY_DIR):
        return []
    daily_files = sorted(os.listdir(DAILY_DIR))
    return [f.replace('.xlsx', '') for f in daily_files]


@app.get("/positions")
async def get_positions(
    city: Optional[str] = None,
    education: Optional[str] = None,
    keyword: Optional[str] = None,
    date: Optional[str] = None,
    page: int = 1,
    page_size: int = 50
):
    """从数据库获取职位列表"""
    try:
        limit = page_size
        offset = (page - 1) * page_size
        
        df, total, actual_date = get_positions_with_stats(
            date=date, 
            city=city, 
            education=education, 
            keyword=keyword, 
            limit=limit, 
            offset=offset
        )
        
        # 兼容前端字段名
        result_df = df.rename(columns={
            'code': '职位代码',
            'name': '职位名称',
            'org': '招录机关',
            'unit': '用人单位',
            'quota': '招录人数',
            'city': '城市',
            'education': '学历',
            'degree': '学位',
            'major_pg': '研究生专业',
            'major_ug': '本科专业',
            'target': '招录对象',
            'notes': '备注',
            'intro': '职位简介',
            'passed': '审核通过人数',
            'competition_ratio': '竞争比'
        })
        
        return {
            "data": result_df.fillna("").to_dict(orient='records'),
            "total": total,
            "page": page,
            "page_size": page_size,
            "date": actual_date
        }
    except Exception as e:
        return {"data": [], "total": 0, "message": f"查询失败: {str(e)}"}


@app.get("/stats/by-region")
async def get_stats_by_region(date: Optional[str] = None):
    """从数据库获取地区统计数据"""
    try:
        df, actual_date = get_regional_stats(date=date)
        return {
            "cities": df.fillna(0).to_dict(orient='records'),
            "districts": [],
            "date": actual_date
        }
    except Exception as e:
        return {"cities": [], "message": f"查询失败: {str(e)}"}


@app.get("/stats/wuhan-districts")
async def get_wuhan_districts(date: Optional[str] = None):
    """从数据库获取武汉区县统计"""
    try:
        df, actual_date = get_wuhan_district_stats(date=date)
        # 计算总计
        total_pos = int(df['positions'].sum())
        total_quota = int(df['quota'].sum())
        total_applicants = int(df['applicants'].sum())
        
        df['competition_ratio'] = (df['applicants'] / df['quota'].replace(0, 1)).round(1)
        
        return {
            "data": df.fillna(0).to_dict(orient='records'),
            "total_positions": total_pos,
            "total_quota": total_quota,
            "total_applicants": total_applicants,
            "date": actual_date
        }
    except Exception as e:
        return {"data": [], "message": f"查询失败: {str(e)}"}


@app.get("/positions/wuhan")
async def get_wuhan_positions(
    district: Optional[str] = None,
    keyword: Optional[str] = None,
    date: Optional[str] = None,
    page: int = 1,
    page_size: int = 50
):
    """从数据库获取武汉详细职位列表"""
    try:
        limit = page_size
        offset = (page - 1) * page_size
        
        df, total, actual_date = get_positions_with_stats(
            date=date,
            city="武汉市",
            district=district,
            keyword=keyword,
            limit=limit,
            offset=offset
        )
        
        result_df = df.rename(columns={
            'code': '职位代码',
            'name': '职位名称',
            'org': '招录机关',
            'unit': '用人单位',
            'quota': '招录人数',
            'city': '城市',
            'competition_ratio': '竞争比',
            'applicants': '报名人数'
        })
        
        return {
            "data": result_df.fillna("").to_dict(orient='records'),
            "total": total,
            "page": page,
            "page_size": page_size,
            "date": actual_date
        }
    except Exception as e:
        return {"data": [], "total": 0, "message": f"查询失败: {str(e)}"}


@app.post("/positions/by-codes")
async def get_positions_by_codes(codes: List[str]):
    """根据职位代码列表查询职位详情"""
    if not os.path.exists(POSITION_FILE):
        return {"data": [], "message": "请先上传职位表"}
    
    # 去重
    unique_codes = list(set(codes))
    
    df = pd.read_excel(POSITION_FILE, dtype={'职位代码': str})
    
    # 加载最新报名数据
    daily_files = sorted(os.listdir(DAILY_DIR)) if os.path.exists(DAILY_DIR) else []
    if daily_files:
        latest_file = daily_files[-1]
        daily_df = pd.read_excel(os.path.join(DAILY_DIR, latest_file), dtype={'职位代码': str})
        if '职位代码' in df.columns and '职位代码' in daily_df.columns:
            df['职位代码'] = df['职位代码'].astype(str)
            daily_df['职位代码'] = daily_df['职位代码'].astype(str)
            df = df.merge(daily_df[['职位代码', '报名人数']], on='职位代码', how='left')
            df['报名人数'] = df['报名人数'].fillna(0)
    else:
        df['报名人数'] = 0
    
    # 筛选指定的职位代码
    df['职位代码'] = df['职位代码'].astype(str)
    filtered = df[df['职位代码'].isin(unique_codes)].copy()
    
    # 计算竞争比
    if '招录人数' in filtered.columns:
        filtered['竞争比'] = (filtered['报名人数'] / filtered['招录人数'].replace(0, 1)).round(1)
    else:
        filtered['竞争比'] = 0
    
    # 按报名人数排序
    filtered = filtered.sort_values('报名人数', ascending=False)
    
    # 找出未找到的职位代码
    found_codes = set(filtered['职位代码'].tolist())
    not_found = [c for c in unique_codes if c not in found_codes]
    
    return {
        "data": filtered.fillna("").to_dict(orient='records'),
        "total": len(filtered),
        "not_found": not_found,
        "latest_date": daily_files[-1].replace('.xlsx', '') if daily_files else None
    }


@app.post("/positions/trend-by-codes")
async def get_trend_by_codes(codes: List[str]):
    """获取指定职位代码列表的多日报名趋势数据"""
    if not os.path.exists(DAILY_DIR):
        return {"data": [], "dates": [], "message": "暂无报名数据"}
    
    daily_files = sorted(os.listdir(DAILY_DIR))
    if not daily_files:
        return {"data": [], "dates": [], "message": "暂无报名数据"}
    
    # 去重
    unique_codes = list(set(codes))
    
    # 加载职位表获取职位名称
    pos_names = {}
    if os.path.exists(POSITION_FILE):
        pos_df = pd.read_excel(POSITION_FILE, dtype={'职位代码': str})
        pos_df['职位代码'] = pos_df['职位代码'].astype(str)
        for _, row in pos_df.iterrows():
            if row['职位代码'] in unique_codes:
                pos_names[row['职位代码']] = row.get('职位名称', row['职位代码'])
    
    # 收集每日数据
    dates = []
    trend_data = {code: [] for code in unique_codes}
    
    for f in daily_files:
        file_date = f.replace('.xlsx', '')
        dates.append(file_date)
        
        daily_df = pd.read_excel(os.path.join(DAILY_DIR, f), dtype={'职位代码': str})
        daily_df['职位代码'] = daily_df['职位代码'].astype(str)
        
        # 获取每个职位的报名人数
        for code in unique_codes:
            matching = daily_df[daily_df['职位代码'] == code]
            if len(matching) > 0 and '报名人数' in matching.columns:
                applicants = int(matching['报名人数'].iloc[0])
            else:
                applicants = 0
            trend_data[code].append(applicants)
    
    # 构建返回数据
    result = []
    for code in unique_codes:
        result.append({
            "code": code,
            "name": pos_names.get(code, code),
            "data": trend_data[code]
        })
    
    # 按最新数据排序（最热门的在前）
    result.sort(key=lambda x: x['data'][-1] if x['data'] else 0, reverse=True)
    
    return {
        "positions": result,
        "dates": dates
    }


@app.get("/stats/trend")
async def get_trend(
    position_code: Optional[str] = None,
    city: Optional[str] = None
):
    """获取报名趋势数据"""
    daily_files = sorted(os.listdir(DAILY_DIR)) if os.path.exists(DAILY_DIR) else []
    
    if not daily_files:
        return {"data": [], "message": "暂无报名数据"}
    
    trend_data = []
    pos_df = None
    
    # 加载职位表用于地区筛选
    if city and os.path.exists(POSITION_FILE):
        pos_df = pd.read_excel(POSITION_FILE)
        if '城市' not in pos_df.columns and '招录机关' in pos_df.columns:
            pos_df['城市'] = pos_df['招录机关'].apply(extract_city_from_org)
    
    for f in daily_files:
        file_date = f.replace('.xlsx', '')
        daily_df = pd.read_excel(os.path.join(DAILY_DIR, f))
        
        # 地区筛选
        if city and pos_df is not None:
            city_positions = pos_df[pos_df['城市'].str.contains(city, na=False)]['职位代码'].astype(str).tolist()
            daily_df['职位代码'] = daily_df['职位代码'].astype(str)
            daily_df = daily_df[daily_df['职位代码'].isin(city_positions)]
        
        # 按职位代码筛选
        if position_code:
            daily_df['职位代码'] = daily_df['职位代码'].astype(str)
            daily_df = daily_df[daily_df['职位代码'] == str(position_code)]
        
        applicants = int(daily_df['报名人数'].sum()) if '报名人数' in daily_df.columns else 0
        passed = int(daily_df['审核通过人数'].sum()) if '审核通过人数' in daily_df.columns else 0
        
        trend_data.append({
            "date": file_date,
            "applicants": applicants,
            "passed": passed
        })
    
    return {"data": trend_data}


@app.get("/stats/hot-positions")
async def get_hot_positions(limit: int = 10, date: Optional[str] = None):
    """从数据库获取热门岗位"""
    df, total, actual_date = get_positions_with_stats(date=date, limit=limit)
    result_df = df.rename(columns={
        'code': '职位代码',
        'name': '职位名称',
        'org': '招录机关',
        'unit': '用人单位',
        'quota': '招录人数',
        'city': '城市',
        'education': '学历',
        'degree': '学位',
        'major_ug': '专业',
        'applicants': '报名人数',
        'competition_ratio': '竞争比'
    })
    return {
        "data": result_df.fillna("").to_dict(orient='records'),
        "date": actual_date
    }


@app.get("/stats/cold-positions")
async def get_cold_positions(limit: int = 10, date: Optional[str] = None):
    """从数据库获取冷门岗位 (报名人数最少)"""
    # 这里直接复用 get_positions_with_stats 但需要反向排序，简单起见直接用 SQL 或者重新封装一个
    # 为了演示，我们重新封装一个 sql
    conn = get_db_connection()
    if not date:
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(date) FROM applications")
        date = cursor.fetchone()[0]
    
    query = """
    SELECT p.*, 
           COALESCE(a.applicants, 0) as applicants,
           ROUND(CAST(COALESCE(a.applicants, 0) AS FLOAT) / CASE WHEN p.quota = 0 THEN 1 ELSE p.quota END, 1) as competition_ratio
    FROM positions p
    LEFT JOIN applications a ON p.code = a.code AND a.date = ?
    ORDER BY applicants ASC, p.quota DESC
    LIMIT ?
    """
    df = pd.read_sql_query(query, conn, params=[date, limit])
    conn.close()
    
    result_df = df.rename(columns={
        'code': '职位代码',
        'name': '职位名称',
        'org': '招录机关',
        'unit': '用人单位',
        'quota': '招录人数',
        'city': '城市',
        'education': '学历',
        'degree': '学位',
        'major_ug': '专业',
        'applicants': '报名人数',
        'competition_ratio': '竞争比'
    })
    return {
        "data": result_df.fillna("").to_dict(orient='records'),
        "date": date
    }


@app.get("/stats/summary")
async def get_summary(date: Optional[str] = None):
    """获取总体统计摘要"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 基本职位信息
    cursor.execute("SELECT COUNT(*), SUM(quota) FROM positions")
    total_pos, total_quota = cursor.fetchone()
    
    # 城市列表
    cursor.execute("SELECT DISTINCT city FROM positions WHERE city != '未知' ORDER BY city")
    cities = [row[0] for row in cursor.fetchall()]
    
    # 学历列表
    cursor.execute("SELECT DISTINCT education FROM positions WHERE education != ''")
    educations = [row[0] for row in cursor.fetchall()]
    
    # 确定日期
    if not date:
        cursor.execute("SELECT MAX(date) FROM applications")
        date = cursor.fetchone()[0]
    
    # 获取该日期的总人数
    cursor.execute("SELECT SUM(applicants), SUM(passed) FROM applications WHERE date = ?", (date,))
    total_applicants, total_passed = cursor.fetchone()
    
    # 获取所有日期列表
    cursor.execute("SELECT DISTINCT date FROM applications ORDER BY date")
    daily_files = [row[0] for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "has_positions": total_pos > 0,
        "total_positions": total_pos or 0,
        "total_quota": total_quota or 0,
        "total_applicants": total_applicants or 0,
        "total_passed": total_passed or 0,
        "daily_files": daily_files,
        "cities": cities,
        "education_types": educations,
        "date": date
    }


@app.get("/filters")
async def get_filters():
    """获取可用的筛选条件"""
    if not os.path.exists(POSITION_FILE):
        return {"cities": [], "districts": {}, "education": [], "degree": []}
    
    df = pd.read_excel(POSITION_FILE)
    
    result = {
        "cities": [],
        "districts": {},
        "education": [],
        "degree": []
    }
    
    # 城市
    if '城市' in df.columns:
        result["cities"] = sorted([c for c in df['城市'].dropna().unique().tolist() if c])
    
    # 学历
    if '学历' in df.columns:
        result["education"] = sorted([e for e in df['学历'].dropna().unique().tolist() if e])
    
    # 学位
    if '学位' in df.columns:
        result["degree"] = sorted([d for d in df['学位'].dropna().unique().tolist() if d])
    
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
