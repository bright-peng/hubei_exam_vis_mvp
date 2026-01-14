import requests
from bs4 import BeautifulSoup
import os
import re
import pandas as pd
from datetime import datetime
import time
from main import standardize_daily_df, save_applications
from export_static import export_all

# 配置
BASE_URL = "https://rst.hubei.gov.cn/hbrsksw/zlplks/jglyks/hbsgwyks/zytz/"
DOWNLOAD_DIR = "backend/data/daily"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def get_latest_excel_link():
    """获取最新的报名人数统计表链接"""
    try:
        print(f"正在访问首页: {BASE_URL}")
        headers = {"User-Agent": USER_AGENT}
        response = requests.get(BASE_URL, headers=headers, timeout=10)
        response.encoding = 'utf-8' # 或者是 'gbk', 根据实际情况调整
        
        if response.status_code != 200:
            print(f"访问失败，状态码: {response.status_code}")
            return None

        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找所有包含 "报名人数统计表" 的链接
        # 这是一个简单的查找逻辑，可能需要根据实际网页结构调整
        links = soup.find_all('a', href=True)
        
        target_link = None
        latest_date = None
        target_title = None

        print("正在搜索包含 '报名人数统计表' 的链接...")
        for link in links:
            title = link.get_text().strip()
            href = link['href']
            
            if "报名人数统计表" in title:
                print(f"找到潜在链接: {title} -> {href}")
                # 尝试从标题提取日期 (例如: 2026.1.13)
                date_match = re.search(r'(\d{4})\.(\d{1,2})\.(\d{1,2})', title)
                if date_match:
                    year, month, day = date_match.groups()
                    current_date_obj = datetime(int(year), int(month), int(day))
                    
                    # 寻找最新的日期
                    if latest_date is None or current_date_obj > latest_date:
                        latest_date = current_date_obj
                        target_link = href
                        target_title = title
        
        if target_link:
            # 补全相对路径
            if not target_link.startswith('http'):
                # 注意：这里可能需要处理 ../ 或者是 ./ 的情况
                # 简单拼接，假设是在当前目录下
                 # 有时候 href 是 ./202601/P...，有时候是 202601/P...
                if target_link.startswith('./'):
                    target_link = BASE_URL + target_link[2:]
                else:
                    target_link = BASE_URL + target_link
            
            print(f"锁定最新文件: {target_title}")
            print(f"下载链接: {target_link}")
            return target_link, target_title, latest_date
        else:
            print("未找到任何符合条件的统计表链接。")
            return None, None, None

    except Exception as e:
        print(f"获取链接时出错: {e}")
        return None, None, None

def download_and_process(url, title, date_obj):
    """下载 Excel 并处理"""
    if not url: return

    try:
        # 1. 访问具体的新闻页面（如果 Excel 链接是在新闻详情页里，需要多一步）
        # 观察用户提供的直接链接是 .xlsx，说明可能是在列表页直接链接了文件，或者需要进详情页找附件。
        # 如果首页链接直接是 xlsx，可以直接下载。
        # 如果首页链接是 html (新闻详情)，则需要点进去再找 xlsx。
        
        final_xlsx_url = url
        
        if url.endswith('.html') or url.endswith('.htm'):
            print(f"进入详情页查找附件: {url}")
            headers = {"User-Agent": USER_AGENT}
            resp = requests.get(url, headers=headers)
            resp.encoding = 'utf-8'
            soup = BeautifulSoup(resp.text, 'html.parser')
            # 找附件链接
            # 通常是在 <a href="...xlsx">
            att_links = soup.find_all('a', href=re.compile(r'\.xlsx$', re.I))
            if att_links:
                att_href = att_links[0]['href']
                # 补全附件链接
                # 注意：详情页里的相对路径是相对于详情页 URL 的
                if not att_href.startswith('http'):
                    # 获取详情页的 base url (去掉文件名)
                    page_base = url.rsplit('/', 1)[0] + '/'
                    # 处理 ./
                    if att_href.startswith('./'):
                        final_xlsx_url = page_base + att_href[2:]
                    else:
                        final_xlsx_url = page_base + att_href
                else:
                    final_xlsx_url = att_href
                print(f"找到附件链接: {final_xlsx_url}")
            else:
                print("详情页未找到 xlsx 附件。")
                return

        # 2. 下载文件
        print(f"开始下载: {final_xlsx_url}")
        file_resp = requests.get(final_xlsx_url, headers={"User-Agent": USER_AGENT})
        
        if file_resp.status_code == 200:
            # 格式化日期为 YYYY-MM-DD
            date_str = date_obj.strftime('%Y-%m-%d')
            filename = f"{date_str}.xlsx"
            save_path = os.path.join(DOWNLOAD_DIR, filename)
            
            # 确保目录存在
            os.makedirs(DOWNLOAD_DIR, exist_ok=True)
            
            with open(save_path, 'wb') as f:
                f.write(file_resp.content)
            print(f"文件已保存至: {save_path}")
            
            # 3. 处理数据 (复用 main.py 的逻辑)
            print("正在处理数据并存入数据库...")
            df = pd.read_excel(save_path, dtype=str)
            std_df = standardize_daily_df(df)
            save_applications(std_df, date_str)
            print("数据库更新成功！")
            
            # 4. 触发静态导出
            print("正在更新静态 JSON 数据...")
            if export_all():
                print("所有步骤完成！你可以提交代码并 push 到 GitHub 了。")
            else:
                print("静态导出失败。")
                
        else:
            print(f"下载失败，状态码: {file_resp.status_code}")

    except Exception as e:
        print(f"下载处理过程中出错: {e}")

if __name__ == "__main__":
    # 为了让脚本能运行，需要把根目录加入 sys.path 或者把脚本放在根目录下运行
    # 这里假设用户在根目录下运行： python backend/crawler.py
    import sys
    sys.path.append(os.getcwd())
    
    link, title, date_val = get_latest_excel_link()
    if link:
        # 检查是否已经下载过（可选，这里强制更新）
        download_and_process(link, title, date_val)
    else:
        print("没有可处理的任务。")
