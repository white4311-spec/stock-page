"""Yahoo Finance 직접 호출 — yfinance SSL 문제 우회"""
import httpx
from services import cache

_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "application/json"}
_YF_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=5d&interval=1d"


def _fetch(ticker: str, ttl: int = 30) -> dict:
    key = f"yf_{ticker}"
    cached = cache.get(key)
    if cached: return cached
    url = _YF_URL.format(ticker=ticker)
    with httpx.Client(verify=False, timeout=10, headers=_HEADERS) as client:
        r = client.get(url); r.raise_for_status(); data = r.json()
    result_data = data["chart"]["result"][0]
    closes = [c for c in result_data["indicators"]["quote"][0]["close"] if c is not None]
    price = round(closes[-1], 4); prev_close = round(closes[-2], 4) if len(closes) > 1 else price
    result = {"price": price, "prev_close": prev_close,
              "change": round(price - prev_close, 4),
              "change_pct": round((price - prev_close) / prev_close * 100 if prev_close else 0, 2)}
    cache.set(key, result, ttl)
    return result


async def _afetch(ticker: str, ttl: int = 30) -> dict:
    key = f"yf_{ticker}"
    cached = cache.get(key)
    if cached: return cached
    url = _YF_URL.format(ticker=ticker)
    async with httpx.AsyncClient(verify=False, timeout=10, headers=_HEADERS) as client:
        r = await client.get(url); r.raise_for_status(); data = r.json()
    result_data = data["chart"]["result"][0]
    closes = [c for c in result_data["indicators"]["quote"][0]["close"] if c is not None]
    price = round(closes[-1], 4); prev_close = round(closes[-2], 4) if len(closes) > 1 else price
    result = {"price": price, "prev_close": prev_close,
              "change": round(price - prev_close, 4),
              "change_pct": round((price - prev_close) / prev_close * 100 if prev_close else 0, 2)}
    cache.set(key, result, ttl)
    return result


async def get_kospi_yf() -> dict:
    d = await _afetch("^KS11", ttl=60); return {"name": "KOSPI", "source": "yfinance", **d}

async def get_kosdaq_yf() -> dict:
    d = await _afetch("^KQ11", ttl=60); return {"name": "KOSDAQ", "source": "yfinance", **d}

async def get_sp500() -> dict:
    d = await _afetch("^GSPC", ttl=60); return {"name": "S&P500", **d}

async def get_nasdaq() -> dict:
    d = await _afetch("^IXIC", ttl=60); return {"name": "NASDAQ", **d}

async def get_dow() -> dict:
    d = await _afetch("^DJI", ttl=60); return {"name": "DJI", **d}


FOREX_MAP = {"USD/KRW": "USDKRW=X", "JPY/KRW": "JPYKRW=X", "EUR/KRW": "EURKRW=X", "CNY/KRW": "CNYKRW=X"}

async def get_forex() -> list[dict]:
    results = []
    for label, ticker in FOREX_MAP.items():
        try: d = await _afetch(ticker, ttl=30); results.append({"pair": label, **d})
        except Exception as e: results.append({"pair": label, "price": 0, "change": 0, "change_pct": 0, "error": str(e)})
    return results


async def _fetch_jp10y() -> dict:
    import os
    key = "yf_JP10Y"
    cached = cache.get(key)
    if cached: return cached
    manual = os.getenv("JP_10Y_YIELD", "")
    if manual:
        try:
            price = float(manual)
            result = {"price": price, "change": 0.0, "change_pct": 0.0, "source": "manual"}
            cache.set(key, result, ttl=3600); return result
        except ValueError: pass
    return {"price": 0, "change": 0, "change_pct": 0, "note": "실시간 미지원 (.env JP_10Y_YIELD 설정 필요)"}


async def get_bond_yields() -> list[dict]:
    yields = []
    try: us = await _afetch("^TNX", ttl=60); yields.append({"name": "미국 10Y", "country": "US", **us})
    except Exception as e: yields.append({"name": "미국 10Y", "country": "US", "price": 0, "error": str(e)})
    jp = await _fetch_jp10y()
    yields.append({"name": "일본 10Y", "country": "JP", **jp})
    return yields


PERIOD_INTERVAL_MAP = {"1m": ("1mo","1d"), "3m": ("3mo","1d"), "6m": ("6mo","1d"), "1y": ("1y","1d"), "5y": ("5y","1wk")}

async def get_yf_chart(ticker: str, period: str = "3mo", interval: str = "1d") -> list[dict]:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range={period}&interval={interval}"
    async with httpx.AsyncClient(verify=False, timeout=15, headers=_HEADERS) as client:
        r = await client.get(url); r.raise_for_status(); data = r.json()
    result_data = data["chart"]["result"][0]
    timestamps = result_data.get("timestamp", [])
    quotes = result_data["indicators"]["quote"][0]
    from datetime import datetime
    candles = []
    for i, ts in enumerate(timestamps):
        o, h, l, c, v = quotes["open"][i], quotes["high"][i], quotes["low"][i], quotes["close"][i], quotes["volume"][i]
        if None in (o, h, l, c): continue
        candles.append({"date": datetime.fromtimestamp(ts).strftime("%Y%m%d"),
                        "open": round(float(o), 4), "high": round(float(h), 4),
                        "low": round(float(l), 4), "close": round(float(c), 4),
                        "volume": int(v) if v else 0})
    return candles
