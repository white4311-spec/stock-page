import feedparser
from datetime import datetime
from config import NEWS_FEEDS
from services import cache


def _parse_feed(source: str, url: str, category: str) -> list[dict]:
    try:
        feed = feedparser.parse(url)
        items = []
        for entry in feed.entries[:8]:
            published = ""
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                published = datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d %H:%M")
            items.append({"title": entry.get("title", "").strip(), "link": entry.get("link", ""),
                          "published": published, "source": source, "category": category,
                          "summary": entry.get("summary", "")[:200].strip()})
        return items
    except Exception:
        return []


async def get_news(category: str = "all") -> list[dict]:
    cache_key = f"news_{category}"
    cached = cache.get(cache_key)
    if cached: return cached
    results = []
    if category == "all":
        for cat, feeds in NEWS_FEEDS.items():
            for source, url in feeds:
                results.extend(_parse_feed(source, url, cat))
    else:
        for source, url in NEWS_FEEDS.get(category, []):
            results.extend(_parse_feed(source, url, category))
    results.sort(key=lambda x: x["published"], reverse=True)
    cache.set(cache_key, results, ttl=300)
    return results
