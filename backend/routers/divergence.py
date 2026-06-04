import asyncio
from fastapi import APIRouter
from services import divergence as div_svc

router = APIRouter(prefix="/api/divergence", tags=["divergence"])

@router.get("")
async def get_divergence():
    status = div_svc.get_status(); result = div_svc.get_result()
    if status == "idle" or (status == "done" and result is None):
        asyncio.create_task(div_svc.run_analysis())
        return {"status": "analyzing", "bullish": [], "bearish": [], "updated_at": None}
    if status == "running":
        return {"status": "analyzing", "bullish": [], "bearish": [], "updated_at": None}
    return {"status": "done", **(result or {})}

@router.post("/refresh")
async def refresh_divergence():
    from services import cache
    cache.set(div_svc._STATUS_KEY, "idle", ttl=1)
    asyncio.create_task(div_svc.run_analysis())
    return {"message": "분석 시작"}

@router.get("/us")
async def get_us_divergence():
    status = div_svc.get_us_status(); result = div_svc.get_us_result()
    if status == "idle" or (status == "done" and result is None):
        asyncio.create_task(div_svc.run_us_analysis())
        return {"status": "analyzing", "bullish": [], "bearish": [], "updated_at": None}
    if status == "running":
        return {"status": "analyzing", "bullish": [], "bearish": [], "updated_at": None}
    return {"status": "done", **(result or {})}

@router.post("/us/refresh")
async def refresh_us_divergence():
    from services import cache
    cache.set(div_svc._US_STATUS_KEY, "idle", ttl=1)
    asyncio.create_task(div_svc.run_us_analysis())
    return {"message": "US 분석 시작"}
