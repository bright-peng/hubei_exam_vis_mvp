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
from database import init_db, save_positions, save_applications, get_positions_with_stats, get_regional_stats, get_wuhan_district_stats, get_db_connection, get_positions_by_codes as db_get_positions_by_codes

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
    '职位代码': '职位代码',
    '招录机关': '招录机关',
    '用人单位': '用人单位',
    '职位名称': '职位名称',
    '招录人数': '招录人数',
    '工作地点': '工作地点',
    '学历': '学历',
    '学位': '学位',
    '研究生专业': '研究生专业',
    '本科专业': '本科专业',
    '专业': '本科专业',
    '招录对象': '招录对象',
    '备注': '备注',
    '职位简介': '职位简介',
    '城市': '城市',
    '区县': '区县'
}

DAILY_FIELD_MAP = {
    '职位代码': '职位代码',
    '报考人数': '报名人数',
    '招录人数': '招录人数',
}


# 湖北省各地市及其下属区县映射（增强匹配，需与 GeoJSON 名称一致）
CITY_DISTRICT_MAP = {
    "武汉市": ["江岸区", "江汉区", "硚口区", "汉阳区", "武昌区", "青山区", "洪山区", "东西湖区", "汉南区", "蔡甸区", "江夏区", "黄陂区", "新洲区", "东湖高新区", "东湖开发区", "武汉经开区", "长江新区", "市直", "东湖风景区"],
    "黄石市": ["黄石港区", "西塞山区", "下陆区", "铁山区", "大冶市", "阳新县"],
    "十堰市": ["茅箭区", "张湾区", "郧阳区", "郧西县", "竹山县", "竹溪县", "房县", "丹江口市", "武当山"],
    "宜昌市": ["西陵区", "伍家岗区", "点军区", "猇亭区", "夷陵区", "远安县", "兴山县", "秭归县", "长阳县", "五峰县", "宜都市", "当阳市", "枝江市", "宜昌高新区"],
    "襄阳市": ["襄城区", "樊城区", "襄州区", "南漳县", "谷城县", "保康县", "枣阳市", "宜城市", "老河口市", "鱼梁洲", "东津新区"],
    "鄂州市": ["鄂城区", "华容区", "梁子湖区", "葛店", "临空经济区"],
    "荆门市": ["东宝区", "掇刀区", "京山市", "沙洋县", "钟祥市", "屈家岭"],
    "孝感市": ["孝南区", "孝昌县", "大悟县", "云梦县", "应城市", "安陆市", "汉川市"],
    "荆州市": ["沙市区", "荆州区", "公安县", "江陵县", "松滋市", "石首市", "洪湖市", "监利市", "沙市"],
    "黄冈市": ["黄州区", "团风县", "红安县", "罗田县", "英山县", "浠水县", "蕲春县", "黄梅县", "麻城市", "武穴市"],
    "咸宁市": ["咸安区", "嘉鱼县", "通城县", "崇阳县", "通山县", "赤壁市"],
    "随州市": ["曾都区", "随县", "广水市"],
    "恩施土家族苗族自治州": ["恩施市", "利川市", "建始县", "巴东县", "宣恩县", "咸丰县", "来凤县", "鹤峰县", "恩施"],
    "仙桃市": ["仙桃"],
    "潜江市": ["潜江"],
    "天门市": ["天门"],
    "神农架林区": ["神农架"]
}

