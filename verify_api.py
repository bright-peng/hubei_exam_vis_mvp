
import asyncio
import pandas as pd
from backend.main import get_trend_by_codes, get_trend
from backend.database import get_db_connection

# Mocking the app context isn't strictly necessary if we just import the functions 
# and the DB connection works (which uses a relative path from database.py).
# However, we need to ensure the DB path is correct relative to where we run the script.
# backend/database.py defines DB_PATH relative to __file__, so it should work as long as 
# we run this script from the project root or adjust paths.

async def verify_trend_by_codes():
    print("\n--- Testing get_trend_by_codes ---")
    # Use some codes known to be in the DB (from previous check_db.py)
    codes = ['14230201003000001', '14230201003000002'] 
    result = await get_trend_by_codes(codes)
    
    print("Dates:", result.get('dates'))
    print("Positions count:", len(result.get('positions', [])))
    if result.get('positions'):
        print("First position data:", result['positions'][0])
        
    if len(result.get('dates', [])) > 0:
        print("SUCCESS: Dates returned.")
    else:
        print("FAILURE: No dates returned.")

async def verify_trend():
    print("\n--- Testing get_trend (Global) ---")
    result = await get_trend()
    data = result.get('data', [])
    print(f"Data points: {len(data)}")
    if len(data) > 0:
        print("First data point:", data[0])
        print("SUCCESS: Global trend data returned.")
    else:
        print("FAILURE: No global trend data.")

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(verify_trend_by_codes())
    loop.run_until_complete(verify_trend())
    loop.close()
