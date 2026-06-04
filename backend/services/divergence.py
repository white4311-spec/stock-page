import asyncio
from datetime import datetime, timedelta
from services import cache

_STATUS_KEY = "divergence_status"
_RESULT_KEY = "divergence_result"
_ANALYSIS_LOCK = asyncio.Lock()


def _calc_rsi(closes: list[float], period: int = 14) -> list[float]:
    if len(closes) < period + 2: return [50.0] * len(closes)
    gains, losses = [], []
    for i in range(1, len(closes)):
        d = closes[i] - closes[i - 1]
        gains.append(max(d, 0.0)); losses.append(max(-d, 0.0))
    avg_g = sum(gains[:period]) / period; avg_l = sum(losses[:period]) / period
    rsi = [50.0] * period
    for i in range(period, len(gains)):
        avg_g = (avg_g * (period - 1) + gains[i]) / period
        avg_l = (avg_l * (period - 1) + losses[i]) / period
        rs = avg_g / (avg_l or 1e-9)
        rsi.append(round(100 - 100 / (1 + rs), 2))
    rsi.append(rsi[-1])
    return rsi


def _find_troughs(data: list[float], min_dist: int = 6) -> list[int]:
    troughs = []
    for i in range(min_dist, len(data) - min_dist):
        if data[i] == min(data[i - min_dist: i + min_dist + 1]):
            if not troughs or (i - troughs[-1]) >= min_dist: troughs.append(i)
    return troughs


def _find_peaks(data: list[float], min_dist: int = 6) -> list[int]:
    peaks = []
    for i in range(min_dist, len(data) - min_dist):
        if data[i] == max(data[i - min_dist: i + min_dist + 1]):
            if not peaks or (i - peaks[-1]) >= min_dist: peaks.append(i)
    return peaks


def _detect(closes: list[float], dates: list[str], volumes: list[float]) -> dict | None:
    if len(closes) < 40: return None
    rsi = _calc_rsi(closes)
    lookback = min(60, len(closes))
    c = closes[-lookback:]; r = rsi[-lookback:]; d = dates[-lookback:]; v = volumes[-lookback:]

    troughs = _find_troughs(c); bullish = None
    if len(troughs) >= 2:
        i1, i2 = troughs[-2], troughs[-1]
        p1, p2 = c[i1], c[i2]; r1, r2 = r[i1], r[i2]; v1, v2 = v[i1], v[i2]
        if (p2 < p1 * 0.98 and r2 > r1 + 3.0 and r1 < 30 and r2 >= 30 and v2 > v1 and (i2 - i1) >= 8):
            price_drop = (p1 - p2) / p1 * 100; rsi_recovery = r2 - r1
            recency = i2 / lookback * 40; rsi_bonus = max(0.0, (30 - r1) * 1.5)
            vol_bonus = min(10.0, (v2 / v1 - 1) * 10) if v1 > 0 else 0
            score = min(100, rsi_recovery * 3 + price_drop + recency + rsi_bonus + vol_bonus)
            if score >= 35:
                bullish = {"type": "bullish", "score": round(score), "date1": d[i1], "date2": d[i2],
                           "price1": round(p1), "price2": round(p2), "rsi1": round(r1, 1), "rsi2": round(r2, 1),
                           "current_price": round(c[-1]),
                           "change_pct": round((c[-1] - c[-2]) / c[-2] * 100 if c[-2] else 0, 2)}

    peaks = _find_peaks(c); bearish = None
    if len(peaks) >= 2:
        i1, i2 = peaks[-2], peaks[-1]
        p1, p2 = c[i1], c[i2]; r1, r2 = r[i1], r[i2]
        if p2 > p1 * 1.02 and r2 < r1 - 3.0 and r2 > 45 and (i2 - i1) >= 8:
            price_rise = (p2 - p1) / p1 * 100; rsi_decline = r1 - r2
            recency = i2 / lookback * 40; rsi_bonus = max(0.0, (r2 - 60) * 1.5)
            score = min(100, rsi_decline * 3 + price_rise + recency + rsi_bonus)
            if score >= 35:
                bearish = {"type": "bearish", "score": round(score), "date1": d[i1], "date2": d[i2],
                           "price1": round(p1), "price2": round(p2), "rsi1": round(r1, 1), "rsi2": round(r2, 1),
                           "current_price": round(c[-1]),
                           "change_pct": round((c[-1] - c[-2]) / c[-2] * 100 if c[-2] else 0, 2)}

    if bullish and bearish: return bullish if bullish["score"] >= bearish["score"] else bearish
    return bullish or bearish


async def _analyze_one(ticker: str, name: str, market: str, start: str, sem: asyncio.Semaphore) -> dict | None:
    async with sem:
        def _fetch():
            import FinanceDataReader as fdr
            return fdr.DataReader(ticker, start)
        try:
            loop = asyncio.get_event_loop()
            df = await asyncio.wait_for(loop.run_in_executor(None, _fetch), timeout=8.0)
            if df is None or df.empty or len(df) < 35: return None
            rows = [(float(row["Close"]), row.name.strftime("%Y%m%d"), float(row.get("Volume", 0) or 0))
                    for _, row in df.iterrows() if row.get("Close") and float(row["Close"]) > 0]
            if len(rows) < 35: return None
            closes = [r[0] for r in rows]; dates = [r[1] for r in rows]; volumes = [r[2] for r in rows]
            sig = _detect(closes, dates, volumes)
            if sig is None: return None
            return {"ticker": ticker, "name": name, "market": market, **sig}
        except Exception:
            return None


