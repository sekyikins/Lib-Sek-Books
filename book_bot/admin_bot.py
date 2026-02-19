#!/usr/bin/env python3
"""Admin Telegram bot for book management.

Commands:
- /uploadbook - Upload a new book
- /updatebook - Update book metadata
- /deletebook - Delete a book
- /listbooks - List all books
- /linkrequest - Link a book to a pending request
- /help - Show available commands

Security:
- Only allows bot owner (ADMIN_CHAT_ID)
- Logs all admin actions
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
ADMIN_LOG_FILE = BASE_DIR / "admin_actions.json"

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

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
ADMIN_CHAT_ID = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")
BOT_USERNAME = os.getenv("TELEGRAM_BOT_NAME", "t.me/Books_AdminBot")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")

print(f"Bot configuration loaded:", flush=True)
print(f"BACKEND_URL: {BACKEND_URL}", flush=True)
print(f"BOT_TOKEN: {'SET' if BOT_TOKEN else 'NOT SET'}", flush=True)
print(f"ADMIN_CHAT_ID: {ADMIN_CHAT_ID}", flush=True)

API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"

# User states for multi-step commands
user_states: Dict[str, Dict[str, Any]] = {}

# Request logging
REQUESTS_FILE = BASE_DIR / "requests.json"


def ensure_requests_file() -> None:
    if not REQUESTS_FILE.exists():
        REQUESTS_FILE.write_text("[]\n", encoding="utf-8")


def log_request(entry: Dict[str, Any]) -> None:
    ensure_requests_file()
    existing = load_json_array(REQUESTS_FILE)
    existing.append(entry)
    save_json_array(REQUESTS_FILE, existing)


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


def format_not_found_admin_message(title: str, author: str, chat_id: str = "", details: str = "") -> str:
    return "\n".join(
        [
            "📚 New book request (not found):",
            f"Title: {title or '-'}",
            f"Author: {author or '-'}",
            f"User Chat ID: {chat_id or '-'}",
            f"Details: {details or '-'}",
            f"Time: {now_iso()}",
        ]
    )


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


def create_book_selection_buttons(matches: List[Dict[str, str]]) -> List[List[Dict[str, str]]]:
    """Create inline buttons for book selection"""
    buttons = []
    for i, book in enumerate(matches[:10], 1):  # Limit to 10 books
        # Create a callback data that includes the book index
        callback_data = f"select_book_{i-1}"
        button_text = f"{book['title']} - {book['author']}"
        buttons.append([{"text": button_text, "callback_data": callback_data}])
    
    # Add cancel button
    buttons.append([{"text": "❌ Cancel", "callback_data": "cancel_search"}])
    return buttons


def process_user_request(chat_id: str, title: str, author: str, source: str = "telegram") -> None:
    """Process user book request"""
    initialize_process(chat_id)
    
    # Find matching books
    matches = find_all_books(title, author)
    
    if not matches:
        # No books found
        status = "not_found"
        send_message_with_tracking(chat_id,
            f"❌ Sorry, we could not find this book right now.\nTitle: {title or '-'}\nAuthor: {author or '-'}\n\nYour request has been noted and will be processed soon."
        )
        send_message(
            ADMIN_CHAT_ID,
            format_not_found_admin_message(title, author, chat_id),
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


def send_loading_message(chat_id: str, message: str) -> str:
    """Send a loading message and return message_id for updates"""
    try:
        result = api_call("sendMessage", {
            "chat_id": chat_id,
            "text": f"⏳ {message}",
            "parse_mode": "Markdown"
        })
        return result.get("result", {}).get("message_id", "")
    except Exception:
        return ""


def update_loading_message(chat_id: str, message_id: str, new_text: str) -> None:
    """Update an existing loading message"""
    try:
        api_call("editMessageText", {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": f"⏳ {new_text}",
            "parse_mode": "Markdown"
        })
    except Exception:
        pass


def send_progress_animation(chat_id: str, steps: List[str], delay: float = 1.0, cleanup_delay: float = 3.0) -> str:
    """Send animated progress messages and auto-cleanup"""
    # Don't send if process is no longer active
    if chat_id not in process_messages:
        return ""
    
    message_id = send_loading_message(chat_id, steps[0])
    
    for i, step in enumerate(steps[1:], 1):
        # Check if process is still active before each step
        if chat_id not in process_messages:
            return ""
        
        time.sleep(delay)
        update_loading_message(chat_id, message_id, step)
    
    # Wait a bit then clear the progress messages
    time.sleep(cleanup_delay)
    
    try:
        # Delete the progress message
        api_call("deleteMessage", {
            "chat_id": chat_id,
            "message_id": message_id
        })
    except Exception:
        pass
    
    return message_id


def clear_conversation_history(chat_id: str, keep_message_id: str = None, delay: float = 30.0) -> None:
    """Clear entire conversation history except specified message"""
    def delayed_clear():
        time.sleep(delay)
        try:
            # Get chat history using getChatHistory (if available) or recent messages
            # Since getUpdates doesn't give us full history, we'll use a different approach
            
            # We'll track messages that were sent during this session
            if chat_id in message_history:
                messages_to_delete = []
                for msg_id in message_history[chat_id]:
                    if str(msg_id) != str(keep_message_id):
                        messages_to_delete.append(msg_id)
                
                # Delete all messages except the keep message
                for msg_id in messages_to_delete:
                    try:
                        api_call("deleteMessage", {
                            "chat_id": chat_id,
                            "message_id": msg_id
                        })
                        time.sleep(0.1)  # Small delay to avoid rate limiting
                    except Exception:
                        pass
                
                # Clear the history tracking
                message_history[chat_id] = [keep_message_id] if keep_message_id else []
                    
        except Exception:
            pass
    
    # Run in background thread
    import threading
    clear_thread = threading.Thread(target=delayed_clear, daemon=True)
    clear_thread.start()


# Global dictionaries to track messages and processes
message_history = {}
process_messages = {}


def initialize_process(chat_id: str) -> None:
    """Initialize process tracking for a chat"""
    process_messages[chat_id] = []


def finalize_process(chat_id: str, final_text: str) -> None:
    if chat_id not in process_messages:
        send_message(chat_id, final_text)
        return

    # Send final message
    final_result = send_message(chat_id, final_text)
    final_msg_id = final_result.get("result", {}).get("message_id")

    # Delete everything except final message
    for msg_id in process_messages.get(chat_id, []):
        if msg_id == final_msg_id:
            continue
        try:
            api_call("deleteMessage", {
                "chat_id": chat_id,
                "message_id": msg_id
            })
            time.sleep(0.05)
        except Exception:
            pass

    # Reset state
    process_messages.pop(chat_id, None)


def track_process_message(chat_id: str, result) -> None:
    if not isinstance(result, dict):
        return

    msg_id = result.get("result", {}).get("message_id")
    if not msg_id:
        return

    process_messages.setdefault(chat_id, []).append(msg_id)

def track_message(chat_id: str, message_id: str) -> None:
    """Track message ID for potential cleanup"""
    if chat_id not in message_history:
        message_history[chat_id] = []
    message_history[chat_id].append(message_id)


def send_message_with_tracking(chat_id: str, text: str, reply_markup=None) -> str:
    """Send message and track it for cleanup"""
    result = send_message(chat_id, text, reply_markup)

    # NEW:
    if chat_id in process_messages:
        track_process_message(chat_id, result)

    return result


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def log_admin_action(action: str, details: Dict[str, Any]) -> None:
    """Log admin actions for audit trail"""
    log_entry = {
        "timestamp": now_iso(),
        "action": action,
        "details": details,
    }
    
    logs = load_json_array(ADMIN_LOG_FILE)
    logs.append(log_entry)
    save_json_array(ADMIN_LOG_FILE, logs)
    print(f"Admin action logged: {action} - {details}", flush=True)


def api_call(method: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Make Telegram API call"""
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


