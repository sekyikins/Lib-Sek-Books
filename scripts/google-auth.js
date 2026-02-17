const { google } = require("googleapis");

require('dotenv').config({ path: '.env.local' });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  "http://localhost:3000/oauth2callback"
);

(async () => {
  try {
    const { tokens } = await oauth2Client.getToken("4/0AfrIepCSRiR4l_nyY477ZglmHD-lyk5N1cOEXdVP3xsVKfzCsHcIwMD7KmLHSi78qlgi_Q&scope=https://www.googleapis.com/auth/drive");
    console.log("Tokens received:");
    console.log(JSON.stringify(tokens, null, 2));
    
    if (tokens.refresh_token) {
      console.log("\n✅ Success! Your refresh token is:");
      console.log(tokens.refresh_token);
      console.log("\nAdd this to your .env.local file:");
      console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      console.log("\n⚠️  No refresh token received. Make sure you used 'prompt: consent' in the auth URL.");
    }
  } catch (error) {
    console.error("Error getting tokens:", error.message);
  }
})();