async def run_analysis():
    async with _ANALYSIS_LOCK:
        if cache.get(_STATUS_KEY) == "running": return
        cache.set(_STATUS_KEY, "running", ttl=600)
    try:
        import FinanceDataReader as fdr
        start = (datetime.now() - timedelta(days=100)).strftime("%Y-%m-%d")
        def _get_stocks():
            return fdr.StockListing("KOSPI"), fdr.StockListing("KOSDAQ")
        loop = asyncio.get_event_loop()
        kospi_df, kosdaq_df = await loop.run_in_executor(None, _get_stocks)
        def _pick(df, mkt, n):
            if "Marcap" not in df.columns: return []
            df = df[df["Marcap"] > 0].sort_values("Marcap", ascending=False)
            rows = []
            for _, row in df.iterrows():
                code = str(row.get("Code", "")).strip(); name = str(row.get("Name", code))
                price = int(row.get("Close", 0) or 0)
                if not code or not code.isdigit() or price < 500: continue
                nu = name.upper()
                if any(nu.startswith(p) for p in ("KODEX","TIGER","KINDEX","ARIRANG","KOSEF","HANARO","TREX","SOL","ACE","RISE","KBSTAR")): continue
                rows.append((code, name, mkt))
                if len(rows) >= n: break
            return rows
        stocks = _pick(kospi_df, "KOSPI", 250) + _pick(kosdaq_df, "KOSDAQ", 200)
        sem = asyncio.Semaphore(15)
        results = await asyncio.gather(*[_analyze_one(t, n, m, start, sem) for t, n, m in stocks], return_exceptions=True)
        bullish = [r for r in results if isinstance(r, dict) and r.get("type") == "bullish"]
        bearish = [r for r in results if isinstance(r, dict) and r.get("type") == "bearish"]
        bullish.sort(key=lambda x: x["score"], reverse=True)
        bearish.sort(key=lambda x: x["score"], reverse=True)
        result = {"updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"), "total": len(stocks),
                  "bullish": bullish[:20], "bearish": bearish[:20]}
        cache.set(_RESULT_KEY, result, ttl=7200); cache.set(_STATUS_KEY, "done", ttl=7200)
    except Exception as e:
        print(f"[divergence] 분석 오류: {e}"); cache.set(_STATUS_KEY, "idle", ttl=60)


def get_status() -> str: return cache.get(_STATUS_KEY) or "idle"
def get_result() -> dict | None: return cache.get(_RESULT_KEY)


_US_STATUS_KEY = "divergence_us_status"
_US_RESULT_KEY = "divergence_us_result"
_US_ANALYSIS_LOCK = asyncio.Lock()


async def run_us_analysis():
    async with _US_ANALYSIS_LOCK:
        if cache.get(_US_STATUS_KEY) == "running": return
        cache.set(_US_STATUS_KEY, "running", ttl=600)
    try:
        import FinanceDataReader as fdr
        start = (datetime.now() - timedelta(days=100)).strftime("%Y-%m-%d")
        loop = asyncio.get_event_loop()
        sp500_df = await loop.run_in_executor(None, lambda: fdr.StockListing("S&P500"))
        def _pick_us(df, n):
            cap_col = next((c for c in df.columns if c.lower() in ("marketcap", "market_cap")), None)
            if cap_col: df = df[df[cap_col] > 0].sort_values(cap_col, ascending=False)
            rows = []
            for _, row in df.iterrows():
                ticker = str(row.get("Symbol", row.get("Code", ""))).strip()
                name = str(row.get("Name", ticker))
                if not ticker or len(ticker) > 5 or not ticker.isalpha(): continue
                rows.append((ticker, name, "US"))
                if len(rows) >= n: break
            return rows
        stocks = _pick_us(sp500_df, 150)
        sem = asyncio.Semaphore(8)
        results = await asyncio.gather(*[_analyze_one(t, n, m, start, sem) for t, n, m in stocks], return_exceptions=True)
        bullish = [r for r in results if isinstance(r, dict) and r.get("type") == "bullish"]
        bearish = [r for r in results if isinstance(r, dict) and r.get("type") == "bearish"]
        bullish.sort(key=lambda x: x["score"], reverse=True)
        bearish.sort(key=lambda x: x["score"], reverse=True)
        result = {"updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"), "total": len(stocks),
                  "bullish": bullish[:20], "bearish": bearish[:20]}
        cache.set(_US_RESULT_KEY, result, ttl=7200); cache.set(_US_STATUS_KEY, "done", ttl=7200)
    except Exception as e:
        print(f"[divergence-us] 분석 오류: {e}"); cache.set(_US_STATUS_KEY, "idle", ttl=60)


def get_us_status() -> str: return cache.get(_US_STATUS_KEY) or "idle"
def get_us_result() -> dict | None: return cache.get(_US_RESULT_KEY)
