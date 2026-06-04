from fastapi import APIRouter
from services import market_data

router = APIRouter(prefix="/api/forex", tags=["forex"])

@router.get("")
async def get_forex():
    data = await market_data.get_forex()
    return {"data": data}
