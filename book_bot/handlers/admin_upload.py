from typing import Any, Dict, List, Optional
from api_utils import api_call, backend_api_call, send_message, delete_message, create_keyboard, edit_message
from state_manager import (
    user_states, start_operation, cancel_operation, 
    register_message, log_admin_action, send_message_with_op,
    active_operations
)
from handlers.admin_upload_process import start_book_upload_process

def start_upload_flow(chat_id: str):
    start_operation(chat_id, "uploadbook")
    user_states[chat_id] = {"action": "uploadbook", "step": "waiting_file"}
    
    send_message_with_op(
        chat_id,
        "📤 *Upload New Book*\n\nPlease send the book file (PDF only).\n_Note: External URL links are no longer supported._\n\nYou can cancel at any time with /cancel",
        reply_markup=create_keyboard([[{"text": "❌ Cancel", "callback_data": "cancel"}]]),
        parse_mode="Markdown"
    )

def handle_upload_step(chat_id: str, message: Dict[str, Any]):
    state = user_states.get(chat_id)
    if not state or state["action"] != "uploadbook":
        return

    text = message.get("text", "").strip()
    msg_id = message["message_id"]
    
    # Get the last bot message ID for editing confirmation prompts
    op = active_operations.get(chat_id)
    last_bot_mid = op.bot_message_ids[-1] if op and op.bot_message_ids else None

    if state["step"] == "waiting_file":
        doc = message.get("document")
        is_pdf = False
        if doc:
            mime = doc.get("mime_type", "")
            file_name = doc.get("file_name", "")
            if mime == "application/pdf" or file_name.lower().endswith(".pdf"):
                is_pdf = True
        
        if is_pdf and doc:
            # Check 20MB limit for getFile (Telegram restriction for standard bots)
            file_size = doc.get("file_size", 0)
            if file_size > 20 * 1024 * 1024:
                send_message_with_op(chat_id, "⚠️ *File Too Large*\n\nTelegram's Bot API only allows me to download files up to 20MB. Your file is larger than that.\n\n*Solution:* Please use the **Web Portal** to upload this book directly, as it doesn't have this restriction.\n\n_If you want to try a smaller file, just send it here._", parse_mode="Markdown")
                return

            state["file_id"] = doc["file_id"]
            state["file_name"] = doc.get("file_name", "book.pdf")
            state["step"] = "waiting_cover"
            send_message_with_op(chat_id, "🖼 *Cover Image:*\n\nPlease send an image file for the book cover, or skip this step:", 
                reply_markup=create_keyboard([
                    [{"text": "⏩ Skip", "callback_data": "skip_cover"}],
                    [{"text": "❌ Cancel", "callback_data": "cancel"}]
                ]), parse_mode="Markdown")
        else:
            send_message_with_op(chat_id, "❌ Please send a valid PDF file.")
        return

    if state["step"] == "waiting_cover":
        photo = message.get("photo")
        doc = message.get("document")
        file_id = None
        
        if photo:
            # Telegram sends multiple sizes, take the largest one
            file_id = photo[-1]["file_id"]
        elif doc:
            mime = doc.get("mime_type", "")
            if mime.startswith("image/"):
                file_id = doc["file_id"]
        
        if file_id:
            state["cover_file_id"] = file_id
            state["step"] = "waiting_title"
            send_message_with_op(chat_id, "📖 *Title:*", 
                reply_markup=create_keyboard([[{"text": "❌ Cancel", "callback_data": "cancel"}]]), parse_mode="Markdown")
        else:
            send_message_with_op(chat_id, "❌ Please send an image file or use the skip button.")
        return

    if state["step"] == "waiting_title" and text:
        state["title"] = text
        state["step"] = "waiting_author"
        send_message_with_op(chat_id, "✍️ *Author(s):*\n_Separate multiple authors with commas._",
            reply_markup=create_keyboard([[{"text": "❌ Cancel", "callback_data": "cancel"}]]), parse_mode="Markdown")
        return

    if state["step"] == "waiting_author" and text:
        state["author"] = text
        state["step"] = "waiting_isbn"
        send_message_with_op(chat_id, "🔢 *ISBN:*",
            reply_markup=create_keyboard([
                [{"text": "⏩ Skip", "callback_data": "skip_isbn"}],
                [{"text": "❌ Cancel", "callback_data": "cancel"}]
            ]), parse_mode="Markdown")
        return

    # Text fallbacks for other inputs
    prompts = {
        "waiting_isbn": ("isbn", "waiting_genre", "🏷️ *Genre(s):*", "skip_genre"),
        "waiting_genre": ("genre", "waiting_published_date", "📅 *Published Date:*", "skip_published_date"),
        "waiting_published_date": ("published_date", "waiting_language", "🌐 *Language:*", "skip_language"),
        "waiting_language": ("language", "waiting_description", "📝 *Description:*", "skip_description"),
        "waiting_description": ("description", "reviewing", None, None)
    }

    if state["step"] in prompts:
        field, next_step, next_prompt, next_skip_data = prompts[state["step"]]
        if text:
            state[field] = text
            state["step"] = next_step
            if next_step == "reviewing":
                show_review_step(chat_id)
            else:
                send_message_with_op(chat_id, next_prompt, 
                    reply_markup=create_keyboard([
                        [{"text": "⏩ Skip", "callback_data": next_skip_data}],
                        [{"text": "❌ Cancel", "callback_data": "cancel"}]
                    ]), parse_mode="Markdown")
        return

