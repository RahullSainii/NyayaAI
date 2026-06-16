import asyncio
import sys
import logging
from backend.retriever import retrieve

logging.basicConfig(level=logging.DEBUG)

async def main():
    try:
        res = await retrieve("is cheating a bailable offense?", "ALL")
        print("Success!", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Windows fix for Asyncio ProactorEventLoop issues sometimes
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
