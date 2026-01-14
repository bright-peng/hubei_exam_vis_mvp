import pandas as pd
import os
from main import standardize_position_df, standardize_daily_df
from database import init_db, save_positions, save_applications

DATA_DIR = "data"
POSITION_FILE = os.path.join(DATA_DIR, "positions.xlsx")
DAILY_DIR = os.path.join(DATA_DIR, "daily")

def run_import():
    init_db()
    
    # 1. Import positions
    if os.path.exists(POSITION_FILE):
        print(f"Importing positions from {POSITION_FILE}...")
        df = pd.read_excel(POSITION_FILE, dtype=str)
        std_df = standardize_position_df(df)
        save_positions(std_df)
        print("Positions imported.")
    
    # 2. Import daily data
    if os.path.exists(DAILY_DIR):
        files = [f for f in os.listdir(DAILY_DIR) if f.endswith('.xlsx')]
        for f in sorted(files):
            report_date = f.replace('.xlsx', '')
            print(f"Importing daily data for {report_date}...")
            df = pd.read_excel(os.path.join(DAILY_DIR, f), dtype=str)
            std_df = standardize_daily_df(df)
            save_applications(std_df, report_date)
            print(f"Daily data for {report_date} imported.")

if __name__ == "__main__":
    run_import()
