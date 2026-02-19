#!/usr/bin/env python3
"""Clear webhook for the bot"""

import os
import json
from urllib import request, parse

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8571224560:AAE8mZs3mzWCKgr0UGAC_mdvGwjdB8KBFfo")

def clear_webhook():
    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook"
        response = request.urlopen(url, timeout=30)
        result = json.loads(response.read().decode('utf-8'))
        
        if result.get('ok'):
            print("✅ Webhook cleared successfully")
            print(f"Result: {result}")
        else:
            print(f"❌ Failed to clear webhook: {result}")
            
    except Exception as e:
        print(f"❌ Error clearing webhook: {e}")

if __name__ == "__main__":
    clear_webhook()
