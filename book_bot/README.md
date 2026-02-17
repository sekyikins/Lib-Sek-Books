# Book Request Telegram Bot

## Files
- `bot.py` - main Telegram bot script.
- `books.json` - book metadata source.
- `requests.json` - request log.

## Environment variables
- `TELEGRAM_BOT_TOKEN` (required): bot token.
- `TELEGRAM_ADMIN_CHAT_ID` (required): admin chat ID.
- `TELEGRAM_BOT_NAME` (optional): display name/link.

## Run
```bash
cd book_bot
python3 bot.py
```

## Request format in Telegram
```text
/request <title> | <author>
```

If found, the bot sends the file from `file_link`.
If not found, the bot logs the request and notifies admin.