def normalize_city_and_district(org_name: str, raw_city: str = None, raw_district: str = None):
    """
    规整化城市和区县信息
    返回 (city, district)
    """
    org = str(org_name) if not pd.isna(org_name) else ""
    city = str(raw_city) if not pd.isna(raw_city) else ""
    district = str(raw_district) if not pd.isna(raw_district) else ""
    
    # 1. 识别省直
    if "省" in org[:4] or org.startswith("省") or city == "省直":
        return "省直", "其他"
    
    # 2. 如果原始城市名已经在 CITY_DISTRICT_MAP 的 key 里，保持原样
    if city in CITY_DISTRICT_MAP:
        # 如果 raw_city 是武汉市，但 raw_district 为空，尝试从 org 提取
        if not district or district == "其他":
            for d in CITY_DISTRICT_MAP[city]:
                if d in org:
                    district = d
                    break
        return city, district or "其他"

    # 3. 如果 org 或 city 中包含明确的市名
    for main_city in CITY_DISTRICT_MAP.keys():
        short_city = main_city.replace("市", "").replace("州", "").replace("林区", "")
        if short_city in city or short_city in org:
            # 进一步细化区县
            for d in CITY_DISTRICT_MAP[main_city]:
                if d in district or d in org or d in city:
                    return main_city, d
            return main_city, district or "其他"
            
    # 4. 反向搜索：如果 org, city, district 中包含任何已知的区县关键词
    for main_city, districts in CITY_DISTRICT_MAP.items():
        for d in districts:
            # 先尝试全名匹配
            if d in org or d in city or d in district:
                 return main_city, d
            # 再尝试去后缀匹配（仅限长度 >= 2 的词，防止误伤，如“房”县不宜去后缀匹配）
            short_d = d.replace("区", "").replace("县", "").replace("市", "")
            if len(short_d) >= 2:
                if short_d in org or short_d in city or short_d in district:
                    return main_city, d
                    
    # 5. 特殊处理：以“市”开头的机关（通常是武汉市直）
    if org.startswith("市") or city.startswith("市"):
        return "武汉市", "市直"
        
    # 6. 最后保底模糊识别
    if "武汉" in org or "武汉" in city: return "武汉市", "市直"
    if "黄石" in org: return "黄石市", "其他"
    if "十堰" in org: return "十堰市", "其他"
    if "宜昌" in org: return "宜昌市", "其他"
    if "襄阳" in org: return "襄阳市", "其他"
    if "荆门" in org: return "荆门市", "其他"
    if "荆州" in org: return "荆州市", "其他"
    if "黄冈" in org: return "黄冈市", "其他"
    if "孝感" in org: return "孝感市", "其他"
    if "咸宁" in org: return "咸宁市", "其他"
    if "随州" in org: return "随州市", "其他"
    if "恩施" in org: return "恩施土家族苗族自治州", "其他"
    if "仙桃" in org or "仙桃" in city: return "仙桃市", "仙桃"
    if "潜江" in org or "潜江" in city: return "潜江市", "潜江"
    if "天门" in org or "天门" in city: return "天门市", "天门"
    if "神农架" in org or "神农架" in city: return "神农架林区", "神农架"
    
    return city or "未知", district or "其他"


def standardize_position_df(df: pd.DataFrame) -> pd.DataFrame:
    """标准化职位表字段"""
    # 清理列名（去除空格、换行符）
    df.columns = [str(c).strip() for c in df.columns]
    
    # 创建新的标准化DataFrame
    std_df = pd.DataFrame()
    
    # 1. 尝试直接映射已知字段
    for orig_col, std_col in POSITION_FIELD_MAP.items():
        if orig_col in df.columns:
            std_df[std_col] = df[orig_col]
        # 模糊匹配
        else:
            for actual_col in df.columns:
                if orig_col in actual_col and std_col not in std_df.columns:
                    std_df[std_col] = df[actual_col]
                    break
    
    # 2. 特殊处理：如果 std_df 还是缺某些关键列，从 df 中同名列补充
    for col in ['职位代码', '招录机关', '用人单位', '职位名称', '招录人数', '学历', '学位', '城市', '区县']:
        if col not in std_df.columns and col in df.columns:
            std_df[col] = df[col]

    # 3. 确保关键字段存在
    if '职位代码' not in std_df.columns:
        std_df['职位代码'] = range(1, len(df) + 1)
    
    if '招录人数' not in std_df.columns:
        std_df['招录人数'] = 1
    else:
        std_df['招录人数'] = pd.to_numeric(std_df['招录人数'], errors='coerce').fillna(1)
    
    # 4. 提取或填充城市信息
    std_df['norm_info'] = std_df.apply(
        lambda x: normalize_city_and_district(
            x.get('招录机关', ''), 
            x.get('城市', None), 
            x.get('区县', None)
        ), axis=1
    )
    
    std_df['城市'] = std_df['norm_info'].apply(lambda x: x[0])
    std_df['区县'] = std_df['norm_info'].apply(lambda x: x[1])
    std_df.drop(columns=['norm_info'], inplace=True)
    
    # 6. 处理专业字段合并
    if '研究生专业' not in std_df.columns:
        std_df['研究生专业'] = ""
    if '本科专业' not in std_df.columns:
        # 如果有名为“专业”的列，当作本科专业
        if '专业' in df.columns:
            std_df['本科专业'] = df['专业']
        else:
            std_df['本科专业'] = ""
            
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
        
        # 触发静态数据导出
        try:
            from export_static import export_all
            export_all()
        except Exception as e:
            print(f"Warning: Static export failed: {e}")
            
        return {"status": "success", "message": "职位表上传并入库成功，静态数据已更新", "stats": stats}
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
        
        # 触发静态数据导出
        try:
            from export_static import export_all
            export_all()
        except Exception as e:
            print(f"Warning: Static export failed: {e}")

        return {"status": "success", "message": f"{report_date} 报名数据上传并入库成功，静态数据已更新", "stats": stats}
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
    target: Optional[str] = None,
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
            target=target,
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
            'applicants': '报名人数',
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
            'education': '学历',
            'degree': '学位',
            'major_pg': '研究生专业',
            'major_ug': '本科专业',
            'target': '招录对象',
            'notes': '备注',
            'intro': '职位简介',
            'applicants': '报名人数',
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


