import asyncio
from fastapi import APIRouter
from services import cache

router = APIRouter(prefix="/api/adr", tags=["adr"])

async def _calc_adr(market: str) -> dict | None:
    def _fetch():
        import FinanceDataReader as fdr
        df = fdr.StockListing(market)
        if df.empty or "ChagesRatio" not in df.columns: return None
        if "Close" in df.columns: df = df[df["Close"] > 0]
        if "Code" in df.columns: df = df[df["Code"].astype(str).str.isdigit()]
        cr = df["ChagesRatio"].fillna(0)
        up = int((cr > 0).sum()); down = int((cr < 0).sum()); flat = int((cr == 0).sum())
        return {"up": up, "down": down, "flat": flat, "total": up+down+flat,
                "adr": round(up/down*100, 1) if down > 0 else None}
    try:
        loop = asyncio.get_event_loop()
        return await asyncio.wait_for(loop.run_in_executor(None, _fetch), timeout=12.0)
    except Exception: return None

@router.get("")
async def get_adr():
    cached = cache.get("adr_data")
    if cached: return cached
    kospi, kosdaq = await asyncio.gather(_calc_adr("KOSPI"), _calc_adr("KOSDAQ"), return_exceptions=True)
    result = {"kospi": kospi if isinstance(kospi, dict) else None,
              "kosdaq": kosdaq if isinstance(kosdaq, dict) else None}
    cache.set("adr_data", result, ttl=300)
    return result
