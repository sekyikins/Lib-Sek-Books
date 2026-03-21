import time
from typing import Any, Dict, List, Optional
from state_manager import (
    user_states, start_operation, cancel_operation, 
    register_message, log_admin_action, send_message_with_op
)
from api_utils import api_call, backend_api_call, send_message, delete_message, create_keyboard

def start_delete_confirm(chat_id: str, book_id: str):
    start_operation(chat_id, "delete_book")
    # Fetch book info first to show details
    res = backend_api_call("GET", "books-admin")
    if not res.get("success"):
        send_message(chat_id, "❌ Error fetching book details.")
        return
    
    book = next((b for b in res.get("books", []) if str(b['id']) == str(book_id)), None)
    if not book:
        send_message(chat_id, "❌ Book not found.")
        return

    text = (
        "⚠️ *Confirm Deletion*\n\n"
        "Are you sure you want to delete this book?\n"
        f"📖 *Title:* {book['title']}\n"
        f"✍️ *Author:* {book['author']}\n\n"
        "This action cannot be undone."
    )
    
    buttons = [
        [{"text": "🗑️ Confirm Delete", "callback_data": f"admin_delete_execute_{book_id}"}],
        [{"text": "❌ Cancel", "callback_data": "cancel"}]
    ]
    send_message_with_op(chat_id, text, reply_markup=create_keyboard(buttons), parse_mode="Markdown")

def execute_delete(chat_id: str, book_id: str):
    # Show progress
    send_message_with_op(chat_id, "🗑️ Deleting book...")
    
    res = backend_api_call("DELETE", f"books-admin?id={book_id}")
    if res.get("success"):
        send_message(chat_id, "✅ Book deleted successfully.")
        log_admin_action("delete_book", {"book_id": book_id})
    else:
        send_message(chat_id, f"❌ Delete failed: {res.get('error', 'Unknown error')}")
    
    time.sleep(2)
    cancel_operation(chat_id)
    from admin_list import show_books_list
    show_books_list(chat_id)
