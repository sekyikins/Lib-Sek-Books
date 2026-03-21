from typing import Any, Dict, List, Optional
from api_utils import api_call, backend_api_call, send_message, delete_message, create_keyboard
from state_manager import (
    user_states, start_operation, cancel_operation, 
    register_message, log_admin_action, send_message_with_op
)

def show_books_list(chat_id: str, action: str = "manage", page: int = 0, query: str = "", edit_message_id: Optional[int] = None):
    """Show books with pagination for admins - Professional UI"""
    res = backend_api_call("GET", "books-admin")
    if not res.get("success"):
        send_message(chat_id, "❌ *Error fetching books.* Please check your backend connection.", parse_mode="Markdown")
        return
        
    books = res.get("books", [])
    if query:
        search_query = query.lower()
        matches = []
        for book in books:
            title = book.get("title", "").lower()
            author = b.get("author", "").lower() if (b := book) else "" # just to be safe
            
            # Simple inclusion
            if search_query in title or search_query in author:
                matches.append(book)
                continue
                
            # Fuzzy match
            import difflib
            ratio_title = difflib.SequenceMatcher(None, search_query, title).ratio()
            ratio_author = difflib.SequenceMatcher(None, search_query, author).ratio()
            if ratio_title > 0.6 or ratio_author > 0.6:
                matches.append(book)
        books = matches
    
    if not books:
        text = f"🔍 *No books found matching '{query}'*" if query else "📭 *The library is currently empty.*"
        buttons = []
        if query:
            buttons.append([{"text": "🔄 Clear Search", "callback_data": "admin_list"}])
        buttons.extend([
            [{"text": "➕ Upload New Book", "callback_data": "admin_upload"}],
            [{"text": "🏠 Main Menu", "callback_data": "admin_menu"}]
        ])
        send_message_with_op(chat_id, text, reply_markup=create_keyboard(buttons), edit_message_id=edit_message_id, parse_mode="Markdown")
        return
 
    # Pagination
    PER_PAGE = 10
    total_pages = (len(books) + PER_PAGE - 1) // PER_PAGE
    start = page * PER_PAGE
    end = start + PER_PAGE
    page_books = books[start:end]
    
    header = "📚 *LIBRARY MANAGEMENT*\n" + "─" * 20
    text = f"{header}\n📄 *Page:* {page+1} of {total_pages}\n📊 *Total Books:* {len(books)}\n\nSelect a book to view details:"
    if query:
        header = f"🔍 *SEARCH RESULTS: '{query.upper()}'*\n" + "─" * 20
        text = f"{header}\n📄 *Page:* {page+1} of {total_pages}\n\nSelect a matching book:"
 
    buttons = []
    # Display books in 2-item rows
    for i in range(0, len(page_books), 2):
        row = []
        b1 = page_books[i]
        title1 = b1.get("title", "Untitled")[:18]
        row.append({"text": f"📖 {title1}", "callback_data": f"admin_book_{b1['id']}"})
        if i + 1 < len(page_books):
            b2 = page_books[i+1]
            title2 = b2.get("title", "Untitled")[:18]
            row.append({"text": f"📖 {title2}", "callback_data": f"admin_book_{b2['id']}"})
        buttons.append(row)
    
    # Navigation Row
    nav = []
    if page > 0:
        nav.append({"text": "⬅️ Previous", "callback_data": f"admin_page_{page-1}"})
    if page < total_pages - 1:
        nav.append({"text": "Next ➡️", "callback_data": f"admin_page_{page+1}"})
    if nav:
        buttons.append(nav)
    
    # Action Row
    action_row = []
    if query:
        action_row.append({"text": "🔄 Clear", "callback_data": "admin_list"})
    else:
        action_row.append({"text": "🔍 Search", "callback_data": "admin_search_trigger"})
    
    action_row.append({"text": "➕ Add Book", "callback_data": "admin_upload"})
    buttons.append(action_row)
    
    # Footer Row
    buttons.append([{"text": "🏠 Main Menu", "callback_data": "admin_menu"}])
 
    if not edit_message_id:
        start_operation(chat_id, "list_books")
    
    user_states[chat_id] = {
        "action": "list_books",
        "page": page,
        "query": query,
        "view": action
    }
    
    send_message_with_op(chat_id, text, reply_markup=create_keyboard(buttons), parse_mode="Markdown", edit_message_id=edit_message_id)
 
def handle_book_selection(chat_id: str, book_id: str, edit_message_id: Optional[int] = None):
    # Fetch list to show current book details
    res = backend_api_call("GET", "books-admin")
    book = next((b for b in res.get("books", []) if str(b['id']) == str(book_id)), None)
    
    if not book:
        send_message(chat_id, "❌ *Book details not found.*", parse_mode="Markdown")
        return

    text = (
        f"📘 *BOOK DETAILS*\n" + "─" * 20 + "\n"
        f"📌 *Title:* {book['title']}\n"
        f"✍️ *Author:* {book['author']}\n"
        f"🆔 *ID:* `{book_id}`\n\n"
        "What would you like to do with this record?"
    )
    
    buttons = [
        [{"text": "📝 Update Details", "callback_data": f"admin_update_{book_id}"}],
        [{"text": "🗑️ Delete Book", "callback_data": f"admin_delete_confirm_{book_id}"}],
        [{"text": "⬅️ Back to Library", "callback_data": "admin_list"}]
    ]
    send_message_with_op(chat_id, text, reply_markup=create_keyboard(buttons), edit_message_id=edit_message_id, parse_mode="Markdown")
