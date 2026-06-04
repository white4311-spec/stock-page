import httpx
from config import OPENROUTER_API_KEY
from services import cache


async def translate_to_korean(titles: list[str]) -> list[str]:
    if not titles: return []
    cache_key = "trans_" + str(hash(tuple(titles)))
    cached = cache.get(cache_key)
    if cached: return cached
    numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(titles))
    prompt = ("다음 금융 뉴스 제목들을 자연스러운 한국어로 번역하세요. "
               "번호와 번역문만 출력하고 다른 설명은 하지 마세요.\n\n" + numbered)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post("https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
                json={"model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
                      "messages": [{"role": "user", "content": prompt}]})
            content = res.json()["choices"][0]["message"]["content"].strip()
        translated = []
        for line in content.split("\n"):
            line = line.strip()
            if not line: continue
            if line[0].isdigit():
                parts = line.split(". ", 1) if ". " in line else line.split(") ", 1)
                translated.append(parts[-1].strip())
        result = (translated + titles)[:len(titles)]
        cache.set(cache_key, result, ttl=3600)
        return result
    except Exception:
        return titles