@app.post("/positions/by-codes")
async def get_positions_by_codes(codes: List[str]):
    """根据职位代码列表查询职位详情 (从数据库查询)"""
    # 去重
    unique_codes = list(set(codes))
    if not unique_codes:
        return {"data": [], "total": 0, "not_found": [], "latest_date": None}
    
    try:
        df, total, actual_date = db_get_positions_by_codes(unique_codes)
        
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
            'applicants': '报名人数',
            'passed': '审核通过人数',
            'competition_ratio': '竞争比'
        })
        
        # 找出未找到的职位代码
        found_codes = set(df['code'].tolist())
        not_found = [c for c in unique_codes if c not in found_codes]
        
        return {
            "data": result_df.fillna("").to_dict(orient='records'),
            "total": total,
            "not_found": not_found,
            "latest_date": actual_date
        }
    except Exception as e:
        return {"data": [], "total": 0, "not_found": unique_codes, "message": f"查询失败: {str(e)}"}


@app.post("/positions/trend-by-codes")
async def get_trend_by_codes(codes: List[str]):
    """获取指定职位代码列表的多日报名趋势数据"""
    unique_codes = list(set(codes))
    if not unique_codes:
        return {"positions": [], "dates": []}
    
    conn = get_db_connection()
    
    # 1. Get position names
    placeholders = ',' .join(['?'] * len(unique_codes))
    query_pos = f"SELECT code, name FROM positions WHERE code IN ({placeholders})"
    df_pos = pd.read_sql_query(query_pos, conn, params=unique_codes)
    pos_map = dict(zip(df_pos['code'], df_pos['name']))
    
    # 2. Get applications data
    # We need to make sure we query for these codes and group by date
    query_app = f"""
        SELECT code, date, applicants 
        FROM applications 
        WHERE code IN ({placeholders})
        ORDER BY date
    """
    df_app = pd.read_sql_query(query_app, conn, params=unique_codes)
    conn.close()
    
    if df_app.empty:
         return {"positions": [], "dates": [], "message": "暂无报名数据"}
    
    # 3. Process data
    # Get all unique dates from the result
    all_dates = sorted(df_app['date'].unique())
    
    result = []
    
    # Pivot the dataframe to get dates as generic index or similar structure
    # Alternatively, just iterate. Pivot is cleaner.
    if not df_app.empty:
        pivot_df = df_app.pivot(index='date', columns='code', values='applicants').fillna(0).astype(int)
        # Ensure all dates are present in the index (in case some days have NO data for ANY of the requested codes?? Unlikely if dates come from df_app itself)
        # But we want to make sure the order is correct
        pivot_df = pivot_df.reindex(all_dates, fill_value=0)
        
        for code in unique_codes:
            if code in pivot_df.columns:
                data_list = pivot_df[code].tolist()
            else:
                data_list = [0] * len(all_dates)
                
            result.append({
                "code": code,
                "name": pos_map.get(code, code),
                "data": data_list
            })
    else:
        # Should be covered by df_app.empty check above, but safe fallback
        for code in unique_codes:
            result.append({
                "code": code,
                "name": pos_map.get(code, code),
                "data": []
            })

    # 按最新数据排序（最热门的在前）
    result.sort(key=lambda x: x['data'][-1] if x['data'] else 0, reverse=True)
    
    return {
        "positions": result,
        "dates": all_dates
    }


