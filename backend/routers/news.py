from fastapi import APIRouter, Query
from services import news_service
from services.translator import translate_to_korean

router = APIRouter(prefix="/api/news", tags=["news"])

@router.get("")
async def get_news(category: str = Query(default="all", regex="^(all|domestic|international|crypto)$"),
                   translate: bool = Query(default=True)):
    items = await news_service.get_news(category=category)
    if translate:
        foreign = [i for i in items if i["category"] in ("international", "crypto")]
        if foreign:
            translated = await translate_to_korean([i["title"] for i in foreign])
            t_idx = 0
            for item in items:
                if item["category"] in ("international", "crypto"):
                    item["title_ko"] = translated[t_idx] if t_idx < len(translated) else item["title"]; t_idx += 1
                else: item["title_ko"] = item["title"]
        else:
            for item in items: item["title_ko"] = item["title"]
    else:
        for item in items: item["title_ko"] = item["title"]
    return {"category": category, "data": items}
