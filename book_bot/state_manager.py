import json
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from config import ADMIN_ACTIONS_FILE, REQUESTS_FILE

@dataclass
class Operation:
    chat_id: str
    operation_type: str
    start_time: str
    message_ids: List[int] = field(default_factory=list)
    bot_message_ids: List[int] = field(default_factory=list)

# Global states
user_states: Dict[str, Dict[str, Any]] = {}
active_operations: Dict[str, Operation] = {}

def start_operation(chat_id: str, op_type: str) -> Operation:
    # If there's an existing operation, cancel it first to clear messages
    if chat_id in active_operations:
        cancel_operation(chat_id)
        
    op = Operation(
        chat_id=chat_id,
        operation_type=op_type,
        start_time=datetime.now().isoformat()
    )
    active_operations[chat_id] = op
    return op

def send_message_with_op(chat_id: str, text: str, reply_markup: Optional[Dict[str, Any]] = None, parse_mode: Optional[str] = None, edit_message_id: Optional[int] = None) -> Dict[str, Any]:
    """Sends a message or edits an existing one, registering it for cleanup."""
    from api_utils import api_call, send_message
    
    if edit_message_id:
        res = api_call("editMessageText", {
            "chat_id": chat_id,
            "message_id": edit_message_id,
            "text": text,
            "reply_markup": reply_markup,
            "parse_mode": parse_mode
        })
        if res.get("ok"):
            return res
        
        # Check for 'not modified' error
        desc = res.get("description", "").lower()
        if "message is not modified" in desc:
            return {"ok": True, "result": {"message_id": edit_message_id}} # Act as if it succeeded
        
        # If other edit failure, gracefully fall back to sending new
        
    res = send_message(chat_id, text, reply_markup, parse_mode)
    if res.get("ok"):
        register_message(chat_id, res["result"]["message_id"], is_bot=True)
    return res

def get_operation(chat_id: str) -> Optional[Operation]:
    return active_operations.get(chat_id)

def cancel_operation(chat_id: str, delay_seconds: float = 0) -> None:
    """Clear an operation and its messages, optionally with a delay."""
    op = active_operations.get(chat_id)
    if not op:
        # Final cleanup for states if no op is found
        user_states.pop(chat_id, None)
        return

    start_token = op.start_time
    if delay_seconds > 0:
        # Run deletion in a background thread to allow user to see the last message
        threading.Thread(
            target=_do_cancel_cleanup, 
            args=(chat_id, start_token, delay_seconds), 
            daemon=True
        ).start()
    else:
        _do_cancel_cleanup(chat_id, start_token)

def _do_cancel_cleanup(chat_id: str, start_token: str, delay: float = 0):
    if delay > 0:
        time.sleep(delay)
    
    # Check if the operation is still THE SAME one (hasn't been restarted/replaced)
    op = active_operations.get(chat_id)
    if op and op.start_time == start_token:
        from api_utils import delete_message
        # Pop it only if it's the right one
        active_operations.pop(chat_id)
        for mid in op.message_ids:
            try:
                delete_message(chat_id, mid)
            except:
                pass
        # Clear state too
        user_states.pop(chat_id, None)

def register_message(chat_id: str, message_id: int, is_bot: bool = False) -> None:
    op = get_operation(chat_id)
    if op:
        # User requested: only the latest prompt should have buttons
        # So we remove keyboards from older BOT messages in the same operation
        from api_utils import api_call
        if is_bot and op.bot_message_ids:
            last_bot_mid = op.bot_message_ids[-1]
            try:
                # We specifically only try to edit bot messages to avoid 400 errors
                api_call("editMessageReplyMarkup", {
                    "chat_id": chat_id,
                    "message_id": last_bot_mid,
                    "reply_markup": {"inline_keyboard": []}
                })
            except:
                pass
        
        if message_id not in op.message_ids:
            op.message_ids.append(message_id)
        if is_bot and message_id not in op.bot_message_ids:
            op.bot_message_ids.append(message_id)

def log_admin_action(action_type: str, details: Dict[str, Any]) -> None:
    try:
        from pathlib import Path
        if not ADMIN_ACTIONS_FILE.exists():
            ADMIN_ACTIONS_FILE.write_text("[]", encoding="utf-8")
        
        content = ADMIN_ACTIONS_FILE.read_text(encoding="utf-8")
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            data = []
            
        data.append({
            "timestamp": datetime.now().isoformat(),
            "action": action_type,
            "details": details
        })
        ADMIN_ACTIONS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"⚠️ Error logging admin action: {e}")

def log_user_request(request_data: Dict[str, Any]) -> None:
    try:
        if not REQUESTS_FILE.exists():
            REQUESTS_FILE.write_text("[]", encoding="utf-8")
        
        content = REQUESTS_FILE.read_text(encoding="utf-8")
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            data = []
            
        data.append({
            "timestamp": datetime.now().isoformat(),
            **request_data
        })
        REQUESTS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"⚠️ Error logging user request: {e}")
