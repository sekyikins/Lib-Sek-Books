import json
import time
from typing import Any, Dict, Optional, Union
from urllib import error, request
from config import API_BASE, BACKEND_URL

def api_call(method: str, params: Optional[Dict[str, Any]] = None, files: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Generic Telegram API call helper"""
    url = f"{API_BASE}/{method}"
    
    if files:
        # Complex multipart/form-data for files
        import uuid
        boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
        headers = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
        
        body = []
        for name, file_info in files.items():
            filename = file_info.get("filename", "file")
            data = file_info.get("data")
            body.extend([
                f"--{boundary}".encode(),
                f'Content-Disposition: form-data; name="{name}"; filename="{filename}"'.encode(),
                b"Content-Type: application/octet-stream",
                b"",
                data,
            ])
        
        if params:
            for key, value in params.items():
                body.extend([
                    f"--{boundary}".encode(),
                    f'Content-Disposition: form-data; name="{key}"'.encode(),
                    b"",
                    str(value).encode(),
                ])
        
        body.append(f"--{boundary}--".encode())
        payload = b"\r\n".join(body)
    else:
        headers = {"Content-Type": "application/json"}
        payload = json.dumps(params).encode("utf-8") if params else b""

    req = request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            try:
                res_json = json.loads(res_body)
                if not isinstance(res_json, dict):
                    return {"ok": False, "error": f"Invalid API response type: {type(res_json).__name__}"}
                return res_json
            except json.JSONDecodeError:
                return {"ok": False, "error": f"Invalid JSON from API: {res_body[:100]}"}
    except error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"TELEGRAM API ERROR: {e.code} - {err_msg}")
        return {"ok": False, "error": err_msg}
    except Exception as e:
        print(f"TELEGRAM API EXCEPTION: {e}")
        return {"ok": False, "error": str(e)}

def backend_api_call(method: str, endpoint: str, data: Optional[Dict[str, Any]] = None, files: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Helper for Backend API calls"""
    url = f"{BACKEND_URL}/api/{endpoint}"
    
    if files:
        import uuid
        boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
        headers = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
        
        body = []
        for name, file_info in files.items():
            filename = file_info.get("filename", "file")
            data_content = file_info.get("data")
            body.extend([
                f"--{boundary}".encode(),
                f'Content-Disposition: form-data; name="{name}"; filename="{filename}"'.encode(),
                b"Content-Type: application/octet-stream",
                b"",
                data_content,
            ])
        
        if data:
            for key, value in data.items():
                body.extend([
                    f"--{boundary}".encode(),
                    f'Content-Disposition: form-data; name="{key}"'.encode(),
                    b"",
                    str(value).encode(),
                ])
        
        body.append(f"--{boundary}--".encode())
        payload = b"\r\n".join(body)
    else:
        headers = {"Content-Type": "application/json"}
        payload = json.dumps(data).encode("utf-8") if data else b""

    req = request.Request(url, data=payload, headers=headers, method=method)
    try:
        with request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            try:
                res_json = json.loads(res_body)
                if not isinstance(res_json, dict):
                    return {"success": False, "error": f"Invalid JSON response type: {type(res_json).__name__}", "raw": res_body}
                
                # If we got a 2xx response and there's no error key, consider it a success
                if "success" not in res_json and "error" not in res_json:
                    res_json["success"] = True
                    
                return res_json
            except json.JSONDecodeError:
                return {"success": False, "error": f"Invalid JSON response: {res_body[:100]}", "raw": res_body}
    except error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"BACKEND API ERROR: {e.code} - {err_msg}")
        # Try to parse JSON error if possible
        try:
            err_json = json.loads(err_msg)
            return {"success": False, "error": err_json.get("error", err_msg), "code": e.code}
        except:
            return {"success": False, "error": err_msg, "code": e.code}
    except Exception as e:
        print(f"BACKEND API EXCEPTION: {e}")
        return {"success": False, "error": str(e)}

def send_message(chat_id: str, text: str, reply_markup: Optional[Dict[str, Any]] = None, parse_mode: Optional[str] = None) -> Dict[str, Any]:
    params = {"chat_id": chat_id, "text": text}
    if parse_mode:
        params["parse_mode"] = parse_mode
    if reply_markup:
        params["reply_markup"] = reply_markup
    return api_call("sendMessage", params)

def delete_message(chat_id: str, message_id: int) -> bool:
    res = api_call("deleteMessage", {"chat_id": chat_id, "message_id": message_id})
    return res.get("ok", False)

def create_keyboard(buttons: list[list[dict[str, str]]]) -> dict[str, Any]:
    return {"inline_keyboard": buttons}

def edit_message(chat_id: str, message_id: int, text: str, reply_markup: Optional[Dict[str, Any]] = None, parse_mode: Optional[str] = None) -> Dict[str, Any]:
    params = {"chat_id": chat_id, "message_id": message_id, "text": text}
    if parse_mode:
        params["parse_mode"] = parse_mode
    if reply_markup:
        params["reply_markup"] = reply_markup
    return api_call("editMessageText", params)

def download_file(url: str) -> Optional[bytes]:
    """Downloads a file from a URL and returns the bytes."""
    # Transform Google Drive links to direct download links
    if "drive.google.com" in url and "export=download" not in url:
        import re
        # Look for the file ID in the URL
        match = re.search(r'[-\w]{25,}', url)
        if match:
            file_id = match.group()
            url = f"https://drive.google.com/uc?export=download&id={file_id}"
            print(f"DEBUG: Transformed Google Drive URL to: {url}")

    try:
        import ssl
        context = ssl._create_unverified_context()
        req = request.Request(url)
        with request.urlopen(req, context=context) as response:
            return response.read()
    except Exception as e:
        print(f"DOWNLOAD ERROR ({url}): {e}")
        return None