def download_telegram_file(file_id: str) -> bytes:
    """Download file from Telegram servers"""
    try:
        # Get file info
        result = api_call("getFile", {"file_id": file_id})
        if not result.get("ok"):
            raise Exception("Failed to get file info")
        
        file_path = result["result"]["file_path"]
        download_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
        
        # Download file
        with request.urlopen(download_url, timeout=30) as response:
            return response.read()
    except Exception as e:
        print(f"Failed to download Telegram file: {e}", flush=True)
        raise


def backend_api_call(method: str, endpoint: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Make backend API call"""
    import urllib.request as urllib_request
    
    url = f"{BACKEND_URL}/api/{endpoint}"
    
    if method.upper() == "GET":
        req = urllib_request.Request(url, method="GET")
    elif method.upper() == "DELETE":
        req = urllib_request.Request(url, method="DELETE")
    else:
        body = json.dumps(data).encode("utf-8") if data else None
        req = urllib_request.Request(
            url,
            data=body,
            headers={"Content-Type": "application/json"},
            method=method.upper(),
        )
    
    with urllib_request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def send_message(chat_id: str, text: str, reply_markup: Dict[str, Any] = None):
    """Send message to Telegram chat"""
    try:
        payload = {"chat_id": chat_id, "text": text}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        
        result = api_call("sendMessage", payload)
        return result  # ✅ return FULL result (NOT bool) My name is(For tracking)
    except Exception as e:
        print(f"Failed to send message: {e}", flush=True)
        return None


def is_admin(chat_id: str) -> bool:
    """Check if user is admin"""
    return chat_id == ADMIN_CHAT_ID


def create_inline_keyboard(buttons: List[List[Dict[str, str]]]) -> Dict[str, Any]:
    """Create inline keyboard markup"""
    return {"inline_keyboard": buttons}


def get_books_list() -> List[Dict[str, Any]]:
    """Get books from backend API"""
    try:
        response = backend_api_call("GET", "books-admin")
        return response.get("books", [])
    except Exception as e:
        print(f"Failed to get books: {e}", flush=True)
        return []


def get_pending_requests() -> List[Dict[str, Any]]:
    """Get pending requests from local file"""
    requests = load_json_array(REQUESTS_FILE)
    return [req for req in requests if req.get("status") == "not_found"]


def handle_uploadbook(chat_id: str, message: str = None) -> None:
    """Handle /uploadbook command"""
    initialize_process(chat_id)
    user_states[chat_id] = {"action": "uploadbook", "step": "waiting_file"}
    
    send_message_with_tracking(
        chat_id,
        "📤 *Upload New Book*\n\nPlease send the book file (PDF only).\nThe file will be uploaded to Google Drive and added to the library.",
        reply_markup=create_inline_keyboard([[
            {"text": "❌ Cancel", "callback_data": "cancel"}
        ]])
    )


def handle_updatebook(chat_id: str, message: str = None) -> None:
    """Handle /updatebook command"""
    books = get_books_list()
    
    if not books:
        send_message(chat_id, "❌ No books found in the library.")
        return
    
    # Create inline keyboard with book options
    buttons = []
    for book in books[:10]:  # Limit to first 10 books
        title = book.get("title", "Unknown")[:30] + ("..." if len(book.get("title", "")) > 30 else "")
        buttons.append([{
            "text": f"📚 {title}",
            "callback_data": f"update_book_{book['id']}"
        }])
    
    buttons.append([{"text": "❌ Cancel", "callback_data": "cancel"}])
    
    send_message(
        chat_id,
        "📝 *Update Book*\n\nSelect a book to update:",
        reply_markup=create_inline_keyboard(buttons)
    )


def handle_deletebook(chat_id: str, message: str = None) -> None:
    """Handle /deletebook command"""
    books = get_books_list()
    
    if not books:
        send_message(chat_id, "❌ No books found in the library.")
        return
    
    # Create inline keyboard with book options
    buttons = []
    for book in books[:10]:  # Limit to first 10 books
        title = book.get("title", "Unknown")[:30] + ("..." if len(book.get("title", "")) > 30 else "")
        buttons.append([{
            "text": f"🗑️ {title}",
            "callback_data": f"delete_book_{book['id']}"
        }])
    
    buttons.append([{"text": "❌ Cancel", "callback_data": "cancel"}])
    
    send_message(
        chat_id,
        "🗑️ *Delete Book*\n\nSelect a book to delete:",
        reply_markup=create_inline_keyboard(buttons)
    )


def handle_listbooks(chat_id: str, message: str = None) -> None:
    """Handle /listbooks command with pagination"""
    books = get_books_list()
    
    if not books:
        send_message(chat_id, "📚 No books found in the library.")
        return
    
    # Store pagination state
    user_states[chat_id] = {
        "action": "listbooks",
        "page": 0,
        "total_pages": (len(books) + 9) // 10,  # 10 books per page
        "books": books
    }
    
    # Show first page
    show_books_page(chat_id, 0)


def show_books_page(chat_id: str, page: int) -> None:
    """Display a specific page of books"""
    if chat_id not in user_states or user_states[chat_id].get("action") != "listbooks":
        return
    
    state = user_states[chat_id]
    books = state["books"]
    total_pages = state["total_pages"]
    
    # Calculate slice for current page
    start_idx = page * 10
    end_idx = start_idx + 10
    page_books = books[start_idx:end_idx]
    
    # Format books list
    books_text = f"📚 *Library Books* (Page {page + 1}/{total_pages})\n\n"
    for i, book in enumerate(page_books, start_idx + 1):
        title = book.get("title", "Unknown")
        author = book.get("author", "Unknown")
        books_text += f"{i}. *{title}*\n   👤 {author}\n\n"
    
    # Create pagination buttons
    buttons = []
    if total_pages > 1:
        nav_buttons = []
        if page > 0:
            nav_buttons.append({"text": "⬅️ Previous", "callback_data": f"books_page_{page - 1}"})
        if page < total_pages - 1:
            nav_buttons.append({"text": "Next ➡️", "callback_data": f"books_page_{page + 1}"})
        if nav_buttons:
            buttons.append(nav_buttons)
    
    buttons.append([{"text": "❌ Close", "callback_data": "close_list"}])
    
    send_message_with_tracking(chat_id, books_text, reply_markup=create_inline_keyboard(buttons))


def handle_linkrequest(chat_id: str, message: str = None) -> None:
    """Handle /linkrequest command with pagination"""
    pending_requests = get_pending_requests()
    books = get_books_list()
    
    if not pending_requests:
        send_message(chat_id, "✅ No pending requests to link.")
        return
    
    if not books:
        send_message(chat_id, "❌ No books available in the library.")
        return
    
    # Store pagination state
    user_states[chat_id] = {
        "action": "linkrequest",
        "page": 0,
        "total_pages": (len(pending_requests) + 4) // 5,  # 5 requests per page
        "pending_requests": pending_requests
    }
    
    # Show first page
    show_requests_page(chat_id, 0)


def show_requests_page(chat_id: str, page: int) -> None:
    """Display a specific page of pending requests"""
    if chat_id not in user_states or user_states[chat_id].get("action") != "linkrequest":
        return
    
    state = user_states[chat_id]
    pending_requests = state["pending_requests"]
    total_pages = state["total_pages"]
    
    # Calculate slice for current page
    start_idx = page * 5
    end_idx = start_idx + 5
    page_requests = pending_requests[start_idx:end_idx]
    
    # Format requests list
    requests_text = f"📋 *Pending Requests* (Page {page + 1}/{total_pages})\n\n"
    for i, req in enumerate(page_requests, start_idx + 1):
        title = req.get("title", "Unknown")
        author = req.get("author", "Unknown")
        timestamp = req.get("timestamp", "")
        if timestamp:
            # Format timestamp to be more readable
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                time_str = dt.strftime("%Y-%m-%d %H:%M")
            except:
                time_str = timestamp[:19]  # Fallback to first 19 chars
        else:
            time_str = "Unknown"
        
        requests_text += f"{i}. *{title}* - {author}\n   📅 {time_str}\n\n"
    
    requests_text += "\nUse `/linkbook <request_number> <book_id>` to link.\n"
    requests_text += "Example: `/linkbook 1 3`"
    
    # Create pagination buttons
    buttons = []
    if total_pages > 1:
        nav_buttons = []
        if page > 0:
            nav_buttons.append({"text": "⬅️ Previous", "callback_data": f"requests_page_{page - 1}"})
        if page < total_pages - 1:
            nav_buttons.append({"text": "Next ➡️", "callback_data": f"requests_page_{page + 1}"})
        if nav_buttons:
            buttons.append(nav_buttons)
    
    buttons.append([{"text": "❌ Close", "callback_data": "close_list"}])
    
    send_message_with_tracking(chat_id, requests_text, reply_markup=create_inline_keyboard(buttons))


def handle_help(chat_id: str, message: str = None) -> None:
    """Handle /help command"""
    help_text = (
        "🤖 *Admin Bot Commands*\n\n"
        "📤 `/uploadbook` - Upload a new book\n"
        "📝 `/updatebook` - Update book metadata\n"
        "🗑️ `/deletebook` - Delete a book\n"
        "📚 `/listbooks` - List all books\n"
        "🔗 `/linkrequest` - Link book to pending request\n"
        "❓ `/help` - Show this help\n\n"
        "All actions are logged for security."
    )
    
    send_message(chat_id, help_text)


def handle_callback_query(chat_id: str, callback_data: str) -> None:
    """Handle inline button callbacks"""
    try:
        if callback_data == "cancel":
            if chat_id in user_states:
                del user_states[chat_id]
            finalize_process(chat_id, "❌ Operation cancelled. ❌")
            return
        
        if callback_data == "cancel_search":
            if chat_id in user_states:
                del user_states[chat_id]
            finalize_process(chat_id, "❌ Book search cancelled. ❌")
            return
        
        if callback_data == "close_list":
            if chat_id in user_states:
                del user_states[chat_id]
            send_message(chat_id, "❌ List closed.")
            return
        
        # Handle pagination callbacks
        if callback_data.startswith("books_page_"):
            page = int(callback_data.split("_")[-1])
            show_books_page(chat_id, page)
            return
        
        if callback_data.startswith("requests_page_"):
            page = int(callback_data.split("_")[-1])
            show_requests_page(chat_id, page)
            return
        
        if callback_data.startswith("select_book_"):
            # Handle book selection
            if chat_id not in user_states or user_states[chat_id].get("action") != "book_selection":
                send_message(chat_id, "❌ Invalid selection. Please start a new search.")
                return
            
            # Show loading animation
            loading_steps = [
                "📚 Preparing your book...",
                "📥 Downloading from cloud storage...",
                "📤 Sending to your chat...",
                "✅ Book delivered!"
            ]
            
            # Run progress animation in background thread
            import threading
            progress_thread = threading.Thread(
                target=send_progress_animation,
                args=(chat_id, loading_steps, 1.5, 2.0),
                daemon=True
            )
            progress_thread.start()
            
            book_index = int(callback_data.split("_")[-1])
            matches = user_states[chat_id]["matches"]
            original_request = user_states[chat_id]["original_request"]
            
            if book_index >= len(matches):
                send_message(chat_id, "❌ Invalid selection.")
                return
            
            # Send the selected book
            book = matches[book_index]
            direct_link = to_direct_download_link(book["file_link"])
            sent_document = send_document(
                chat_id,
                direct_link,
                f"📚 Here is your requested book:\n{book['title']} by {book['author']}",
            )
            
            # Store book info before clearing state
            book_title = book['title']
            book_author = book['author']
            
            if not sent_document:
                send_message(chat_id, f"📚 Book found:\n{book_title} by {book_author}\n{direct_link}")
                send_message(ADMIN_CHAT_ID, f"⚠️ Delivery failed for: {book_title} by {book_author}")
            
            # Update request log
            log_request({
                "timestamp": now_iso(),
                "title": original_request["title"],
                "author": original_request["author"],
                "telegramChatId": str(chat_id),
                "source": "telegram",
                "status": "available" if sent_document else "delivery_failed",
                "selected_book": book_title,
            })
            
            # Clear state
            del user_states[chat_id]
            
            # Wait for progress animation to complete, then finalize
            time.sleep(10)  # Wait for animation (4 steps * 1.5s + 2s cleanup)
            
            if sent_document:
                finalize_process(chat_id, f"✅ Book delivered successfully!\n\n{book_title} by {book_author}")
            else:
                finalize_process(chat_id, f"❌ Delivery failed. Please try again.\n\n{book_title} by {book_author}")
            
            return
        
        if callback_data.startswith("update_book_"):
            book_id = int(callback_data.split("_")[-1])
            user_states[chat_id] = {
                "action": "updatebook", 
                "step": "select_field", 
                "book_id": book_id
            }
            
            buttons = [
                [{"text": "✏️ Edit Title", "callback_data": f"update_field_title_{book_id}"}],
                [{"text": "✏️ Edit Author", "callback_data": f"update_field_author_{book_id}"}],
                [{"text": "📄 Replace File", "callback_data": f"update_field_file_{book_id}"}],
                [{"text": "❌ Cancel", "callback_data": "cancel"}]
            ]
            
            send_message_with_tracking(
                chat_id,
                "📝 *What do you want to update?*",
                reply_markup=create_inline_keyboard(buttons)
            )
            return
        
        if callback_data.startswith("update_field_"):
            parts = callback_data.split("_")
            field = parts[2]
            book_id = int(parts[3])
            
            user_states[chat_id] = {
                "action": "updatebook",
                "step": "input_value",
                "book_id": book_id,
                "field": field
            }
            
            field_messages = {
                "title": "Please enter the new title:",
                "author": "Please enter the new author:",
                "file": "Please send the new file (PDF only):"
            }
            
            send_message_with_tracking(chat_id, field_messages.get(field, "Please enter the new value:"),
                reply_markup=create_inline_keyboard([[
                    {"text": "❌ Cancel", "callback_data": "cancel"}
                ]]))
            return
        
        if callback_data.startswith("delete_book_"):
            book_id = int(callback_data.split("_")[-1])
            
            # Show progress animation
            progress_steps = [
                "🗑️ Deleting book from library...",
                "💾 Updating database...",
                "✅ Book deleted successfully!"
            ]
            
            # Run progress animation in background thread
            import threading
            progress_thread = threading.Thread(
                target=send_progress_animation,
                args=(chat_id, progress_steps, 1.0, 2.0),
                daemon=True
            )
            progress_thread.start()
            
            try:
                response = backend_api_call("DELETE", f"books-admin?id={book_id}")
                
                log_admin_action("delete_book", {
                    "book_id": book_id,
                    "response": response
                })
                
                # Clear state
                del user_states[chat_id]
                
                # Wait for progress animation to complete, then finalize
                time.sleep(7)  # Wait for animation (3 steps * 1s + 2s cleanup)
                finalize_process(chat_id, f"✅ Book deleted successfully!\n\nBook ID: {book_id}")
                
            except Exception as e:
                print(f"Failed to delete book: {e}", flush=True)
                time.sleep(7)  # Wait for animation to complete
                finalize_process(chat_id, f"❌ Failed to delete book: {str(e)}")
            
            return
        
    except Exception as e:
        print(f"Callback error: {e}", flush=True)
        send_message(chat_id, "❌ An error occurred. Please try again.")


def handle_message(message: Dict[str, Any]) -> None:
    """Handle incoming messages (both admin and user commands)"""
    chat = message.get("chat", {})
    chat_id = str(chat.get("id", ""))
    text = str(message.get("text", "")).strip()
    
    if not chat_id:
        return
    
    # Check if user is admin (for admin commands)
    is_admin_user = is_admin(chat_id)
    
    # Handle user commands (for all users)
    if text.startswith("/start"):
        if is_admin_user:
            send_message(
                chat_id,
                (
                    f"🤖 Welcome to {BOT_USERNAME} (Admin Mode)\n\n"
                    "👤 User Commands:\n"
                    "/request <title> | <author> - Request a book\n"
                    "Plain text - Treated as book request\n\n"
                    "⚙️ Admin Commands:\n"
                    "/uploadbook - Upload a new book\n"
                    "/updatebook - Update book details\n"
                    "/deletebook - Delete a book\n"
                    "/listbooks - List all books\n"
                    "/linkrequest - Link book to request\n"
                    "/cancel - Cancel current operation\n"
                    "/help - Show this help message"
                ),
            )
        else:
            send_message(
                chat_id,
                (
                    f"🤖 Welcome to {BOT_USERNAME}\n\n"
                    "Commands:\n"
                    "/request <title> | <author> - Request a book\n"
                    "Plain text - Treated as book request\n"
                    "/help - Show commands\n\n"
                    "Example: /request Clean Code | Robert C. Martin"
                ),
            )
        return

    if text.startswith("/help"):
        if is_admin_user:
            send_message(
                chat_id,
                "👤 User Commands:\n"
                "/request <title> | <author> - Request a book\n"
                "Plain text - Treated as book request\n\n"
                "⚙️ Admin Commands:\n"
                "/uploadbook - Upload a new book\n"
                "/updatebook - Update book details\n"
                "/deletebook - Delete a book\n"
                "/listbooks - List all books\n"
                "/linkrequest - Link book to request\n"
                "/cancel - Cancel current operation\n"
                "/help - Show this help message"
            )
        else:
            send_message(
                chat_id,
                "Commands:\n"
                "/start - Welcome message\n"
                "/help - Show commands\n"
                "/request <title> | <author> - Request a book\n"
                "Plain text - Treated as book request\n\n"
                "Example: /request Clean Code | Robert C. Martin"
            )
        return

    # Handle user request commands (for all users)
    if text.startswith("/request"):
        parsed = parse_request_command(text)
        process_user_request(chat_id, parsed["title"], parsed["author"])
        return
    
    # Handle plain text as book request (for all users)
    if text and not text.startswith("/") and not (chat_id in user_states and user_states[chat_id].get("action")):
        process_user_request(chat_id, text, "")
        return
    
    if chat_id in user_states:
        state = user_states[chat_id]
        
        # Handle uploadbook process
        if state["action"] == "uploadbook":
            if state["step"] == "waiting_file":
                # Check for document
                if "document" in message:
                    document = message["document"]
                    file_id = document.get("file_id")
                    file_name = document.get("file_name", "unknown.pdf")
                    
                    print(f"Received file: {file_name}, ID: {file_id}", flush=True)
                    
                    user_states[chat_id]["step"] = "waiting_title"
                    user_states[chat_id]["file_id"] = file_id
                    user_states[chat_id]["file_name"] = file_name
                    
                    send_message_with_tracking(chat_id, f"📄 File received: {file_name}\n\nPlease enter the book title:",
                        reply_markup=create_inline_keyboard([[
                            {"text": "❌ Cancel", "callback_data": "cancel"}
                        ]]))
                    return
                
            elif state["step"] == "waiting_title" and text:
                print(f"Received title: {text}", flush=True)
                user_states[chat_id]["step"] = "waiting_author"
                user_states[chat_id]["title"] = text
                
                send_message_with_tracking(chat_id, "Please enter the book author:",
                    reply_markup=create_inline_keyboard([[
                        {"text": "❌ Cancel", "callback_data": "cancel"}
                    ]]))
                return
            
            elif state["step"] == "waiting_author" and text:
                print(f"Received author: {text}", flush=True)
                print(f"Starting upload process with file_id: {user_states[chat_id]['file_id']}", flush=True)
                user_states[chat_id]["author"] = text
                
                # Show progress animation during upload
                progress_steps = [
                    "📤 Starting upload process...",
                    "📥 Downloading file from Telegram...",
                    "☁️ Uploading to Google Drive...",
                    "💾 Saving book metadata...",
                    "✅ Upload complete!"
                ]
                
                # Run progress animation in background thread
                import threading
                progress_thread = threading.Thread(
                    target=send_progress_animation,
                    args=(chat_id, progress_steps, 2.0, 2.0),
                    daemon=True
                )
                progress_thread.start()
                
                # Process the upload
                try:
                    # Download file from Telegram
                    file_data = download_telegram_file(user_states[chat_id]["file_id"])
                    
                    # Upload to Google Drive via backend API
                    import urllib.request as urllib_request
                    
                    # Create multipart form data manually
                    boundary = f'----WebKitFormBoundary{int(time.time() * 1000)}'
                    
                    # Build multipart body
                    body = b''
                    
                    # Add file field
                    file_name = user_states[chat_id]["file_name"]
                    body += f'--{boundary}\r\n'.encode()
                    body += f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n'.encode()
                    body += f'Content-Type: application/pdf\r\n\r\n'.encode()
                    body += file_data
                    body += f'\r\n'.encode()
                    
                    # Add name field
                    body += f'--{boundary}\r\n'.encode()
                    body += f'Content-Disposition: form-data; name="name"\r\n\r\n'.encode()
                    body += file_name.encode()
                    body += f'\r\n'.encode()
                    
                    # Close boundary
                    body += f'--{boundary}--\r\n'.encode()
                    
                    # Make upload request
                    upload_url = f"{BACKEND_URL}/api/upload-to-drive"
                    req = urllib_request.Request(
                        upload_url,
                        data=body,
                        headers={
                            'Content-Type': f'multipart/form-data; boundary={boundary}',
                            'Content-Length': str(len(body))
                        },
                        method='POST'
                    )
                    
                    with urllib_request.urlopen(req, timeout=60) as response:
                        upload_result = json.loads(response.read().decode("utf-8"))
                        print(f"Upload API response: {upload_result}", flush=True)
                    
                    if not upload_result.get("success"):
                        error_msg = upload_result.get('error', 'Unknown error')
                        print(f"Upload failed: {error_msg}", flush=True)
                        raise Exception(f"Upload failed: {error_msg}")
                    
                    file_link = upload_result.get("fileUrl", "")
                    print(f"Got file link: {file_link}", flush=True)
                    
                    new_book = {
                        "title": user_states[chat_id]["title"],
                        "author": user_states[chat_id]["author"],
                        "file_link": file_link,
                        "added_at": now_iso()
                    }
                    
                    response = backend_api_call("POST", "books-admin", new_book)
                    
                    log_admin_action("upload_book", {
                        "title": new_book["title"],
                        "author": new_book["author"],
                        "file_name": user_states[chat_id]["file_name"],
                        "file_id": user_states[chat_id]["file_id"],
                        "upload_result": upload_result,
                        "response": response
                    })
                    
                    # Store file name before clearing state
                    file_name = user_states[chat_id]["file_name"]
                    
                    del user_states[chat_id]
                    
                    # Wait for progress animation to complete, then finalize
                    time.sleep(12)  # Wait for animation (4 steps * 2s + 2s cleanup)
                    finalize_process(
                        chat_id,
                        f"✅ Book uploaded successfully!\n\nTitle: {new_book['title']}\nAuthor: {new_book['author']}\nFile: {file_name}"
                    )
                    
                except Exception as e:
                    print(f"Upload failed: {e}", flush=True)
                    time.sleep(12)  # Wait for animation to complete
                    finalize_process(chat_id, f"❌ Upload failed: {str(e)}")
                
                return
        
        # Handle updatebook process
        elif state["action"] == "updatebook" and state["step"] == "input_value" and text:
            book_id = state["book_id"]
            field = state["field"]
            
            # Show progress animation
            progress_steps = [
                f"📝 Updating {field}...",
                "💾 Saving changes...",
                "✅ Update complete!"
            ]
            
            # Run progress animation in background thread
            import threading
            progress_thread = threading.Thread(
                target=send_progress_animation,
                args=(chat_id, progress_steps, 1.5, 2.0),
                daemon=True
            )
            progress_thread.start()
            
            try:
                update_data = {"id": book_id, field: text}
                response = backend_api_call("PUT", "books-admin", update_data)
                
                log_admin_action("update_book", {
                    "book_id": book_id,
                    "field": field,
                    "new_value": text,
                    "response": response
                })
                
                # Clear state
                del user_states[chat_id]
                
                # Wait for progress animation to complete, then finalize
                time.sleep(8)  # Wait for animation (3 steps * 1.5s + 2s cleanup)
                finalize_process(chat_id, f"✅ Book {field} updated successfully!\n\nBook ID: {book_id}\nNew {field}: {text}")
                
            except Exception as e:
                print(f"Update failed: {e}", flush=True)
                time.sleep(8)  # Wait for animation to complete
                finalize_process(chat_id, f"❌ Update failed: {str(e)}")
            
            return
    
    # Handle commands
    if text.startswith("/"):
        command = text.lower().split()[0]
        
        if command == "/uploadbook":
            handle_uploadbook(chat_id, text)
        elif command == "/updatebook":
            handle_updatebook(chat_id, text)
        elif command == "/deletebook":
            handle_deletebook(chat_id, text)
        elif command == "/listbooks":
            handle_listbooks(chat_id, text)
        elif command == "/linkrequest":
            handle_linkrequest(chat_id, text)
        elif command == "/help":
            handle_help(chat_id, text)
        elif command == "/start":
            handle_start(chat_id, text)
        elif command == "/request":
            handle_request(chat_id, text)
        else:
            if is_admin:
                send_message(chat_id, "❌ Unknown command. Type /help for available commands.")
            else:
                send_message(chat_id, "❌ Unknown command. Type /help for available commands.")
        return
    
    # Handle non-command messages
    if is_admin:
        # Admin sent a non-command message
        send_message(chat_id, "❌ Please use a valid command. Type /help for available commands.")
    else:
        # Regular user - treat as book request
        process_user_request(chat_id, text, "plain_text")


def poll_updates() -> None:
    """Poll for Telegram updates"""
    offset = 0
    print("Admin bot started. Polling Telegram updates...", flush=True)

    while True:
        try:
            result = api_call("getUpdates", {"timeout": 30, "offset": offset})
            updates = result.get("result", [])

            for update in updates:
                update_id = int(update.get("update_id", 0))
                offset = max(offset, update_id + 1)

                message = update.get("message")
                callback_query = update.get("callback_query")
                
                if isinstance(message, dict):
                    handle_message(message)
                elif isinstance(callback_query, dict):
                    # Extract callback data and handle it
                    callback_data = callback_query.get("data", "")
                    chat_info = callback_query.get("message", {}).get("chat", {})
                    chat_id = str(chat_info.get("id", ""))
                    
                    if chat_id:
                        handle_callback_query(chat_id, callback_data)
                    
                    # Answer the callback query to remove loading state
                    try:
                        api_call("answerCallbackQuery", {
                            "callback_query_id": callback_query.get("id", ""),
                            "text": "Action completed"
                        })
                    except Exception as e:
                        print(f"Failed to answer callback query: {e}", flush=True)

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
    print(f"Admin + User bot started. Polling Telegram updates...", flush=True)
    poll_updates()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
