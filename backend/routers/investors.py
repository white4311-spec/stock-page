import asyncio
from datetime import datetime
from fastapi import APIRouter
from services import kis_client, cache

router = APIRouter(prefix="/api/investors", tags=["investors"])

SAMPLE_TICKERS = ["005930","000660","373220","005380","000270","035420","051910","055550","105560","032830"]

@router.get("")
async def get_investors():
    cached = cache.get("investors_trend")
    if cached: return cached
    results = await asyncio.gather(*[kis_client.get_stock_investor(t) for t in SAMPLE_TICKERS], return_exceptions=True)
    totals = {k: 0 for k in ["foreign_qty","foreign_amt","institution_qty","institution_amt","individual_qty","individual_amt"]}
    date_str = ""
    for r in results:
        if isinstance(r, dict):
            if not date_str and r.get("date"): date_str = r["date"]
            totals["foreign_qty"] += r.get("foreign_net", 0); totals["foreign_amt"] += r.get("foreign_net_amt", 0)
            totals["institution_qty"] += r.get("institution_net", 0); totals["institution_amt"] += r.get("institution_net_amt", 0)
            totals["individual_qty"] += r.get("individual_net", 0); totals["individual_amt"] += r.get("individual_net_amt", 0)
    display_date = f"{date_str[:4]}.{date_str[4:6]}.{date_str[6:]}" if date_str and len(date_str)==8 else datetime.now().strftime("%Y.%m.%d")
    def card(kp, label):
        amt_eok = totals[f"{kp}_amt"] // 100
        return {"type": kp, "label": label, "net_qty": totals[f"{kp}_qty"], "net_amt": amt_eok,
                "net_amt_display": f"{amt_eok:+,}억", "direction": "buy" if amt_eok >= 0 else "sell"}
    response = {"data": [card("foreign","외국인"), card("institution","기관"), card("individual","개인")],
                "date": display_date, "note": "KOSPI 상위 10개 종목 기준 집계"}
    cache.set("investors_trend", response, ttl=60)
    return response
