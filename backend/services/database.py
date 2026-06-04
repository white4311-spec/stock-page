import os
import aiosqlite
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "market.db")


async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS daily_prices (
                ticker  TEXT,
                date    TEXT,
                open    REAL,
                high    REAL,
                low     REAL,
                close   REAL,
                volume  INTEGER,
                market  TEXT DEFAULT 'KR',
                PRIMARY KEY (ticker, date)
            );
            CREATE INDEX IF NOT EXISTS idx_ticker ON daily_prices(ticker);

            CREATE TABLE IF NOT EXISTS tracked_tickers (
                ticker        TEXT PRIMARY KEY,
                market        TEXT DEFAULT 'KR',
                last_accessed TEXT
            );
        """)
        await db.commit()


async def get_chart(ticker: str, start_date: str, end_date: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT date, open, high, low, close, volume FROM daily_prices "
            "WHERE ticker=? AND date>=? AND date<=? ORDER BY date ASC",
            (ticker, start_date, end_date),
        ) as cur:
            rows = await cur.fetchall()
    return [{"date": r[0], "open": int(r[1]), "high": int(r[2]), "low": int(r[3]),
             "close": int(r[4]), "volume": int(r[5])} for r in rows]


async def save_chart(ticker: str, data: list[dict], market: str = "KR"):
    if not data:
        return
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executemany(
            "INSERT OR REPLACE INTO daily_prices (ticker, date, open, high, low, close, volume, market) "
            "VALUES (?,?,?,?,?,?,?,?)",
            [(ticker, r["date"], r["open"], r["high"], r["low"], r["close"], r["volume"], market) for r in data],
        )
        await db.commit()


async def track(ticker: str, market: str = "KR"):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO tracked_tickers (ticker, market, last_accessed) VALUES (?,?,?)",
            (ticker, market, now),
        )
        await db.commit()


async def get_tracked(days: int = 30) -> list[tuple[str, str]]:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT ticker, market FROM tracked_tickers "
            "WHERE last_accessed >= datetime('now', ?, 'utc') ORDER BY last_accessed DESC",
            (f"-{days} days",),
        ) as cur:
            return await cur.fetchall()


async def get_db_date_range(ticker: str) -> tuple[str, str]:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT MIN(date), MAX(date) FROM daily_prices WHERE ticker=?", (ticker,)
        ) as cur:
            row = await cur.fetchone()
    return (row[0] or "", row[1] or "") if row else ("", "")
