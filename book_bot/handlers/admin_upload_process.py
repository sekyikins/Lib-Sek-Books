import json
import threading
import time
from urllib.request import urlopen
from typing import Any, Dict, List, Optional
from config import ADMIN_CHAT_ID
from api_utils import (
    api_call, backend_api_call, send_message, delete_message
)
from state_manager import (
    user_states, cancel_operation, log_admin_action, register_message
)

def start_book_upload_process(chat_id: str):
    """Start the actual book upload and API call process in a background thread"""
    state = user_states.get(chat_id)
    if not state:
        return

    state["step"] = "processing_upload"
    
    # Upload processing thread (now includes logic for status updates)
    def process_upload():
        anim_msg_id = None
        try:
            # 0. Initial Status Message
            msg_res = send_message(chat_id, "📤 *Starting upload process...*", parse_mode="Markdown")
            if msg_res.get("ok"):
                anim_msg_id = msg_res["result"]["message_id"]
                register_message(chat_id, anim_msg_id, is_bot=True)

            def update_status(text: str):
                if anim_msg_id:
                    api_call("editMessageText", {
                        "chat_id": chat_id,
                        "message_id": anim_msg_id,
                        "text": text,
                        "parse_mode": "Markdown"
                    })

            from config import BOT_TOKEN
            # 1. Handle Cover Image (Optional)
            cover_url = None
            if state.get("cover_file_id"):
                update_status("📥 *Downloading cover image...*")
                file_info = api_call("getFile", {"file_id": state["cover_file_id"]})
                if file_info.get("ok"):
                    file_path = file_info["result"]["file_path"]
                    full_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
                    
                    with urlopen(full_url) as response:
                        cover_data = response.read()
                    
                    update_status("☁️ *Uploading cover image to Supabase...*")
                    # Upload to "Cover Image" bucket as requested
                    cover_upload_res = backend_api_call("POST", "upload-to-storage", 
                        data={"bucket": "Cover Image"},
                        files={
                            "file": {
                                "data": cover_data,
                                "filename": f"cover_{int(time.time())}.jpg"
                            }
                        }
                    )
                    if cover_upload_res.get("success"):
                        cover_url = cover_upload_res.get("fileUrl")
                    else:
                        print(f"DEBUG: Cover upload failed: {cover_upload_res.get('error')}")

            # 2. Handle Book File (PDF)
            update_status("📥 *Downloading book file...*")
            file_info = api_call("getFile", {"file_id": state["file_id"]})
            if not file_info.get("ok"):
                raise Exception("Failed to get file info from Telegram")
            
            file_path = file_info["result"]["file_path"]
            full_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
            
            with urlopen(full_url) as response:
                file_data = response.read()

            # 3. Upload Book to storage
            update_status("☁️ *Uploading book to Supabase...*")
            upload_res = backend_api_call("POST", "upload-to-storage", 
                data={"bucket": "Books"},
                files={
                    "file": {
                        "data": file_data,
                        "filename": state["file_name"]
                    }
                }
            )
            
            if not upload_res.get("success"):
                raise Exception(upload_res.get("error", "Book upload failed"))
            
            file_url = upload_res.get("fileUrl")
            
            # 4. Save metadata (Store in Database)
            update_status("💾 *Finalizing database entry...*")
            
            new_book = {
                "title": state["title"],
                "author": state["author"],
                "file_link": file_url,
                "cover_link": cover_url,
                "isbn": state.get("isbn"),
                "genre": state.get("genre"),
                "published_date": state.get("published_date"),
                "language": state.get("language") or "English",
                "description": state.get("description"),
            }
            
            save_res = backend_api_call("POST", "books-admin", new_book)
            
            # Check success
            is_success = save_res.get("success") or ("id" in save_res) or (isinstance(save_res, dict) and "error" not in save_res)
            
            if not is_success:
                error_msg = save_res.get("error") or save_res.get("message") or "Database save failed"
                raise Exception(f"{error_msg}")

            update_status("✅ *Upload complete! Book successfully archived.*")
            log_admin_action("upload_book", {"title": state["title"], "author": state["author"]})
            
            # Finalize
            time.sleep(1) # Brief pause so user sees 'Upload complete!'
            title = state["title"]
            author = state["author"]
            
            # Send final success summary
            msg_res = send_message(chat_id, f"✅ *Book Uploaded Successfully!*\n\n📖 *Title:* {title}\n✍️ *Author:* {author}\n🖼️ *Cover:* {'✅' if cover_url else '❌'}", parse_mode="Markdown")
            if msg_res.get("ok"):
                register_message(chat_id, msg_res["result"]["message_id"], is_bot=True)
            
            # Clear all previous prompts and the summary after 5 seconds
            cancel_operation(chat_id, delay_seconds=5.0)
            
            time.sleep(5)
            # Re-show main menu
            from unified_bot import show_admin_main_menu
            show_admin_main_menu(chat_id)

        except Exception as e:
            error_text = f"❌ *Upload Failed:*\n{str(e)}"
            if anim_msg_id:
                api_call("editMessageText", {
                    "chat_id": chat_id,
                    "message_id": anim_msg_id,
                    "text": error_text,
                    "parse_mode": "Markdown"
                })
            else:
                send_message(chat_id, error_text, parse_mode="Markdown")
            
            # Don't cancel operation automatically so admin can see error, 
            # or maybe just cancel after a while if needed.

    threading.Thread(target=process_upload, daemon=True).start()

