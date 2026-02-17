#!/usr/bin/env python3
"""Books request Telegram bot.

Commands:
- /start
- /help
- /request <title> | <author>

Flow:
- Reads books from books.json
- Sends matching file link as a document (URL)
- Logs all requests to requests.json
- Notifies admin when a request is not found
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib import error, request

BASE_DIR = Path(__file__).resolve().parent
BOOKS_FILE = BASE_DIR / "books.json"
REQUESTS_FILE = BASE_DIR / "requests.json"

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
ADMIN_CHAT_ID = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")
BOT_USERNAME = os.getenv("TELEGRAM_BOT_NAME", "t.me/Books_RequestBot")

API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_requests_file() -> None:
    if not REQUESTS_FILE.exists():
        REQUESTS_FILE.write_text("[]\n", encoding="utf-8")


def load_json_array(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        return []
    except json.JSONDecodeError:
        return []


def save_json_array(path: Path, data: List[Dict[str, Any]]) -> None:
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def normalize(text: str) -> str:
    return text.strip().lower()


def extract_google_drive_file_id(link: str) -> Optional[str]:
    try:
        if "drive.google.com" not in link:
            return None

        if "id=" in link:
            return link.split("id=", 1)[1].split("&", 1)[0]

        marker = "/file/d/"
        if marker in link:
            return link.split(marker, 1)[1].split("/", 1)[0]
    except Exception:
        return None

    return None


def to_direct_download_link(link: str) -> str:
    file_id = extract_google_drive_file_id(link)
    if not file_id:
        return link
    return f"https://drive.google.com/uc?export=download&id={file_id}"


def find_book(title: str, author: str) -> Optional[Dict[str, str]]:
    books = load_json_array(BOOKS_FILE)
    wanted_title = normalize(title)
    wanted_author = normalize(author)

    for book in books:
        b_title = str(book.get("title", ""))
        b_author = str(book.get("author", ""))

        title_match = wanted_title in normalize(b_title) if wanted_title else True
        author_match = wanted_author in normalize(b_author) if wanted_author else True

        if title_match and author_match:
            return {
                "title": b_title,
                "author": b_author,
                "file_link": str(book.get("file_link", "")),
            }

    return None


def log_request(entry: Dict[str, Any]) -> None:
    ensure_requests_file()
    existing = load_json_array(REQUESTS_FILE)
    existing.append(entry)
    save_json_array(REQUESTS_FILE, existing)


def api_call(method: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{API_BASE}/{method}"
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def send_message(chat_id: str, text: str) -> bool:
    try:
        result = api_call("sendMessage", {"chat_id": chat_id, "text": text})
        return bool(result.get("ok"))
    except Exception:
        return False


def send_document(chat_id: str, document_url: str, caption: str) -> bool:
    try:
        result = api_call(
            "sendDocument",
            {
                "chat_id": chat_id,
                "document": document_url,
                "caption": caption,
            },
        )
        return bool(result.get("ok"))
    except Exception:
        return False


def parse_request_command(text: str) -> Dict[str, str]:
    content = text[len("/request") :].strip()
    if not content:
        return {"title": "", "author": ""}

    if "|" in content:
        title, author = content.split("|", 1)
        return {"title": title.strip(), "author": author.strip()}

    return {"title": content.strip(), "author": ""}


def format_not_found_admin_message(title: str, author: str, email: str = "-", details: str = "-") -> str:
    return "\n".join(
        [
            "New book request (not found):",
            f"Title: {title or '-'}",
            f"Author: {author or '-'}",
            f"Email: {email or '-'}",
            f"Details: {details or '-'}",
        ]
    )


def process_request(chat_id: str, title: str, author: str, source: str = "telegram") -> None:
    if not title and not author:
        send_message(chat_id, "Provide at least a title. Example:\n/request Clean Code | Robert C. Martin")
        return

    match = find_book(title, author)
    if match and match.get("file_link"):
        direct_link = to_direct_download_link(match["file_link"])
        sent_document = send_document(
            chat_id,
            direct_link,
            f"Here is your requested book:\n{match['title']} by {match['author']}",
        )
        sent_link_fallback = (
            False
            if sent_document
            else send_message(chat_id, f"Book found:\n{match['title']} by {match['author']}\n{direct_link}")
        )
        delivered = sent_document or sent_link_fallback
        status = "available" if delivered else "delivery_failed"

        if not delivered:
            send_message(chat_id, "Book found, but sending failed. Please start the bot and try again.")
            send_message(
                ADMIN_CHAT_ID,
                f"Delivery failed.\nTitle: {title or '-'}\nAuthor: {author or '-'}",
            )
    else:
        status = "not_found"
        send_message(
            chat_id,
            f"Sorry, we could not find this book right now.\nTitle: {title or '-'}\nAuthor: {author or '-'}",
        )
        send_message(
            ADMIN_CHAT_ID,
            format_not_found_admin_message(title, author),
        )

    log_request(
        {
            "timestamp": now_iso(),
            "title": title,
            "author": author,
            "telegramChatId": str(chat_id),
            "source": source,
            "status": status,
        }
    )


def handle_message(message: Dict[str, Any]) -> None:
    chat = message.get("chat", {})
    chat_id = str(chat.get("id", ""))
    text = str(message.get("text", "")).strip()
    if not chat_id:
        return

    if text.startswith("/start"):
        send_message(
            chat_id,
            (
                f"Welcome to {BOT_USERNAME}.\n"
                "Use /request <title> | <author>\n"
                "Example: /request Introduction to JavaScript | Ben Sekyi"
            ),
        )
        return

    if text.startswith("/help"):
        send_message(
            chat_id,
            "Commands:\n/start\n/help\n/request <title> | <author>",
        )
        return

    if text.startswith("/request"):
        parsed = parse_request_command(text)
        process_request(chat_id, parsed["title"], parsed["author"])
        return

    process_request(chat_id, text, "")


def poll_updates() -> None:
    offset = 0
    print("Bot started. Polling Telegram updates...", flush=True)

    while True:
        try:
            result = api_call("getUpdates", {"timeout": 30, "offset": offset})
            updates = result.get("result", [])

            for update in updates:
                update_id = int(update.get("update_id", 0))
                offset = max(offset, update_id + 1)

                message = update.get("message")
                if isinstance(message, dict):
                    handle_message(message)

        except error.URLError as exc:
            print(f"Network error: {exc}", file=sys.stderr, flush=True)
            time.sleep(3)
        except Exception as exc:
            print(f"Unexpected error: {exc}", file=sys.stderr, flush=True)
            time.sleep(3)


def main() -> int:
    if not BOT_TOKEN or not ADMIN_CHAT_ID:
        print("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID", file=sys.stderr)
        return 1

    if not BOOKS_FILE.exists():
        print(f"Missing books file: {BOOKS_FILE}", file=sys.stderr)
        return 1

    ensure_requests_file()
    poll_updates()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
