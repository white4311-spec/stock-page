import asyncio
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from routers import indices, forex, bonds, crypto, investors, top10, news, search, stocks, reference, adr
from routers import chat as chat_router
from routers import divergence as divergence_router
from services.database import init_db
from services.scheduler import start_scheduler


async def _preload():
    await asyncio.sleep(2)

    await init_db()
    print("[startup] DB 초기화 완료")

    try:
        from services.stock_search import _load_listing
        rows = await asyncio.get_event_loop().run_in_executor(None, _load_listing)
        print(f"[startup] KRX 종목 리스트: {len(rows)}개")
    except Exception as e:
        print(f"[startup] KRX 로드 실패: {e}")

    try:
        from routers.top10 import _build_top10
        await _build_top10("foreign", "buy")
        print("[startup] Top10 캐시 워밍 완료")
    except Exception as e:
        print(f"[startup] Top10 워밍 실패: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_preload())
    sched = start_scheduler()
    yield
    sched.shutdown(wait=False)


app = FastAPI(title="주식 대시보드 API", version="1.0.0", lifespan=lifespan)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"]        = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]     = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'none'; "
            "object-src 'none'"
        )
        response.headers["Server"] = "MarketBoard"
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(indices.router)
app.include_router(forex.router)
app.include_router(bonds.router)
app.include_router(crypto.router)
app.include_router(investors.router)
app.include_router(top10.router)
app.include_router(news.router)
app.include_router(search.router)
app.include_router(stocks.router)
app.include_router(reference.router)
app.include_router(chat_router.router)
app.include_router(divergence_router.router)
app.include_router(adr.router)


@app.get("/")
async def root():
    return {"status": "ok", "docs": "/docs"}
