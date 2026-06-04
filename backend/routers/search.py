import asyncio
from fastapi import APIRouter, Query
from services import kis_client, coingecko
from services.stock_search import search_local

router = APIRouter(prefix="/api/search", tags=["search"])

async def _empty() -> list: return []

async def _search_stocks(q: str) -> list[dict]:
    try:
        result = await kis_client.search_stock(q)
        if result: return result
    except Exception: pass
    return search_local(q)

@router.get("")
async def search(q: str = Query(min_length=1, max_length=200), type: str = Query(default="all", regex="^(all|stock|crypto)$")):
    stock_coro = _search_stocks(q) if type in ("all", "stock") else _empty()
    crypto_coro = coingecko.search_crypto(q) if type in ("all", "crypto") else _empty()
    stock_res, crypto_res = await asyncio.gather(stock_coro, crypto_coro, return_exceptions=True)
    results = []
    if isinstance(stock_res, list): results.extend(stock_res)
    if isinstance(crypto_res, list): results.extend(crypto_res)
    return {"results": results}
