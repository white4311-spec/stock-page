import asyncio
from services import cache


def _load_listing() -> list[dict]:
    cached = cache.get("krx_listing")
    if cached: return cached
    try:
        import FinanceDataReader as fdr
        df = fdr.StockListing("KRX")
        rows = [{"ticker": str(row.get("Code", row.get("Symbol", ""))).zfill(6),
                 "name": str(row.get("Name", "")), "market": str(row.get("Market", "")),
                 "type": "stock"} for _, row in df.iterrows()]
        cache.set("krx_listing", rows, ttl=86400)
        return rows
    except Exception:
        return []


def search_local(query: str, limit: int = 10) -> list[dict]:
    listing = _load_listing()
    q = query.strip().lower()
    results = []
    for s in listing:
        if s["ticker"] == q or s["ticker"] == q.zfill(6): results.append(s)
    for s in listing:
        if q in s["name"].lower() and s not in results: results.append(s)
        if len(results) >= limit: break
    return results[:limit]
