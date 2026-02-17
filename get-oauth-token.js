#!/usr/bin/env node

/**
 * Script to get Google OAuth refresh token
 * Run this script once to get your refresh token
 */

import { google } from 'google-auth-library';
import readline from 'readline';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your environment');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Generate the URL for authorization
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // Important for refresh token
  scope: ['https://www.googleapis.com/auth/drive.file'],
  prompt: 'consent' // Force consent to get refresh token
});

console.log('Please visit this URL to authorize the application:');
console.log(authUrl);
console.log('\nAfter authorizing, you will be redirected to a page.');
console.log('Copy the full URL from the address bar and paste it below.\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the URL you were redirected to: ', (callbackUrl) => {
  try {
    // Extract the authorization code from the callback URL
    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');
    
    if (!code) {
      console.error('No authorization code found in the URL');
      process.exit(1);
    }

    // Exchange the code for tokens
    oauth2Client.getToken(code, (err, tokens) => {
      if (err) {
        console.error('Error retrieving tokens:', err);
        process.exit(1);
      }

      console.log('\n✅ Success! Your refresh token is:');
      console.log(tokens.refresh_token);
      console.log('\nAdd this to your .env.local file:');
      console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
      
      rl.close();
    });
  } catch (error) {
    console.error('Error parsing callback URL:', error);
    process.exit(1);
  }
});
