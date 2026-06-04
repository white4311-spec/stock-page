import asyncio
from fastapi import APIRouter
from services import kis_client, market_data

router = APIRouter(prefix="/api/indices", tags=["indices"])

async def _get_kospi():
    try: return await kis_client.get_index("0001")
    except Exception: return await market_data.get_kospi_yf()

async def _get_kosdaq():
    try: return await kis_client.get_index("1001")
    except Exception: return await market_data.get_kosdaq_yf()

@router.get("")
async def get_indices():
    results = await asyncio.gather(_get_kospi(), _get_kosdaq(),
        market_data.get_sp500(), market_data.get_nasdaq(), market_data.get_dow(), return_exceptions=True)
    labels = ["KOSPI", "KOSDAQ", "S&P500", "NASDAQ", "DJI"]
    indices = []
    for label, result in zip(labels, results):
        if isinstance(result, Exception):
            indices.append({"name": label, "price": 0, "change": 0, "change_pct": 0, "error": str(result)})
        else: indices.append(result)
    return {"data": indices}
