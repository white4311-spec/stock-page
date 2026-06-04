import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from config import OPENROUTER_API_KEY

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM_PROMPT = """당신은 주식·금융 전문 AI 어시스턴트입니다.
- 국내외 주식 시장, 투자 전략, 기업 분석, 경제 지표에 대해 전문적으로 답변합니다.
- 한국어로 명확하고 간결하게 답변하세요.
- 투자 조언은 참고용임을 항상 명시하세요."""

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []

@router.post("")
async def chat(req: ChatRequest):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(req.history[-10:])
    messages.append({"role": "user", "content": req.message})
    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post("https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json={"model": "nvidia/nemotron-3-super-120b-a12b:free", "messages": messages})
        res.raise_for_status(); data = res.json()
    reply = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return {"reply": reply, "tokens": {"prompt": usage.get("prompt_tokens",0), "completion": usage.get("completion_tokens",0)}}
