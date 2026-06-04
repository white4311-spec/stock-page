import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

KIS_APP_KEY       = os.getenv("KIS_APP_KEY", "")
KIS_APP_SECRET    = os.getenv("KIS_APP_SECRET", "")
KIS_BASE_URL      = "https://openapi.koreainvestment.com:9443"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"

NEWS_FEEDS = {
    "domestic": [
        ("한국경제", "https://www.hankyung.com/feed/economy"),
        ("연합뉴스 경제", "https://www.yna.co.kr/rss/economy.xml"),
    ],
    "international": [
        ("Reuters Business", "https://feeds.reuters.com/reuters/businessNews"),
        ("CNBC Economy", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147"),
    ],
    "crypto": [
        ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
        ("CoinTelegraph", "https://cointelegraph.com/rss"),
    ],
}
