import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type BookEntry = {
  title: string;
  author: string;
  file_link: string;
};

type RequestEntry = {
  timestamp: string;
  title: string;
  author: string;
  description?: string;
  email: string;
  userType: string;
  status: 'available' | 'not_found' | 'delivery_failed' | 'delivered';
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || RESEND_FROM_EMAIL;

const BOOKS_FILE = path.join(process.cwd(), 'book_bot', 'books.json');
const REQUESTS_FILE = path.join(process.cwd(), 'book_bot', 'requests.json');

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'book';
}

function extFromMime(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('epub')) return 'epub';
  if (mimeType.includes('zip')) return 'zip';
  if (mimeType.includes('msword')) return 'doc';
  if (mimeType.includes('officedocument.wordprocessingml.document')) return 'docx';
  if (mimeType.includes('plain')) return 'txt';
  return 'bin';
}

function extractGoogleDriveFileId(link: string): string | null {
  try {
    const url = new URL(link);

    if (url.hostname.includes('drive.google.com')) {
      const idFromQuery = url.searchParams.get('id');
      if (idFromQuery) {
        return idFromQuery;
      }

      const match = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

function toDirectDownloadLink(link: string): string {
  const id = extractGoogleDriveFileId(link);
  if (!id) {
    return link;
  }
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

async function ensureRequestsFile() {
  if (!existsSync(REQUESTS_FILE)) {
    await writeFile(REQUESTS_FILE, '[]\n', 'utf8');
  }
}

async function readRequestLog(): Promise<RequestEntry[]> {
  await ensureRequestsFile();
  try {
    const raw = await readFile(REQUESTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as RequestEntry[];
  } catch {
    return [];
  }
}

async function readBooks(): Promise<BookEntry[]> {
  if (!existsSync(BOOKS_FILE)) {
    return [];
  }

  try {
    const raw = await readFile(BOOKS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is BookEntry => {
      return (
        typeof item?.title === 'string' &&
        typeof item?.author === 'string' &&
        typeof item?.file_link === 'string'
      );
    });
  } catch {
    return [];
  }
}

function findBook(books: BookEntry[], title: string, author: string): BookEntry | undefined {
  const wantedTitle = normalize(title);
  const wantedAuthor = normalize(author);

  return books.find((book) => {
    const titleMatch = wantedTitle ? normalize(book.title).includes(wantedTitle) : true;
    const authorMatch = wantedAuthor ? normalize(book.author).includes(wantedAuthor) : true;
    return titleMatch && authorMatch;
  });
}

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const payload = await response.json();
    return response.ok && Boolean(payload?.ok);
  } catch {
    return false;
  }
}

async function sendTelegramMessageWithTracking(chatId: string, text: string): Promise<{ ok: boolean; messageId?: string }> {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const payload = await response.json();
    if (response.ok && payload?.ok) {
      return { ok: true, messageId: payload.result?.message_id };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

async function sendTelegramDocumentWithTracking(
  chatId: string,
  fileBuffer: Buffer,
  fileName: string,
  caption: string
): Promise<{ ok: boolean; messageId?: string }> {
  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    const bytes = new Uint8Array(fileBuffer);
    formData.append('document', new Blob([bytes]), fileName);

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const payload = await response.json();
    if (response.ok && payload?.ok) {
      return { ok: true, messageId: payload.result?.message_id };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

async function deleteTelegramMessage(chatId: string, messageId: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });

    const payload = await response.json();
    return response.ok && Boolean(payload?.ok);
  } catch {
    return false;
  }
}

async function clearIntermediateMessages(chatId: string, messageIds: string[]): Promise<void> {
  for (const messageId of messageIds) {
    if (messageId) {
      await deleteTelegramMessage(chatId, messageId);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

async function logRequest(entry: RequestEntry) {
  const log = await readRequestLog();
  log.push(entry);
  await writeFile(REQUESTS_FILE, `${JSON.stringify(log, null, 2)}\n`, 'utf8');
}

function formatNotFoundAdminMessage(title: string, author: string, email: string, description: string): string {
  return [
    '<b>NEW BOOK REQUEST</b>',
    '<b>🚫 NOT FOUND 🚫</b>',
    '',
    '<i>📚 Book Details:</i>',
    '<b>📖 Title:</b> <code>' + (title || '-') + '</code>',
    '<b>✍️ Author:</b> <code>' + (author || '-') + '</code>',
    '<b>📧 Email:</b> <code>' + (email || '-') + '</code>',
    '<b>📝 Details:</b> <i>' + (description || '-') + '</i>',
    '',
    '❌ <u>Status</u>: <b>Book not found in library</b>',
    '🔍 <u>Action</u>: <i>Please search and add this book to the collection</i>'
  ].join('\n');
}

function formatAvailableAdminMessage(title: string, author: string, email: string, description: string): string {
  return [
    '<b>NEW BOOK REQUEST</b>',
    '<b>✅ AVAILABLE ✅</b>',
    '',
    '<i>📚 Book Details:</i>',
    '<b>📖 Title:</b> <code>' + (title || '-') + '</code>',
    '<b>✍️ Author:</b> <code>' + (author || '-') + '</code>',
    '<b>📧 Email:</b> <code>' + (email || '-') + '</code>',
    '<b>📝 Details:</b> <i>' + (description || '-') + '</i>',
    '',
    '✅ <u>Status</u>: <b>Book found and available for delivery</b>',
    '🚀 <u>Action</u>: <i>Processing delivery...</i>'
  ].join('\n');
}

function buildEmailHtml(book: BookEntry, downloadUrl: string, title: string, author: string, description: string): string {
  return `
    <h2>This email was sent by Books_Request.</h2>
    <p>Attached to this mail is the book you requested from Lib-Sek.</p>
    <ul>
      <li><strong>Requested Title:</strong> ${title || '-'}</li>
      <li><strong>Requested Author:</strong> ${author || '-'}</li>
      <li><strong>Matched Book:</strong> ${book.title}</li>
      <li><strong>Matched Author:</strong> ${book.author}</li>
      <li><strong>Details:</strong> ${description || '-'}</li>
    </ul>
    <p>Direct download link: <a href="${downloadUrl}">${downloadUrl}</a></p>
  `;
}

async function fetchBookFile(book: BookEntry): Promise<{ fileBuffer: Buffer; fileName: string; mimeType: string; downloadUrl: string } | null> {
  try {
    const downloadUrl = toDirectDownloadLink(book.file_link);
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return null;
    }

    const fileBuffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || '';
    const fileNameFromHeader = /filename\*?=(?:UTF-8''|\")?([^\";]+)/i.exec(contentDisposition)?.[1];
    const fileName = fileNameFromHeader
      ? sanitizeFilename(decodeURIComponent(fileNameFromHeader))
      : `${sanitizeFilename(book.title)}.${extFromMime(mimeType)}`;

    return {
      fileBuffer,
      fileName,
      mimeType,
      downloadUrl,
    };
  } catch {
    return null;
  }
}

async function sendBookEmail(
  email: string,
  book: BookEntry,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  downloadUrl: string,
  requestedTitle: string,
  requestedAuthor: string,
  description: string
): Promise<{ ok: boolean; error?: string; provider?: string; messageId?: string }> {
  const subject = `Book Request Fulfilled: ${book.title}`;
  const text = [
    'This email was sent by Books_Request.',
    'Attached to this mail is the book you requested from Lib-Sek.',
    '',
    `Requested Title: ${requestedTitle || '-'}`,
    `Requested Author: ${requestedAuthor || '-'}`,
    `Matched Book: ${book.title}`,
    `Matched Author: ${book.author}`,
    `Details: ${description || '-'}`,
    `Direct link: ${downloadUrl}`,
  ].join('\n');
  const html = buildEmailHtml(book, downloadUrl, requestedTitle, requestedAuthor, description);
  const attachmentContent = fileBuffer.toString('base64');

  // Accept SendGrid key from SENDGRID_API_KEY, or RESEND_API_KEY when it uses SG.* format.
  const sendGridKey = SENDGRID_API_KEY || (RESEND_API_KEY.startsWith('SG.') ? RESEND_API_KEY : '');
  if (sendGridKey) {
    if (!SENDGRID_FROM_EMAIL) {
      return { ok: false, error: 'Missing SENDGRID_FROM_EMAIL (or RESEND_FROM_EMAIL fallback)' };
    }

    const payload = {
      personalizations: [
        {
          to: [{ email }],
          subject,
        },
      ],
      from: { email: SENDGRID_FROM_EMAIL },
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
      attachments: [
        {
          content: attachmentContent,
          filename: fileName,
          type: mimeType,
          disposition: 'attachment',
        },
      ],
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendGridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const messageId = response.headers.get('x-message-id') || undefined;
      return { ok: true, provider: 'sendgrid', messageId };
    }

    let errorMessage = `HTTP ${response.status}`;
    try {
      const failure = await response.json();
      const detail = Array.isArray(failure?.errors)
        ? failure.errors.map((e: { message?: string }) => e?.message || JSON.stringify(e)).join('; ')
        : JSON.stringify(failure);
      errorMessage = `${errorMessage}: ${detail}`;
    } catch {
      try {
        const bodyText = await response.text();
        if (bodyText) {
          errorMessage = `${errorMessage}: ${bodyText}`;
        }
      } catch {
        // Ignore parsing errors and keep fallback status message.
      }
    }

    return { ok: false, error: errorMessage, provider: 'sendgrid' };
  }

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return { ok: false, error: 'Missing SendGrid key or RESEND_API_KEY/RESEND_FROM_EMAIL' };
  }

  const resendPayload = {
    from: RESEND_FROM_EMAIL,
    to: [email],
    subject,
    text,
    html,
    attachments: [
      {
        filename: fileName,
        content: attachmentContent,
        content_type: mimeType,
      },
    ],
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resendPayload),
  });

  if (response.ok) {
    let messageId: string | undefined;
    try {
      const payload = await response.json();
      if (typeof payload?.id === 'string') {
        messageId = payload.id;
      }
    } catch {
      // Keep success even when parsing response body fails.
    }
    return { ok: true, provider: 'resend', messageId };
  }

  let errorMessage = `HTTP ${response.status}`;
  try {
    const failure = await response.json();
    const detail = typeof failure?.message === 'string' ? failure.message : JSON.stringify(failure);
    errorMessage = `${errorMessage}: ${detail}`;
  } catch {
    try {
      const text = await response.text();
      if (text) {
        errorMessage = `${errorMessage}: ${text}`;
      }
    } catch {
      // Ignore parsing errors and keep fallback status message.
    }
  }

  return { ok: false, error: errorMessage, provider: 'resend' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const author = typeof body?.author === 'string' ? body.author.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const userType = typeof body?.userType === 'string' ? body.userType.trim() : 'guest';

    if (!title && !author) {
      return NextResponse.json({ error: 'Please provide at least a title or author.' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const books = await readBooks();
    const match = findBook(books, title, author);

    if (match) {
      const intermediateMessageIds: string[] = [];

      // Send initial "AVAILABLE" message with tracking
      const availableResult = await sendTelegramMessageWithTracking(
        ADMIN_CHAT_ID,
        formatAvailableAdminMessage(title, author, email, description)
      );
      if (availableResult.messageId) {
        intermediateMessageIds.push(availableResult.messageId);
      }

      const fetched = await fetchBookFile(match);
      if (!fetched) {
        const entry: RequestEntry = {
          timestamp: new Date().toISOString(),
          title,
          author,
          description,
          email,
          userType,
          status: 'delivery_failed',
        };
        await logRequest(entry);

        await sendTelegramMessage(
          ADMIN_CHAT_ID,
          `Delivery failed.\nTitle: ${title || '-'}\nAuthor: ${author || '-'}\nEmail: ${email || '-'}\nReason: Could not download file from link.`
        );

        // Clear intermediate messages on failure
        await clearIntermediateMessages(ADMIN_CHAT_ID, intermediateMessageIds);

        return NextResponse.json(
          {
            error:
              'Book found, but download failed. Ensure that the Google Drive file is shared publicly and uses a valid link.',
          },
          { status: 502 }
        );
      }

      // Send delivery preview message with tracking
      const telegramResult = await sendTelegramDocumentWithTracking(
        ADMIN_CHAT_ID,
        fetched.fileBuffer,
        fetched.fileName,
        `Book delivery preview:\n${match.title} by ${match.author}`
      );
      if (telegramResult.messageId) {
        intermediateMessageIds.push(telegramResult.messageId);
      }

      const telegramDelivered = telegramResult.ok;

      const emailResult = await sendBookEmail(
        email,
        match,
        fetched.fileBuffer,
        fetched.fileName,
        fetched.mimeType,
        fetched.downloadUrl,
        title,
        author,
        description
      );
      const emailed = emailResult.ok;

      const succeeded = telegramDelivered && emailed;
      const entry: RequestEntry = {
        timestamp: new Date().toISOString(),
        title,
        author,
        description,
        email,
        userType,
        status: succeeded ? 'delivered' : 'delivery_failed',
      };
      await logRequest(entry);

      if (!succeeded) {
        await sendTelegramMessage(
          ADMIN_CHAT_ID,
          [
            'Delivery failed.',
            `Title: ${title || '-'}`,
            `Author: ${author || '-'}`,
            `Email: ${email || '-'}`,
            `Telegram Upload: ${telegramDelivered ? 'ok' : 'failed'}`,
            `Email Send: ${emailed ? 'ok' : 'failed'}`,
            `Email Error: ${emailResult.error || '-'}`,
          ].join('\n')
        );

        // Clear intermediate messages on failure
        await clearIntermediateMessages(ADMIN_CHAT_ID, intermediateMessageIds);

        return NextResponse.json(
          {
            error:
              `Book found, but final delivery failed. ${emailResult.error || 'Check Telegram bot permissions and RESEND email configuration.'}`,
          },
          { status: 502 }
        );
      }

      // Send final completion message
      const completionResult = await sendTelegramMessageWithTracking(
        ADMIN_CHAT_ID,
        [
          '<b>🎉 DELIVERY COMPLETED 🎉</b>',
          '',
          '<i>📚 Book Details:</i>',
          '<b>📖 Title:</b> <code>' + (title || '-') + '</code>',
          '<b>✍️ Author:</b> <code>' + (author || '-') + '</code>',
          '<b>📧 Email:</b> <code>' + (email || '-') + '</code>',
          '',
          '<i>📋 Delivery Status:</i>',
          '📤 <b>Telegram Upload:</b> <code>✅ ok</code>',
          '📧 <b>Email Send:</b> <code>✅ accepted (queued)</code>',
          '🔌 <b>Email Provider:</b> <code>' + (emailResult.provider || '-') + '</code>',
          '🆔 <b>Email Message ID:</b> <code>' + (emailResult.messageId || '-') + '</code>',
        ].join('\n')
      );

      if (!completionResult.ok) {
        console.error('Failed to send completion message');
      }

      // Wait a moment for the completion message to be fully delivered, then clear intermediate messages
      setTimeout(async () => {
        await clearIntermediateMessages(ADMIN_CHAT_ID, intermediateMessageIds);
      }, 2000);

      return NextResponse.json({ success: true, message: 'Book delivered to Telegram and sent to email.' });
    }

    const entry: RequestEntry = {
      timestamp: new Date().toISOString(),
      title,
      author,
      description,
      email,
      userType,
      status: 'not_found',
    };
    await logRequest(entry);

    await sendTelegramMessage(
      ADMIN_CHAT_ID,
      formatNotFoundAdminMessage(title, author, email, description)
    );

    return NextResponse.json({ success: true, message: 'Request logged. Admin has been notified.' });
  } catch (error) {
    console.error('Book request API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
