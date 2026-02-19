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

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not installed. Please install it with: pip install python-dotenv")
    # Manually load .env file as fallback
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text().strip().split('\n'):
            if line.strip() and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

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


def find_all_books(title: str, author: str) -> List[Dict[str, str]]:
    """Find all books matching the search criteria"""
    books = load_json_array(BOOKS_FILE)
    wanted_title = normalize(title)
    wanted_author = normalize(author)
    matches = []

    for book in books:
        b_title = str(book.get("title", ""))
        b_author = str(book.get("author", ""))
        b_link = str(book.get("file_link", ""))

        title_match = wanted_title in normalize(b_title) if wanted_title else True
        author_match = wanted_author in normalize(b_author) if wanted_author else True

        if title_match and author_match and b_link:
            matches.append({
                "title": b_title,
                "author": b_author,
                "file_link": b_link,
            })

    return matches


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


def send_message(chat_id: str, text: str, parse_html: bool = False) -> bool:
    try:
        payload = {"chat_id": chat_id, "text": text}
        if parse_html:
            payload["parse_mode"] = "HTML"
        result = api_call("sendMessage", payload)
        return bool(result.get("ok"))
    except Exception:
        return False


def send_message_with_buttons(chat_id: str, text: str, buttons: List[List[Dict[str, str]]], parse_html: bool = False) -> bool:
    """Send message with inline keyboard buttons"""
    try:
        payload = {
            "chat_id": chat_id,
            "text": text,
            "reply_markup": {"inline_keyboard": buttons},
        }
        if parse_html:
            payload["parse_mode"] = "HTML"
        result = api_call("sendMessage", payload)
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
        success = bool(result.get("ok"))
        if not success:
            print(f"DEBUG: sendDocument API response: {result}", flush=True)
        return success
    except Exception as e:
        print(f"DEBUG: sendDocument exception: {e}", flush=True)
        return False


def send_document_from_link(chat_id: str, file_link: str, title: str, author: str) -> bool:
    """Send actual document file from Google Drive link"""
    try:
        direct_link = to_direct_download_link(file_link)
        print(f"DEBUG: Processing document: {title} - {direct_link}", flush=True)
        
        # Try file upload first (best method)
        try:
            print(f"DEBUG: Attempting file download and upload...", flush=True)
            
            # Download file from Google Drive
            response = request.urlopen(direct_link, timeout=30)
            file_data = response.read()
            print(f"DEBUG: Downloaded {len(file_data)} bytes", flush=True)
            
            # Generate filename
            safe_title = title.replace(' ', '_').replace('/', '_').replace('\\', '_')[:50]
            filename = f"{safe_title}.pdf"
            
            # Use requests with multipart/form-data
            import requests
            from io import BytesIO
            
            # Create multipart data manually
            files = {
                'chat_id': (None, str(chat_id)),
                'caption': (None, f"📚 {title} by {author}"),
                'document': (filename, BytesIO(file_data), 'application/pdf')
            }
            
            # Send document
            response = requests.post(
                f"{API_BASE}/sendDocument",
                files=files,
                timeout=60
            )
            
            result = response.json()
            success = bool(result.get("ok"))
            print(f"DEBUG: File upload result: {success}", flush=True)
            if success:
                return True
            else:
                print(f"DEBUG: Upload failed response: {result}", flush=True)
                
        except Exception as e:
            print(f"DEBUG: File upload failed: {e}", flush=True)
        
        # Fallback to URL method
        print(f"DEBUG: Trying URL document method...", flush=True)
        url_result = send_document(chat_id, direct_link, f"📚 {title} by {author}")
        if url_result:
            print(f"DEBUG: URL document sent successfully", flush=True)
            return True
        
        print(f"DEBUG: All methods failed, sending download link", flush=True)
        # Final fallback - send link
        fallback_result = send_message(chat_id, f"📚 {title} by {author}\n\nDownload link:\n{direct_link}")
        print(f"DEBUG: Fallback message sent: {fallback_result}", flush=True)
        return fallback_result
            
    except Exception as e:
        print(f"DEBUG: send_document_from_link failed completely: {e}", flush=True)
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

    # Find all matching books
    matches = find_all_books(title, author)
    
    if not matches:
        # Create "Did not find book" button for no matches case
        buttons = [[{"text": "❔Did not find book❔", "callback_data": "did_not_find_book_no_matches"}]]
        
        # Store search details for callback handling
        if not hasattr(process_request, 'pending_requests'):
            process_request.pending_requests = {}
        process_request.pending_requests[chat_id] = {
            'matches': [],
            'title': title,
            'author': author,
            'source': source
        }
        
        # Send message with button
        send_message_with_buttons(
            chat_id, 
            f"Sorry, we could not find your requested book.\n\nClick on the 'Did not find book' button to notify us.",
            buttons
        )
        return

    # Create selection buttons
    buttons = []
    for i, book in enumerate(matches[:10], 1):  # Limit to 10 books
        button_text = f"➡️ {book['title']} - {book['author']}"
        callback_data = f"select_book_{i-1}"
        buttons.append([{"text": button_text, "callback_data": callback_data}])
    
    # Add Did not filnd book button
    buttons.append([{"text": "❔Did not find book❔", "callback_data": "did_not_find_book"}])
    
    # Store search results for callback handling
    if not hasattr(process_request, 'pending_requests'):
        process_request.pending_requests = {}
    process_request.pending_requests[chat_id] = {
        'matches': matches,
        'title': title,
        'author': author,
        'source': source
    }
    
    # Send selection message
    if len(matches) == 1:
        message_text = f"📚 Found 1 book matching your search:\n\nSelect to receive this book:"
    else:
        message_text = f"📚 Found {len(matches)} books matching your search:\n\nPlease select which book you'd like:"
    
    send_message_with_buttons(chat_id, message_text, buttons)


