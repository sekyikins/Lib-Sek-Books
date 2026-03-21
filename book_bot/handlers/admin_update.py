from typing import Any, Dict, List, Optional
from api_utils import api_call, backend_api_call, send_message, delete_message
from state_manager import (
    user_states, start_operation, cancel_operation, 
    register_message, log_admin_action
)

def create_keyboard(buttons: List[List[Dict[str, str]]]) -> Dict[str, Any]:
    return {"inline_keyboard": buttons}

from state_manager import (
    user_states, start_operation, cancel_operation, 
    register_message, log_admin_action, send_message_with_op
)

def start_update_flow(chat_id: str, book_id: str, edit_message_id: Optional[int] = None):
    # Fetch current book details
    res = backend_api_call("GET", "books-admin")
    book = next((b for b in res.get("books", []) if str(b['id']) == str(book_id)), None)
    if not book:
        send_message_with_op(chat_id, "❌ Book not found.", edit_message_id=edit_message_id)
        return

    if not edit_message_id:
        start_operation(chat_id, "updatebook")
        
    user_states[chat_id] = {
        "action": "updatebook",
        "step": "waiting_field",
        "book_id": book_id,
        "book_data": book,
        "updates": {}
    }
    
    text = (
        f"📝 *Update Book: {book['title']}*\n\n"
        "Which field would you like to update?"
    )
    buttons = [
        [{"text": "📖 Title", "callback_data": "update_field_title"}, {"text": "✍️ Author", "callback_data": "update_field_author"}],
        [{"text": "🏷️ Genre", "callback_data": "update_field_genre"}, {"text": "🔢 ISBN", "callback_data": "update_field_isbn"}],
        [{"text": "📅 Date", "callback_data": "update_field_published_date"}, {"text": "🌐 Language", "callback_data": "update_field_language"}],
        [{"text": "📝 Description", "callback_data": "update_field_description"}],
        [{"text": "✅ Finish & Save", "callback_data": "update_finish"}, {"text": "❌ Cancel", "callback_data": "cancel"}]
    ]
    send_message_with_op(chat_id, text, reply_markup=create_keyboard(buttons), parse_mode="Markdown", edit_message_id=edit_message_id)

def handle_update_callback(chat_id: str, data: str):
    state = user_states.get(chat_id)
    if not state or state["action"] != "updatebook":
        return

    if data.startswith("update_field_"):
        field = data.replace("update_field_", "")
        state["current_field"] = field
        state["step"] = "waiting_input"
        
        field_names = {"title": "Title", "author": "Author", "genre": "Genre", "isbn": "ISBN", "published_date": "Published Date", "language": "Language", "description": "Description"}
        current_val = state["book_data"].get(field) or "Not set"
        
        text = f"✏️ *Updating {field_names[field]}*\n\n*Current Match:* `{current_val}`\n\nPlease send the new value:"
        send_message_with_op(chat_id, text, reply_markup=create_keyboard([[{"text": "⬅️ Back", "callback_data": "update_back"}, {"text": "❌ Cancel", "callback_data": "cancel"}]]), parse_mode="Markdown")

    elif data == "update_finish":
        if not state["updates"]:
            send_message(chat_id, "⚠️ No changes made.")
            cancel_operation(chat_id)
            return
        execute_update(chat_id)

def handle_update_input(chat_id: str, text: str):
    state = user_states.get(chat_id)
    if not state or state["step"] != "waiting_input":
        return
        
    field = state.pop("current_field")
    state["updates"][field] = text
    state["step"] = "waiting_field"
    
    send_message(chat_id, f"✅ Updated {field} locally.")
    start_update_flow(chat_id, state["book_id"])

def execute_update(chat_id: str):
    state = user_states[chat_id]
    book_id = state["book_id"]
    updates = state["updates"]
    
    res = backend_api_call("POST", f"books-admin/{book_id}", updates) # Assuming this is the update endpoint
    if res.get("success"):
        send_message(chat_id, "✅ Book updated successfully.")
        log_admin_action("update_book", {"book_id": book_id, "updates": list(updates.keys())})
    else:
        send_message(chat_id, f"❌ Update failed: {res.get('error')}")
    
    cancel_operation(chat_id)
    from admin_list import show_books_list
    show_books_list(chat_id)
