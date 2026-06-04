from fastapi import APIRouter
from services import market_data

router = APIRouter(prefix="/api/bonds", tags=["bonds"])

@router.get("")
async def get_bonds():
    data = await market_data.get_bond_yields()
    return {"data": data}