def clear_pending_request(chat_id: str) -> None:
    """Clear pending request for a chat"""
    if hasattr(process_request, 'pending_requests'):
        process_request.pending_requests.pop(chat_id, None)


def delete_callback_message(callback_query: Dict[str, Any]) -> None:
    """Delete the message that triggered the callback"""
    try:
        message_id = callback_query.get("message", {}).get("message_id")
        chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", ""))
        if message_id and chat_id:
            api_call("deleteMessage", {
                "chat_id": chat_id,
                "message_id": message_id
            })
    except:
        pass  # Ignore deletion errors


def handle_did_not_find_book(callback_query: Dict[str, Any]) -> None:
    """Handle 'Did not find book' callback for both scenarios"""
    chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", ""))
    
    if (hasattr(process_request, 'pending_requests') and 
        chat_id in process_request.pending_requests):
        
        pending = process_request.pending_requests[chat_id]
        
        # Delete the selection message
        delete_callback_message(callback_query)
        
        # Send confirmation to user
        send_message(chat_id, "Thanks for your feedback🙏.\n\nYour request is noticed and the book would be uploaded soon.\n\nMake sure to request another time.")
        
        # Notify admin about missing book
        missing_book_message = "\n".join([
            "📚 BOOK NOT FOUND IN LIBRARY",
            "",
            "🔍 <b>User Search Details:</b>",
            f"📖 Title: {pending['title'] or '-'}",
            f"✍️ Author: {pending['author'] or '-'}",
            f"👤 User Chat ID: {chat_id}",
            "",
            "❌ <b>Status:</b> User could not find book in available options",
            "🔔 <b>Action Required:</b> Please consider adding this book to the library",
            "",
            f"📅 <b>Time:</b> {now_iso()}"
        ])
        
        send_message(ADMIN_CHAT_ID, missing_book_message, parse_html=True)
        
        # Log the request
        log_request({
            "timestamp": now_iso(),
            "title": pending['title'],
            "author": pending['author'],
            "telegramChatId": chat_id,
            "source": pending['source'],
            "status": "not_found_in_library",
        })
    
    # Clear pending request
    clear_pending_request(chat_id)


def handle_callback_query(callback_query: Dict[str, Any]) -> None:
    """Handle inline button callback queries"""
    chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", ""))
    data = callback_query.get("data", "")
    
    if not chat_id or not data:
        return
    
    # Acknowledge the callback (stop loading animation)
    try:
        api_call("answerCallbackQuery", {"callback_query_id": callback_query.get("id")})
    except:
        pass
    
    # Handle different callback actions
    if data.startswith("select_book_"):
        # User selected a book
        book_index = int(data.split("_")[-1])
        
        if (hasattr(process_request, 'pending_requests') and 
            chat_id in process_request.pending_requests):
            
            pending = process_request.pending_requests[chat_id]
            matches = pending['matches']
            
            if book_index < len(matches):
                selected_book = matches[book_index]
                
                # Delete the selection message
                delete_callback_message(callback_query)
                
                # Send preparation message
                send_message(chat_id, "📤 Getting your book ready...")
                
                # Send the actual file
                success = send_document_from_link(
                    chat_id,
                    selected_book['file_link'],
                    selected_book['title'],
                    selected_book['author']
                )
                
                if success:
                    send_message(chat_id, f"✅ Book sent successfully!\n\n📚 {selected_book['title']} by {selected_book['author']}")
                    
                    # Log successful delivery
                    log_request({
                        "timestamp": now_iso(),
                        "title": pending['title'],
                        "author": pending['author'],
                        "telegramChatId": chat_id,
                        "source": pending['source'],
                        "status": "available",
                        "selected_book": selected_book['title'],
                    })
                else:
                    send_message(chat_id, "❌ Failed to send book. Please try again.")
                    send_message(
                        ADMIN_CHAT_ID,
                        f"Delivery failed for user {chat_id}.\nBook: {selected_book['title']}\nError: File transmission failed"
                    )
                    
                    # Log failed delivery
                    log_request({
                        "timestamp": now_iso(),
                        "title": pending['title'],
                        "author": pending['author'],
                        "telegramChatId": chat_id,
                        "source": pending['source'],
                        "status": "delivery_failed",
                        "selected_book": selected_book['title'],
                    })
                
                # Clear pending request
                clear_pending_request(chat_id)
        
    elif data in ["did_not_find_book_no_matches", "did_not_find_book"]:
        # Handle both "Did not find book" scenarios
        handle_did_not_find_book(callback_query)


def handle_message(message: Dict[str, Any]) -> None:
    chat = message.get("chat", {})
    chat_id = str(chat.get("id", ""))
    text = str(message.get("text", "")).strip()
    
    # Debug logging
    print(f"DEBUG: Received message from chat {chat_id}: {text}", flush=True)
    
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
            print(f"DEBUG: Polling with offset {offset}", flush=True)
            result = api_call("getUpdates", {"timeout": 30, "offset": offset})
            updates = result.get("result", [])
            
            print(f"DEBUG: Received {len(updates)} updates", flush=True)

            for update in updates:
                update_id = int(update.get("update_id", 0))
                offset = max(offset, update_id + 1)

                message = update.get("message")
                if isinstance(message, dict):
                    handle_message(message)
                
                callback_query = update.get("callback_query")
                if isinstance(callback_query, dict):
                    handle_callback_query(callback_query)

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
