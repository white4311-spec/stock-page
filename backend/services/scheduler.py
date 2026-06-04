import asyncio
from datetime import datetime, timedelta, timezone


async def collect_daily(ticker: str, market: str):
    try:
        from services.database import save_chart
        loop = asyncio.get_event_loop()
        def _fetch():
            import FinanceDataReader as fdr
            end = datetime.now(); start = end - timedelta(days=5)
            df = fdr.DataReader(ticker, start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
            if df.empty: return []
            rows = []
            for _, row in df.reset_index().iterrows():
                dt = row.get("Date", row.get("date"))
                if dt is None: continue
                date_str = dt.strftime("%Y%m%d") if hasattr(dt, "strftime") else str(dt)[:10].replace("-", "")
                rows.append({"date": date_str, "open": int(row.get("Open", 0)),
                             "high": int(row.get("High", 0)), "low": int(row.get("Low", 0)),
                             "close": int(row.get("Close", 0)), "volume": int(row.get("Volume", 0))})
            return rows
        data = await loop.run_in_executor(None, _fetch)
        await save_chart(ticker, data, market)
        return len(data)
    except Exception as e:
        print(f"[scheduler] {ticker} 수집 실패: {e}")
        return 0


async def daily_job():
    from services.database import get_tracked
    tickers = await get_tracked(days=30)
    if not tickers: print("[scheduler] 수집 대상 종목 없음"); return
    print(f"[scheduler] {len(tickers)}개 종목 데이터 수집 시작")
    total = 0
    for ticker, market in tickers:
        if market != "KR": continue
        total += await collect_daily(ticker, market)
        await asyncio.sleep(0.2)
    print(f"[scheduler] 완료: {len(tickers)}개 종목, {total}개 레코드 갱신")


def start_scheduler():
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(daily_job, CronTrigger(hour=7, minute=30, timezone="UTC"))
    scheduler.start()
    print("[scheduler] 일일 데이터 수집 스케줄러 시작 (매일 16:30 KST)")
    return scheduler
