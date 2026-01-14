import pandas as pd
import os

data_dir = "data"
pos_file = os.path.join(data_dir, "positions.xlsx")
daily_file = os.path.join(data_dir, "daily/2026-01-13.xlsx")

if os.path.exists(pos_file):
    df_pos = pd.read_excel(pos_file)
    print("Positions sample:")
    print(df_pos[['职位代码', '招录机关', '职位名称']].head())
    print("Position Code Type:", df_pos['职位代码'].dtype)
    print("Cities found:", df_pos['城市'].unique()[:5] if '城市' in df_pos.columns else "No City Col")

if os.path.exists(daily_file):
    df_daily = pd.read_excel(daily_file)
    print("\nDaily sample:")
    print(df_daily[['职位代码', '报名人数']].head())
    print("Daily Code Type:", df_daily['职位代码'].dtype)

if os.path.exists(pos_file) and os.path.exists(daily_file):
    # Try merging
    df_pos['职位代码'] = df_pos['职位代码'].astype(str)
    df_daily['职位代码'] = df_daily['职位代码'].astype(str)
    merged = df_pos.merge(df_daily, on='职位代码', how='inner')
    print("\nMerged rows count:", len(merged))
