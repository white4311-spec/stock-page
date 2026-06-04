import time
import httpx
from config import KIS_APP_KEY, KIS_APP_SECRET, KIS_BASE_URL

_token_cache: dict = {"access_token": None, "expires_at": 0}


async def _get_token() -> str:
    if _token_cache["access_token"] and time.time() < _token_cache["expires_at"]:
        return _token_cache["access_token"]
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            f"{KIS_BASE_URL}/oauth2/tokenP",
            json={"grant_type": "client_credentials", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET},
        )
        res.raise_for_status()
        data = res.json()
    _token_cache["access_token"] = data["access_token"]
    _token_cache["expires_at"] = time.time() + data.get("expires_in", 86400) - 300
    return _token_cache["access_token"]


async def _request(method: str, path: str, tr_id: str, params: dict = None) -> dict:
    token = await _get_token()
    headers = {
        "authorization": f"Bearer {token}", "appkey": KIS_APP_KEY,
        "appsecret": KIS_APP_SECRET, "tr_id": tr_id,
        "custtype": "P", "content-type": "application/json; charset=utf-8",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        if method == "GET":
            res = await client.get(f"{KIS_BASE_URL}{path}", headers=headers, params=params)
        else:
            res = await client.post(f"{KIS_BASE_URL}{path}", headers=headers, json=params)
        res.raise_for_status()
        return res.json()


async def get_index(iscd: str) -> dict:
    data = await _request("GET", "/uapi/domestic-stock/v1/quotations/inquire-index-price",
        tr_id="FHPUP02100000", params={"FID_COND_MRKT_DIV_CODE": "U", "FID_INPUT_ISCD": iscd})
    o = data.get("output", {})
    return {"name": "KOSPI" if iscd == "0001" else "KOSDAQ",
            "price": float(o.get("bstp_nmix_prpr", 0)),
            "change": float(o.get("bstp_nmix_prdy_vrss", 0)),
            "change_pct": float(o.get("bstp_nmix_prdy_ctrt", 0)),
            "volume": int(o.get("acml_vol", 0))}


async def get_stock_price(ticker: str) -> dict:
    data = await _request("GET", "/uapi/domestic-stock/v1/quotations/inquire-price",
        tr_id="FHKST01010100", params={"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": ticker})
    o = data.get("output", {})
    return {"ticker": ticker, "name": o.get("hts_kor_isnm", ""),
            "price": int(o.get("stck_prpr", 0)), "change": int(o.get("prdy_vrss", 0)),
            "change_pct": float(o.get("prdy_ctrt", 0)), "volume": int(o.get("acml_vol", 0)),
            "high": int(o.get("stck_hgpr", 0)), "low": int(o.get("stck_lwpr", 0)),
            "market_cap": int(o.get("hts_avls", 0))}


async def get_stock_fundamental(ticker: str) -> dict:
    def _safe_float(v):
        try: f = float(v); return round(f, 2) if f > 0 else None
        except: return None
    def _safe_int(v):
        try: i = int(v); return i if i > 0 else None
        except: return None
    data = await _request("GET", "/uapi/domestic-stock/v1/quotations/inquire-price",
        tr_id="FHKST01010100", params={"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": ticker})
    o = data.get("output", {})
    per = _safe_float(o.get("per")); pbr = _safe_float(o.get("pbr"))
    eps = _safe_int(o.get("eps")); bps = _safe_int(o.get("bps"))
    roe = round(eps / bps * 100, 1) if eps and bps and bps > 0 else None
    return {"ticker": ticker, "per": per, "pbr": pbr, "eps": eps, "bps": bps, "roe": roe}


async def get_stock_investor(ticker: str) -> dict:
    data = await _request("GET", "/uapi/domestic-stock/v1/quotations/inquire-investor",
        tr_id="FHKST01010900", params={"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": ticker})
    rows = data.get("output", [])
    if not rows: return {}
    today = rows[0]
    return {"ticker": ticker, "date": today.get("stck_bsop_date", ""),
            "foreign_net": int(today.get("frgn_ntby_qty", 0)),
            "institution_net": int(today.get("orgn_ntby_qty", 0)),
            "individual_net": int(today.get("prsn_ntby_qty", 0)),
            "foreign_net_amt": int(today.get("frgn_ntby_tr_pbmn", 0)),
            "institution_net_amt": int(today.get("orgn_ntby_tr_pbmn", 0)),
            "individual_net_amt": int(today.get("prsn_ntby_tr_pbmn", 0))}


async def get_investor_history(ticker: str) -> list[dict]:
    data = await _request("GET", "/uapi/domestic-stock/v1/quotations/inquire-investor",
        tr_id="FHKST01010900", params={"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": ticker})
    rows = data.get("output", [])[:10]
    return [{"date": r.get("stck_bsop_date", ""),
             "foreign_net_amt": int(r.get("frgn_ntby_tr_pbmn", 0)),
             "institution_net_amt": int(r.get("orgn_ntby_tr_pbmn", 0)),
             "individual_net_amt": int(r.get("prsn_ntby_tr_pbmn", 0)),
             "foreign_net": int(r.get("frgn_ntby_qty", 0)),
             "institution_net": int(r.get("orgn_ntby_qty", 0)),
             "individual_net": int(r.get("prsn_ntby_qty", 0))} for r in rows]


async def _get_kosdaq_volume_by_fdr() -> list[dict]:
    def _fetch():
        import FinanceDataReader as fdr
        df = fdr.StockListing("KOSDAQ")
        if df.empty: return []
        if "Volume" in df.columns: df = df.nlargest(30, "Volume")
        results = []
        for _, row in df.iterrows():
            code = str(row.get("Code", "")).strip()
            if not code: continue
            results.append({"hts_kor_isnm": str(row.get("Name", code)),
                            "mksc_shrn_iscd": code, "stck_prpr": str(int(row.get("Close", 0) or 0)),
                            "prdy_ctrt": str(round(float(row.get("ChagesRatio", 0) or 0), 2)),
                            "acml_vol": str(int(row.get("Volume", 0) or 0))})
        return results[:30]
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch)


