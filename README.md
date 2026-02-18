# Library Management System

A Next.js-based library management system built for deployment on Netlify.

## Features

- User authentication with NextAuth.js
- Book management and catalog
- File upload and Google Drive integration
- Book request system
- Admin dashboard
- Responsive design with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 16.1.6
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: Prisma with JSON file storage
- **Deployment**: Netlify

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXTAUTH_URL=https://your-domain.netlify.app
NEXTAUTH_SECRET=your-secret-key
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.netlify.app/api/auth/callback/google
```

## Deployment

### Netlify Deployment

1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy - Netlify will automatically build and deploy

### Build Configuration

The project is configured for Netlify deployment with:

- **Build Command**: `npm run build`
- **Publish Directory**: `.next`
- **Node Version**: 20

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── auth/          # Authentication pages
│   ├── dashboard/    # Main dashboard
│   └── ...
├── components/        # Reusable components
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
└── ...
```

## API Routes

- `/api/auth/[...nextauth]` - NextAuth.js authentication
- `/api/books-admin` - Book management
- `/api/upload-to-drive` - Google Drive upload
- `/api/openlibrary` - Open Library integration

## Security Features

- Protected routes with authentication
- File upload validation
- XSS protection headers
- CSRF protection via NextAuth.js

## Notes

- The project uses file-based storage for simplicity
- Google Drive integration requires OAuth setup
- All API routes are server-side rendered for security
