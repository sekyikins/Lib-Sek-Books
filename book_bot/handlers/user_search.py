import re
import difflib
from typing import Any, Dict, List, Optional
from api_utils import api_call, backend_api_call, send_message, delete_message, create_keyboard, download_file
from state_manager import (
    user_states, start_operation, cancel_operation, 
    register_message, log_admin_action, log_user_request, send_message_with_op
)

def process_user_search(chat_id: str, text: str):
    """Handle book search for regular users using Backend API"""
    # 1. Fetch all books from API
    res = backend_api_call("GET", "books-admin")
    if not res.get("success"):
        send_message(chat_id, "❌ Error fetching books. Please try again later.")
        return
    
    books = res.get("books", [])
    if not books:
        handle_no_books_found(chat_id, text)
        return

    # 2. Fuzzy match
    search_query = text.lower()
    matches = []
    for book in books:
        title = book.get("title", "").lower()
        author = book.get("author", "").lower()
        
        # Simple inclusion check
        if search_query in title or search_query in author:
            matches.append(book)
            continue
            
        # Fuzzy matching for close spells
        ratio_title = difflib.SequenceMatcher(None, search_query, title).ratio()
        ratio_author = difflib.SequenceMatcher(None, search_query, author).ratio()
        if ratio_title > 0.6 or ratio_author > 0.6:
            matches.append(book)

    if not matches:
        handle_no_books_found(chat_id, text)
        return

    # Always show selection menu, even for 1 match
    show_selection_menu(chat_id, matches, text)

def show_selection_menu(chat_id: str, matches: List[Dict[str, Any]], query: str, page: int = 1, edit_message_id: Optional[int] = None):
    if not edit_message_id:
        start_operation(chat_id, "user_search")
    
    PER_PAGE = 6
    total_pages = (len(matches) + PER_PAGE - 1) // PER_PAGE
    start_idx = (page - 1) * PER_PAGE
    end_idx = start_idx + PER_PAGE
    
    current_matches = matches[start_idx:end_idx]
    
    header = f"🔍 *SEARCH RESULTS: '{query.upper()}'*\n" + "─" * 20
    text = (
        f"{header}\n"
        f"📄 *Page:* {page} of {total_pages}\n"
        f"✨ Found {len(matches)} matches.\n\n"
        f"Tap a book title below to start the download:"
    )
    
    buttons = []
    # Grid layout for user search
    for i in range(0, len(current_matches), 2):
        row = []
        b1 = current_matches[i]
        row.append({"text": f"📖 {b1['title'][:20]}", "callback_data": f"user_select_{b1['id']}"})
        if i + 1 < len(current_matches):
            b2 = current_matches[i+1]
            row.append({"text": f"📖 {b2['title'][:20]}", "callback_data": f"user_select_{b2['id']}"})
        buttons.append(row)
    
    # Navigation buttons
    nav_buttons = []
    if page > 1:
        nav_buttons.append({"text": "⬅️ Previous", "callback_data": f"user_page_{page-1}"})
    if page < total_pages:
        nav_buttons.append({"text": "Next ➡️", "callback_data": f"user_page_{page+1}"})
    
    if nav_buttons:
        buttons.append(nav_buttons)
        
    buttons.append([{"text": "❌ Cancel Search", "callback_data": "cancel"}])
    
    user_states[chat_id] = {
        "action": "user_search",
        "query": query,
        "matches": {str(b['id']): b for b in matches},
        "all_matches": matches,
        "current_page": page
    }
    
    send_message_with_op(chat_id, text, reply_markup=create_keyboard(buttons), parse_mode="Markdown", edit_message_id=edit_message_id)

