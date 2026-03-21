import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Manually load .env file as fallback
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text().strip().split('\n'):
            if line.strip() and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
ADMIN_CHAT_ID = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")
BOT_USERNAME = os.getenv("TELEGRAM_BOT_NAME", "t.me/LibSekBooks_Bot")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")

# File paths
REQUESTS_FILE = BASE_DIR / "requests.json"
ADMIN_ACTIONS_FILE = BASE_DIR / "admin_actions.json"

# API Helpers
API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"

def is_admin(chat_id: str) -> bool:
    return str(chat_id) == str(ADMIN_CHAT_ID)