@app.get("/stats/trend")
async def get_trend(
    position_code: Optional[str] = None,
    city: Optional[str] = None
):
    """获取报名趋势数据"""
    conn = get_db_connection()
    
    if position_code:
        # Single position trend
        query = """
        SELECT date, applicants, passed
        FROM applications
        WHERE code = ?
        ORDER BY date
        """
        df = pd.read_sql_query(query, conn, params=[str(position_code)])
        
    elif city:
        # City trend (sum of all positions in city)
        # Verify join efficiency; if slow, might need optimization, but dataset is small (~5k positions)
        query = """
        SELECT a.date, 
               SUM(a.applicants) as applicants, 
               SUM(a.passed) as passed
        FROM applications a
        JOIN positions p ON a.code = p.code
        WHERE p.city LIKE ?
        GROUP BY a.date
        ORDER BY a.date
        """
        df = pd.read_sql_query(query, conn, params=[f"%{city}%"])
        
    else:
        # Global trend
        query = """
        SELECT date, 
               SUM(applicants) as applicants, 
               SUM(passed) as passed
        FROM applications
        GROUP BY date
        ORDER BY date
        """
        df = pd.read_sql_query(query, conn)
        
    conn.close()
    
    return {"data": df.fillna(0).to_dict(orient='records')}


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
        'major_pg': '研究生专业',
        'major_ug': '本科专业',
        'target': '招录对象',
        'notes': '备注',
        'intro': '职位简介',
        'applicants': '报名人数',
        'passed': '审核通过人数',
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
        'major_pg': '研究生专业',
        'major_ug': '本科专业',
        'target': '招录对象',
        'notes': '备注',
        'intro': '职位简介',
        'applicants': '报名人数',
        'passed': '审核通过人数',
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
    # 优先使用 CITY_DISTRICT_MAP 中的标准城市列表
    cities = ["省直"] + sorted(list(CITY_DISTRICT_MAP.keys()))
    
    # 学历和学位信息可以从数据库中动态获取，或者保持读取 Excel (如果数据库没初始化)
    education = []
    degree = []
    targets = []
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取所有学历
        cursor.execute("SELECT DISTINCT education FROM positions WHERE education != '' AND education IS NOT NULL")
        education = sorted([row[0] for row in cursor.fetchall()])
        
        # 获取所有学位
        cursor.execute("SELECT DISTINCT degree FROM positions WHERE degree != '' AND degree IS NOT NULL")
        degree = sorted([row[0] for row in cursor.fetchall()])

        # 获取所有招录对象
        cursor.execute("SELECT DISTINCT target FROM positions WHERE target != '' AND target IS NOT NULL")
        targets = sorted([row[0] for row in cursor.fetchall()])
        
        conn.close()
    except Exception as e:
        print(f"Error fetching filters from DB: {e}")
        # 保底方案：如果数据库有问题且 Excel 存在，从 Excel 读取
        if os.path.exists(POSITION_FILE):
             df = pd.read_excel(POSITION_FILE)
             if '学历' in df.columns:
                 education = sorted([e for e in df['学历'].dropna().unique().tolist() if e])
             if '学位' in df.columns:
                 degree = sorted([d for d in df['学位'].dropna().unique().tolist() if d])
             if '招录对象' in df.columns:
                 targets = sorted([t for t in df['招录对象'].dropna().unique().tolist() if t])

    return {
        "cities": cities,
        "education": education,
        "degree": degree,
        "targets": targets
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