def deliver_book(chat_id: str, book: Dict[str, Any]):
    # Start operation to track these messages
    start_operation(chat_id, "deliver_book")
    
    send_message_with_op(chat_id, f"📤 *Getting your book ready...*\n\n📖 {book['title']}\n✍️ {book['author']}", parse_mode="Markdown")
    
    # Send document using the file link
    file_link = book.get("file_link")
    if not file_link:
        send_message_with_op(chat_id, "❌ Sorry, this book has no download link.")
        cancel_operation(chat_id, delay_seconds=5.0)
        return
 
    # Handle relative links
    if file_link and not file_link.startswith("http"):
        from config import BACKEND_URL
        base = BACKEND_URL.rstrip("/")
        path = file_link if file_link.startswith("/") else f"/{file_link}"
        file_link = f"{base}{path}"
 
    print(f"DEBUG: Delivering book from {file_link}")
    
    # Download file locally and upload to Telegram (more reliable for localhost/dev)
    from api_utils import download_file
    file_data = download_file(file_link)
    
    caption = f"📚 {book['title']}\n✍️ {book['author']}"
    
    if file_data:
        print(f"DEBUG: Successfully downloaded {len(file_data)} bytes. Uploading to Telegram...")
        # Try sending as file upload
        filename = f"{book['title']}.pdf" # Fallback extension
        if "." in file_link.split("/")[-1]:
            filename = file_link.split("/")[-1]
            if "?" in filename: filename = filename.split("?")[0]
            
        cover_link = book.get("cover_link")
        # Handle relative cover links
        if cover_link and not cover_link.startswith("http"):
            from config import BACKEND_URL
            base = BACKEND_URL.rstrip("/")
            path = cover_link if cover_link.startswith("/") else f"/{cover_link}"
            cover_link = f"{base}{path}"

        import html
        def esc(t): return html.escape(str(t))
        caption = f"📚 <b>{esc(book['title'])}</b>\n✍️ <i>{esc(book['author'])}</i>"

        cover_data = None
        if cover_link:
            print(f"DEBUG: Downloading cover for delivery: {cover_link}")
            cover_data = download_file(cover_link)

        # BOTH are now ready in memory.
        # We start uploading.
        res = {"ok": False}
        
        # 1. Send the Photo with info caption (if cover available) 
        # We do this FIRST as requested.
        if cover_data:
            print(f"DEBUG: Uploading cover image...")
            api_call("sendPhoto", {
                "chat_id": chat_id,
                "photo": "attach://photo",
                "caption": caption,
                "parse_mode": "HTML"
            }, files={"photo": {"filename": "cover.jpg", "data": cover_data}})
        
        # 2. Upload the Document (with thumbnail)
        print(f"DEBUG: Uploading book file...")
        files = {"document": {"filename": filename, "data": file_data}}
        params = {
            "chat_id": chat_id,
            "document": "attach://document",
            "caption": caption if not cover_data else "", # Info already in photo if cover exists
            "parse_mode": "HTML"
        }
        if cover_data:
            files["thumbnail"] = {"filename": "thumb.jpg", "data": cover_data}
            params["thumbnail"] = "attach://thumbnail"

        res = api_call("sendDocument", params, files=files)
    else:
        # Fallback section
        print(f"DEBUG: Download failed. Falling back to URL-based send.")
        import html
        def esc(t): return html.escape(str(t))
        caption = f"📚 <b>{esc(book['title'])}</b>\n✍️ <i>{esc(book['author'])}</i>"
        cover_link = book.get("cover_link")
        
        if cover_link:
            api_call("sendPhoto", {
                "chat_id": chat_id,
                "photo": cover_link,
                "caption": caption,
                "parse_mode": "HTML"
            })
            
        res = api_call("sendDocument", {
            "chat_id": chat_id,
            "document": file_link,
            "caption": caption if not cover_link else "",
            "thumb": cover_link,
            "parse_mode": "HTML"
        })
    
    if res.get("ok"):
        send_message_with_op(chat_id, "✅ Enjoy your reading!")
        log_user_request({"title": book['title'], "author": book['author'], "status": "delivered", "chat_id": chat_id})
        # Clear all delivery status messages after a while
        cancel_operation(chat_id, delay_seconds=5.0)
    else:
        error_msg = res.get("error") or res.get("description", "Unknown error")
        print(f"DEBUG: Telegram delivery failed: {error_msg}")
        send_message_with_op(chat_id, f"❌ Failed to deliver the file.\n\n_{error_msg}_", parse_mode="HTML")
        # Notify admin
        from config import ADMIN_CHAT_ID
        send_message(ADMIN_CHAT_ID, f"🔔 *Delivery Failed*\nBook: {book['title']}\nUser ID: {chat_id}\nError: {error_msg}")
        cancel_operation(chat_id, delay_seconds=10.0)

def handle_no_books_found(chat_id: str, query: str):
    start_operation(chat_id, "not_found")
    send_message_with_op(chat_id, f"🔍 I couldn't find any books matching '{query}'.\n\nI've notified the librarian! 🔔")
    cancel_operation(chat_id, delay_seconds=5.0)
    from config import ADMIN_CHAT_ID
    send_message(ADMIN_CHAT_ID, f"🔔 <b>Book Request Not Found</b>\nQuery: {query}\nUser ID: {chat_id}", parse_mode="HTML")
    log_user_request({"query": query, "status": "not_found", "chat_id": chat_id})
