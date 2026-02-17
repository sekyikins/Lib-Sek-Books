require('dotenv').config({ path: '.env.local' });

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const redirectUri = "http://localhost:3000/oauth2callback";
const scope = "https://www.googleapis.com/auth/drive";

// Construct the OAuth URL manually
const baseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const params = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: "code",
  scope: scope,
  access_type: "offline",
  prompt: "consent"
});

const authUrl = `${baseUrl}?${params.toString()}`;

console.log("Authorize this app by visiting this url:");
console.log(authUrl);
