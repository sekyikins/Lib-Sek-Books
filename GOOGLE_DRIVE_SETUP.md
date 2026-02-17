# Google Drive Integration Setup

This document explains how to set up Google Drive integration for file uploads.

## Current Status

The system is currently set up with a **fallback implementation** that saves files locally. Google Drive upload is prepared but requires configuration.

## To Enable Google Drive Upload

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Drive API**
4. Create a **Service Account**:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Give it a name (e.g., "book-uploader")
   - Grant it the "Editor" role for Drive API
5. Download the JSON key file and save it as `google-service-account-key.json` in your project root

### 2. Google Drive OAuth Setup

**Option A: OAuth 2.0 (Recommended for Personal Use)**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `books-request-487711-g6`
3. Go to "APIs & Services" → "Credentials"
4. Create "OAuth 2.0 Client ID" → "Web application"
5. Add redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Get the refresh token by completing OAuth flow once
7. Store refresh token in environment variables

**Option B: Service Account (For Automated Systems)**
1. Use existing service account setup
2. Requires Shared Drives for storage quota

### 3. Install Dependencies

```bash
npm install @googleapis/drive
```

### 4. Environment Configuration

Create a `.env.local` file with:

```env
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
GOOGLE_OAUTH_CLIENT_ID=your_oauth_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_oauth_client_secret_here
GOOGLE_OAUTH_REFRESH_TOKEN=your_refresh_token_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 5. Activate Google Drive Upload

In `src/app/api/upload-to-drive/route.ts`, uncomment the Google Drive implementation and remove the `throw new Error('Google Drive API not configured');` line.

## Features

### Current Implementation (Local Fallback)
- Files are saved to `/uploads` directory
- File validation (type, size)
- Multiple file upload support
- Proper error handling

### Google Drive Integration (When Configured)
- Direct upload to specified Google Drive folder
- Automatic file sharing permissions
- Cleanup of local temporary files
- Shareable Google Drive links

## File Upload Features

- **Supported formats**: PDF, EPUB, DOC, DOCX, TXT
- **Maximum file size**: 50MB per file
- **Multiple files**: Can upload multiple books at once
- **Validation**: Client and server-side validation
- **Progress indicators**: Loading states during upload

## Security Notes

- Files are validated for type and size
- Filenames are sanitized to prevent path traversal
- Service account should have minimal required permissions
- Consider implementing virus scanning for production use

## Testing

The system works immediately with the local fallback. Test the upload functionality before configuring Google Drive to ensure everything works properly.
