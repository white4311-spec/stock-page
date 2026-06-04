import asyncio
import httpx
from config import COINGECKO_BASE_URL
from services import cache

COIN_IDS = {"BTC": "bitcoin", "ETH": "ethereum", "XRP": "ripple"}


async def get_prices(vs_currency: str = "krw") -> list[dict]:
    cache_key = f"cg_prices_{vs_currency}"
    cached = cache.get(cache_key)
    if cached: return cached
    ids = ",".join(COIN_IDS.values())
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(f"{COINGECKO_BASE_URL}/coins/markets",
            params={"vs_currency": vs_currency, "ids": ids, "order": "market_cap_desc",
                    "sparkline": "false", "price_change_percentage": "24h"})
        res.raise_for_status(); data = res.json()
    symbol_map = {v: k for k, v in COIN_IDS.items()}
    results = [{"symbol": symbol_map.get(item["id"], item["symbol"].upper()), "name": item["name"],
                "price": item.get("current_price", 0), "change": item.get("price_change_24h", 0),
                "change_pct": item.get("price_change_percentage_24h", 0),
                "market_cap": item.get("market_cap", 0), "volume_24h": item.get("total_volume", 0),
                "image": item.get("image", ""), "currency": vs_currency.upper()} for item in data]
    cache.set(cache_key, results, ttl=30)
    return results


async def search_crypto(query: str) -> list[dict]:
    cache_key = f"cg_search_{query}"
    cached = cache.get(cache_key)
    if cached: return cached
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(f"{COINGECKO_BASE_URL}/search", params={"query": query})
        res.raise_for_status(); data = res.json()
    results = [{"symbol": coin.get("symbol", "").upper(), "name": coin.get("name", ""),
                "id": coin.get("id", ""), "thumb": coin.get("thumb", ""), "type": "crypto"}
               for coin in data.get("coins", [])[:10]]
    cache.set(cache_key, results, ttl=300)
    return results


async def get_coin_chart(coin_id: str, days: int = 90, vs_currency: str = "krw") -> list[dict]:
    cache_key = f"cg_chart_{coin_id}_{days}_{vs_currency}"
    cached = cache.get(cache_key)
    if cached: return cached
    async with httpx.AsyncClient(timeout=15) as client:
        ohlc_res, market_res = await asyncio.gather(
            client.get(f"{COINGECKO_BASE_URL}/coins/{coin_id}/ohlc",
                params={"vs_currency": vs_currency, "days": days}),
            client.get(f"{COINGECKO_BASE_URL}/coins/{coin_id}/market_chart",
                params={"vs_currency": vs_currency, "days": days}),
            return_exceptions=True)
    ohlc_data = ohlc_res.json() if not isinstance(ohlc_res, Exception) else []
    vol_map: dict[int, float] = {}
    if not isinstance(market_res, Exception):
        for ts_ms, vol in market_res.json().get("total_volumes", []):
            vol_map[int(ts_ms) // 86_400_000] = float(vol)
    candles = []
    for row in ohlc_data:
        if len(row) < 5: continue
        ts_ms, o, h, l, c = row[:5]
        candles.append({"date": str(int(ts_ms)), "open": o, "high": h, "low": l, "close": c,
                        "volume": vol_map.get(int(ts_ms) // 86_400_000, 0)})
    cache.set(cache_key, candles, ttl=300)
    return candles
