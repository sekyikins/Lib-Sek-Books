import sys
import time
import json
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional

from config import (
    BOT_TOKEN, ADMIN_CHAT_ID, BOT_USERNAME, 
    is_admin, REQUESTS_FILE
)
from api_utils import (
    api_call, backend_api_call, send_message, delete_message
)
from state_manager import (
    user_states, start_operation, get_operation, 
    cancel_operation, register_message, log_admin_action, 
    log_user_request, send_message_with_op, Operation
)

# --- ADMIN HANDLERS ---

# --- ADMIN HANDLERS ---

def show_admin_main_menu(chat_id: str, edit_message_id: Optional[int] = None):
    start_operation(chat_id, "admin_menu")
    """Show dashboard for admins - Professional UI"""
    from api_utils import create_keyboard
    header = "🚀 *ADMINISTRATOR DASHBOARD*\n" + "─" * 20
    text = (
        f"{header}\n\n"
        "Welcome back! Use the tools below to manage your library resources and user requests:"
    )
    buttons = [
        [{"text": "📤 Upload New Book", "callback_data": "admin_upload"}],
        [{"text": "📚 Manage Library", "callback_data": "admin_list"}],
        [{"text": "📋 View Pending Requests", "callback_data": "admin_requests"}]
    ]
    send_message_with_op(chat_id, text, reply_markup=create_keyboard(buttons), parse_mode="Markdown", edit_message_id=edit_message_id)

# --- USER HANDLERS ---

def show_user_welcome(chat_id: str):
    text = (
        f"👋 *Welcome to {BOT_USERNAME}!*\n\n"
        "I can help you find and download books from our library.\n\n"
        "🔍 *How to find a book:*\n"
        "Just send me the name of the book or the author, or use the command:\n"
        "`/request Title | Author`"
    )
    send_message(chat_id, text, parse_mode="Markdown")

# --- CORE LOGIC ---

def handle_callback_query(callback: Dict[str, Any]):
    chat_id = str(callback["message"]["chat"]["id"])
    data = callback["data"]
    callback_id = callback["id"]
    
    # Always answer callback to remove loading state
    try:
        api_call("answerCallbackQuery", {"callback_query_id": callback_id})
    except:
        pass # Ignore if query is too old

    if data == "cancel":
        # Send cancel message and register it in the current process
        send_message_with_op(chat_id, "❌ Operation cancelled.")
        # Clear the process after 3 seconds
        cancel_operation(chat_id, delay_seconds=3.0)
        if is_admin(chat_id):
            show_admin_main_menu(chat_id)
        return

    # Admin Dashboard Routing
    if is_admin(chat_id):
        msg_id = callback["message"]["message_id"]
        if data == "admin_upload":
            from handlers.admin_upload import start_upload_flow
            start_upload_flow(chat_id)
        elif data == "admin_update":
            from handlers.admin_list import show_books_list
            show_books_list(chat_id, action="update", edit_message_id=msg_id)
        elif data == "admin_delete":
            from handlers.admin_list import show_books_list
            show_books_list(chat_id, action="delete", edit_message_id=msg_id)
        elif data == "admin_list":
            from handlers.admin_list import show_books_list
            show_books_list(chat_id, edit_message_id=msg_id)
        elif data == "admin_requests":
            from handlers.admin_requests import show_requests_list
            show_requests_list(chat_id, edit_message_id=msg_id)
        elif data == "admin_menu":
            show_admin_main_menu(chat_id, edit_message_id=msg_id)
        elif data.startswith("admin_page_"):
            from handlers.admin_list import show_books_list
            page = int(data.split("_")[-1])
            show_books_list(chat_id, page=page, edit_message_id=msg_id)
        elif data.startswith("admin_book_"):
            from handlers.admin_list import handle_book_selection
            book_id = data[len("admin_book_"):]
            handle_book_selection(chat_id, book_id, edit_message_id=msg_id)
        elif data.startswith("admin_delete_confirm_"):
            from handlers.admin_delete import start_delete_confirm
            book_id = data[len("admin_delete_confirm_"):]
            start_delete_confirm(chat_id, book_id) # confirm usually new msg
        elif data.startswith("admin_delete_execute_"):
            from handlers.admin_delete import execute_delete
            book_id = data[len("admin_delete_execute_"):]
            execute_delete(chat_id, book_id)
        elif data.startswith("admin_update_"):
            from handlers.admin_update import start_update_flow
            book_id = data[len("admin_update_"):]
            start_update_flow(chat_id, book_id, edit_message_id=msg_id)
        elif data.startswith("update_field_") or data == "update_finish":
            from handlers.admin_update import handle_update_callback
            handle_update_callback(chat_id, data, edit_message_id=msg_id)
        elif data.startswith("admin_fulfill_"):
            from handlers.admin_requests import handle_fulfill_selection
            index = int(data[len("admin_fulfill_"):])
            handle_fulfill_selection(chat_id, index, edit_message_id=msg_id)
        elif data == "admin_search_trigger":
            start_operation(chat_id, "admin_search")
            user_states[chat_id] = {"action": "admin_search"}
            send_message_with_op(chat_id, "🔍 *Search Library*\n\nPlease send the Title or Author you want to find:", parse_mode="Markdown")
        elif data in ["upload_confirm", "confirm_skip_yes", "confirm_skip_no"] or data.startswith("skip_"):
            from handlers.admin_upload import handle_callback
            handle_callback(chat_id, data, edit_message_id=msg_id)
            
    # User Routing
    if data == "user_not_found":
        send_message(chat_id, "🔍 Librarian notified! 🔔")
    elif data.startswith("user_page_"):
        from handlers.user_search import show_selection_menu
        page = int(data[len("user_page_"):])
        msg_id = callback["message"]["message_id"]
        state = user_states.get(chat_id)
        if state and "all_matches" in state:
            show_selection_menu(chat_id, state["all_matches"], state["query"], page=page, edit_message_id=msg_id)
    elif data.startswith("user_select_"):
        from handlers.user_search import deliver_book
        book_id = data[len("user_select_"):]
        msg_id = callback["message"]["message_id"]
        state = user_states.get(chat_id)
        if state and "matches" in state:
            book = state["matches"].get(book_id)
            if book:
                deliver_book(chat_id, book)
            else:
                print(f"DEBUG: Book ID {book_id} not found in state matches.")