async def get_volume_rank(market: str = "J") -> list[dict]:
    if market == "Q": return await _get_kosdaq_volume_by_fdr()
    data = await _request("GET", "/uapi/domestic-stock/v1/quotations/volume-rank",
        tr_id="FHPST01710000",
        params={"FID_COND_MRKT_DIV_CODE": "J", "FID_COND_SCR_DIV_CODE": "20171",
                "FID_INPUT_ISCD": "0000", "FID_DIV_CLS_CODE": "0", "FID_BLNG_CLS_CODE": "0",
                "FID_TRGT_CLS_CODE": "111111111", "FID_TRGT_EXLS_CLS_CODE": "0000000000",
                "FID_INPUT_PRICE_1": "", "FID_INPUT_PRICE_2": "",
                "FID_VOL_CNT": "", "FID_INPUT_DATE_1": ""})
    return data.get("output", [])


async def search_stock(query: str) -> list[dict]:
    data = await _request("GET", "/uapi/domestic-stock/v1/quotations/search-stock-info",
        tr_id="CTPF1002R",
        params={"PRDT_TYPE_CD": "300", "MKET_ID_CD": "ALL", "SCTY_GRP_ID_CD": "ST",
                "EXCG_DVSN_CD": "01", "SETL_FG": "1", "PRDT_NAME": query,
                "SRT_PRDT_NAME": query, "PRDT_NAME_SRCH_FG": "1"})
    return [{"ticker": i.get("shtn_pdno", ""), "name": i.get("prdt_name", ""),
             "market": i.get("mket_id_cd", ""), "type": "stock"}
            for i in data.get("output", [])[:10]]


async def get_stock_chart(ticker: str, period: str = "D") -> list[dict]:
    data = await _request("GET", "/uapi/domestic-stock/v1/quotations/inquire-daily-price",
        tr_id="FHKST01010400",
        params={"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": ticker,
                "FID_PERIOD_DIV_CODE": period, "FID_ORG_ADJ_PRC": "0"})
    return [{"date": r.get("stck_bsop_date", ""), "open": int(r.get("stck_oprc", 0)),
             "high": int(r.get("stck_hgpr", 0)), "low": int(r.get("stck_lwpr", 0)),
             "close": int(r.get("stck_clpr", 0)), "volume": int(r.get("acml_vol", 0))}
            for r in data.get("output", [])]