def show_review_step(chat_id: str, edit_message_id: Optional[int] = None):
    state = user_states[chat_id]
    state["step"] = "reviewing"
    
    summary = (
        "📊 *Review Your Entry*\n" + "─" * 20 + "\n\n"
        f"📖 *Title:* {state.get('title')}\n"
        f"✍️ *Author:* {state.get('author')}\n"
        f"🖼️ *Cover:* {'✅ Uploading' if state.get('cover_file_id') else '⏩ Skipped'}\n"
        f"🔢 *ISBN:* {state.get('isbn') or '-'}\n"
        f"🏷️ *Genre:* {state.get('genre') or '-'}\n"
        f"📅 *Date:* {state.get('published_date') or '-'}\n"
        f"🌐 *Language:* {state.get('language') or '-'}\n"
        f"📝 *Description:* {state.get('description') or '-'}\n\n"
        "Is this information correct?"
    )
    
    buttons = [
        [{"text": "🚀 Confirm & Upload", "callback_data": "upload_confirm"}],
        [{"text": "🔄 Start Over", "callback_data": "admin_upload"}, {"text": "❌ Cancel", "callback_data": "cancel"}]
    ]
    send_message_with_op(chat_id, summary, reply_markup=create_keyboard(buttons), parse_mode="Markdown", edit_message_id=edit_message_id)

def handle_callback(chat_id: str, data: str, edit_message_id: Optional[int] = None):
    state = user_states.get(chat_id)
    if not state or state["action"] != "uploadbook":
        return

    skip_map = {
        "skip_cover": ("cover_file_id", "waiting_title", "📖 *Title:*", None),
        "skip_isbn": ("isbn", "waiting_genre", "🏷️ *Genre(s):*", "skip_genre"),
        "skip_genre": ("genre", "waiting_published_date", "📅 *Published Date:*", "skip_published_date"),
        "skip_published_date": ("published_date", "waiting_language", "🌐 *Language:*", "skip_language"),
        "skip_language": ("language", "waiting_description", "📝 *Description:*", "skip_description"),
        "skip_description": ("description", "reviewing", None, None)
    }

    if data.startswith("skip_"):
        field, next_step, next_prompt, next_skip_data = skip_map[data]
        state["field_to_confirm"] = field
        state["next_step"] = next_step
        state["next_prompt"] = next_prompt
        state["next_skip_data"] = next_skip_data
        
        # Confirmation within the SAME message
        confirm_text = f"❓ *Confirm Step*\n\nAre you sure you want to leave *{field.replace('_', ' ').capitalize()}* empty?"
        buttons = [
            [{"text": "✅ Yes", "callback_data": "confirm_skip_yes"}, {"text": "❌ No", "callback_data": "confirm_skip_no"}]
        ]
        edit_message(chat_id, edit_message_id, confirm_text, reply_markup=create_keyboard(buttons), parse_mode="Markdown")

    elif data == "confirm_skip_yes":
        field = state.pop("field_to_confirm")
        next_step = state.pop("next_step")
        next_prompt = state.pop("next_prompt")
        next_skip_data = state.pop("next_skip_data")
        
        state[field] = "" # Mark as explicitly empty
        state["step"] = next_step
        
        if next_step == "reviewing":
            show_review_step(chat_id, edit_message_id=edit_message_id)
        else:
            # Update current message with the next prompt
            buttons = [[{"text": "❌ Cancel", "callback_data": "cancel"}]]
            if next_skip_data:
                buttons.insert(0, [{"text": "⏩ Skip", "callback_data": next_skip_data}])
            edit_message(chat_id, edit_message_id, next_prompt, reply_markup=create_keyboard(buttons), parse_mode="Markdown")
    
    elif data == "confirm_skip_no":
        # Back to the same step, but prompt again
        field = state["field_to_confirm"]
        current_step = state["step"]
        
        prompts = {
            "waiting_cover": "🖼 *Cover Image:*\n\nPlease send an image file for the book cover, or skip this step:",
            "waiting_isbn": "🔢 *ISBN:*",
            "waiting_genre": "🏷️ *Genre(s):*",
            "waiting_published_date": "📅 *Published Date:*",
            "waiting_language": "🌐 *Language:*",
            "waiting_description": "📝 *Description:*"
        }
        
        skip_data = {
            "waiting_cover": "skip_cover",
            "waiting_isbn": "skip_isbn",
            "waiting_genre": "skip_genre",
            "waiting_published_date": "skip_published_date",
            "waiting_language": "skip_language",
            "waiting_description": "skip_description"
        }
        
        buttons = [
            [{"text": "⏩ Skip", "callback_data": skip_data[current_step]}],
            [{"text": "❌ Cancel", "callback_data": "cancel"}]
        ]
        edit_message(chat_id, edit_message_id, prompts[current_step], reply_markup=create_keyboard(buttons), parse_mode="Markdown")

    elif data == "upload_confirm":
        start_book_upload_process(chat_id)
