import asyncio
from fastapi import APIRouter
from services.market_data import _afetch
from services import cache

router = APIRouter(prefix="/api/reference", tags=["reference"])

COMMODITIES = [("Gold","GC=F"),("Oil(WTI)","CL=F"),("Silver","SI=F"),("DXY","DX-Y.NYB")]
ETFS = [("SPY","SPY"),("QQQ","QQQ"),("TLT","TLT"),("GLD","GLD"),("VIX","^VIX")]
SECTORS = [("가전/IT","XLK"),("금융","XLF"),("에너지","XLE"),("헬스케어","XLV"),("산업재","XLI"),("소재","XLB"),("필수소비","XLP"),("유틸리티","XLU")]

async def _fetch_safe(label: str, ticker: str, ttl: int = 60) -> dict:
    try: d = await _afetch(ticker, ttl=ttl); return {"label": label, "ticker": ticker, **d}
    except Exception: return {"label": label, "ticker": ticker, "price": 0, "change_pct": 0}

@router.get("")
async def get_reference():
    cached = cache.get("reference_all")
    if cached: return cached
    commodity_tasks = [_fetch_safe(l, t, 120) for l, t in COMMODITIES]
    etf_tasks = [_fetch_safe(l, t, 60) for l, t in ETFS]
    sector_tasks = [_fetch_safe(l, t, 120) for l, t in SECTORS]
    commodities, etfs, sectors = await asyncio.gather(
        asyncio.gather(*commodity_tasks, return_exceptions=True),
        asyncio.gather(*etf_tasks, return_exceptions=True),
        asyncio.gather(*sector_tasks, return_exceptions=True))
    def clean(items): return [i for i in items if isinstance(i, dict)]
    vix_val = next((i["price"] for i in clean(etfs) if i["ticker"] == "^VIX"), 0)
    fear = "극단 공포" if vix_val>=30 else "공포" if vix_val>=20 else "중립" if vix_val>=15 else "탐욕" if vix_val>=12 else "극단 탐욕"
    result = {"vix": {"value": vix_val, "label": fear}, "commodities": clean(commodities), "etfs": clean(etfs), "sectors": clean(sectors)}
    cache.set("reference_all", result, ttl=60)
    return result
