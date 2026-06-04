from fastapi import APIRouter, Query
from services import coingecko

router = APIRouter(prefix="/api/crypto", tags=["crypto"])

@router.get("")
async def get_crypto(currency: str = Query(default="krw")):
    data = await coingecko.get_prices(vs_currency=currency)
    return {"data": data}

@router.get("/chart/{coin_id}")
async def get_chart(coin_id: str, days: int = Query(default=90), currency: str = Query(default="krw")):
    data = await coingecko.get_coin_chart(coin_id=coin_id, days=days, vs_currency=currency)
    return {"coin_id": coin_id, "data": data}
