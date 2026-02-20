import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

// Google Drive folder ID (you can make this configurable via environment variables)
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1B80Ei9Gx9sx6ViKKcKoPRL-V7IIonE4v';

// Define types for Google Drive API
interface GoogleDriveFile {
  id?: string;
}

interface GoogleDriveResponse {
  data: GoogleDriveFile;
}

export async function POST(request: NextRequest) {
  try {
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }
    
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = [
      'application/pdf',
      'application/epub+zip',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PDF, EPUB, DOC, DOCX, and TXT files are allowed' 
      }, { status: 400 });
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size must be less than 50MB' 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create unique filename for Google Drive
    const timestamp = Date.now();
    const sanitizedName = name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;

    // Upload directly to Google Drive
    try {
      const googleDriveUrl = await uploadToGoogleDrive(buffer, fileName, file.type);
      
      return NextResponse.json({
        success: true,
        fileUrl: googleDriveUrl,
        fileName: sanitizedName,
        message: 'File uploaded successfully to Google Drive'
      });
      
    } catch (driveError) {
      console.error('Google Drive upload failed:', driveError);
      
      return NextResponse.json({
        error: 'Failed to upload file. Google Drive configuration required.',
        details: driveError instanceof Error ? driveError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

async function uploadToGoogleDrive(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  try {
    // Debug: Check environment variables
    console.log('Environment check:');
    console.log('GOOGLE_DRIVE_FOLDER_ID:', process.env.GOOGLE_DRIVE_FOLDER_ID);
    console.log('GOOGLE_OAUTH_CLIENT_ID:', process.env.GOOGLE_OAUTH_CLIENT_ID);
    console.log('GOOGLE_OAUTH_CLIENT_SECRET:', process.env.GOOGLE_OAUTH_CLIENT_SECRET);
    
    // Dynamic import to avoid module loading issues
    const { drive } = await import('@googleapis/drive');
    const { OAuth2Client } = await import('google-auth-library');
    
    // OAuth2 client setup
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      'http://localhost:3000/oauth2callback' // Redirect URI matching OAuth setup
    );
    
    // For this implementation, we'll use a refresh token approach
    // In production, you'd store and reuse the refresh token
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    
    if (!refreshToken) {
      throw new Error('Google OAuth refresh token not configured. Please set up OAuth flow first.');
    }
    
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const driveClient = drive({ version: 'v3', auth: oauth2Client });
    
    // Create file metadata
    const fileMetadata = {
      name: fileName,
      parents: [GOOGLE_DRIVE_FOLDER_ID]
    };
    
    // Create file media
    const media = {
      mimeType: mimeType,
      body: Readable.from(buffer)
    };
    
    // Upload file
    const response = await driveClient.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    }) as GoogleDriveResponse;
    
    if (!response.data.id) {
      throw new Error('Failed to get file ID from Google Drive');
    }
    
    // Make file publicly accessible
    await driveClient.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    return `https://drive.google.com/file/d/${response.data.id}/view?usp=sharing`;
    
  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw new Error(`Google Drive upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
