from typing import Any, Dict, List, Optional
from state_manager import (
    user_states, start_operation, cancel_operation, 
    register_message, log_admin_action, send_message_with_op
)
from api_utils import api_call, backend_api_call, send_message, delete_message, create_keyboard

def show_requests_list(chat_id: str, edit_message_id: Optional[int] = None):
    if not edit_message_id:
        start_operation(chat_id, "admin_requests")
    """Show pending book requests for admins - Professional UI"""
    from config import REQUESTS_FILE
    import json
    
    if not REQUESTS_FILE.exists():
        send_message_with_op(chat_id, "✅ *No pending requests found.*", edit_message_id=edit_message_id, parse_mode="Markdown")
        return
        
    try:
        requests = json.loads(REQUESTS_FILE.read_text(encoding="utf-8"))
        pending = [r for r in requests if r.get("status") == "not_found"]
    except:
        send_message_with_op(chat_id, "❌ *Error reading library requests.*", edit_message_id=edit_message_id, parse_mode="Markdown")
        return
        
    if not pending:
        send_message_with_op(chat_id, "✅ *No pending requests found.*", edit_message_id=edit_message_id, parse_mode="Markdown")
        return

    header = "📋 *PENDING REQUESTS*\n" + "─" * 20
    text = f"{header}\n📦 *Total Pending:* {len(pending)}\n\nSelect a request to manage:"
    buttons = []
    for i, req in enumerate(pending[:10]):
        query = req.get("query", "Unknown Query")[:30]
        buttons.append([{"text": f"📩 {query}", "callback_data": f"admin_fulfill_{i}"}])
    
    buttons.append([{"text": "🏠 Main Menu", "callback_data": "admin_menu"}])
    
    user_states[chat_id] = {
        "action": "admin_requests",
        "pending_requests": pending
    }
    
    send_message_with_op(chat_id, text, reply_markup=create_keyboard(buttons), parse_mode="Markdown", edit_message_id=edit_message_id)
 
def handle_fulfill_selection(chat_id: str, index: int, edit_message_id: Optional[int] = None):
    state = user_states.get(chat_id)
    if not state: return
    
    req = state["pending_requests"][index]
    query = req.get("query")
    user_id = req.get("chat_id")
    requested_at = req.get("requested_at", "Unknown")
    
    header = "🛠 *MANAGE REQUEST*\n" + "─" * 20
    text = (
        f"{header}\n"
        f"🔍 *Query:* {query}\n"
        f"👤 *User ID:* `{user_id}`\n"
        f"⏰ *Requested:* {requested_at}\n\n"
        "Choose an action to handle this request:"
    )
    
    buttons = [
        [{"text": "📤 Upload to Library", "callback_data": "admin_upload"}],
        [{"text": "🔗 Mark as Resolved", "callback_data": f"admin_resolve_{index}"}],
        [{"text": "⬅️ Back to Requests", "callback_data": "admin_requests"}]
    ]
    send_message_with_op(chat_id, text, reply_markup=create_keyboard(buttons), parse_mode="Markdown", edit_message_id=edit_message_id)

def handle_resolve_callback(chat_id: str, index: int):
    from config import REQUESTS_FILE
    import json
    from datetime import datetime
    
    try:
        requests = json.loads(REQUESTS_FILE.read_text(encoding="utf-8"))
        pending = [r for r in requests if r.get("status") == "not_found"]
        
        target = pending[index]
        for r in requests:
            if r == target:
                r["status"] = "resolved"
                r["resolved_at"] = datetime.now().isoformat()
                break
                
        REQUESTS_FILE.write_text(json.dumps(requests, indent=2), encoding="utf-8")
        send_message(chat_id, "✅ Request marked as resolved.")
        log_admin_action("resolve_request", {"query": target.get("query")})
        
        # Back to list
        show_requests_list(chat_id)
    except Exception as e:
        send_message(chat_id, f"❌ Failed to resolve: {e}")