def handle_message(message: Dict[str, Any]):
    chat_id = str(message["chat"]["id"])
    text = message.get("text", "").strip()
    msg_id = message["message_id"]
    
    # Register message if there's an active operation
    register_message(chat_id, msg_id)
    
    # Allow text, documents, or photos to pass through for processing
    if not text and not message.get("document") and not message.get("photo"):
        return

    # Handle commands
    if text.startswith("/"):
        cmd = text.split()[0].lower()
        
        if cmd == "/start":
            if is_admin(chat_id):
                show_admin_main_menu(chat_id)
            else:
                start_operation(chat_id, "user_start")
                send_message_with_op(chat_id, "Welcome to Sek Book Library! 📚\n\nSend me a book title or author to search.")
            return
            
        if cmd == "/cancel":
            send_message_with_op(chat_id, "❌ Current operation cancelled.")
            cancel_operation(chat_id, delay_seconds=3.0)
            return

        if is_admin(chat_id):
            # Admin commands
            if cmd == "/uploadbook":
                from handlers.admin_upload import start_upload_flow
                start_upload_flow(chat_id)
                return
            # ... other admin commands
        
        # User commands for everyone
        if cmd == "/request":
            # Handle request
            return

    # Handle state-based inputs
    state = user_states.get(chat_id)
    if state:
        if state["action"] == "uploadbook":
            from handlers.admin_upload import handle_upload_step
            handle_upload_step(chat_id, message)
        elif state["action"] == "updatebook":
            from handlers.admin_update import handle_update_input
            handle_update_input(chat_id, text)
        elif state["action"] == "list_books" and text:
            from handlers.admin_list import show_books_list
            show_books_list(chat_id, query=text)
        elif state["action"] == "admin_search" and text:
            from handlers.admin_list import show_books_list
            show_books_list(chat_id, query=text)
        return
    else:
        # Default: treat as book search for regular users
        if not is_admin(chat_id):
            from handlers.user_search import process_user_search
            process_user_search(chat_id, text)
        else:
            # Fallback for admin if not in command
            send_message(chat_id, "❓ Unknown command or input. Use /start for the menu.")

def poll_updates():
    offset = 0
    from concurrent.futures import ThreadPoolExecutor
    print("Bot polling started...", flush=True)
    
    with ThreadPoolExecutor(max_workers=20) as executor:
        while True:
            try:
                res = api_call("getUpdates", {"offset": offset, "timeout": 30})
                if not res.get("ok"):
                    print(f"Polling error: {res.get('error')}")
                    time.sleep(5)
                    continue
                    
                for update in res.get("result", []):
                    offset = update["update_id"] + 1
                    
                    if "message" in update:
                        executor.submit(handle_message, update["message"])
                    elif "callback_query" in update:
                        executor.submit(handle_callback_query, update["callback_query"])
                        
            except KeyboardInterrupt:
                print("\nBot stopping...")
                break
            except Exception as e:
                print(f"Polling exception: {e}")
                time.sleep(5)

def main():
    if not BOT_TOKEN:
        print("TELEGRAM_BOT_TOKEN missing!")
        return
    poll_updates()
