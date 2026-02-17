require('dotenv').config({ path: '.env.local' });

// Manual token exchange using HTTP request
async function exchangeCodeForTokens(code) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = "http://localhost:3000/oauth2callback";
  
  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  });
  
  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const tokens = await response.json();
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error.message);
    throw error;
  }
}

(async () => {
  try {
    const code = "4/0AfrIepCSRiR4l_nyY477ZglmHD-lyk5N1cOEXdVP3xsVKfzCsHcIwMD7KmLHSi78qlgi_Q";
    
    // Remove the scope parameter from the code if present
    const cleanCode = code.split('&')[0];
    
    console.log("Exchanging code for tokens...");
    const tokens = await exchangeCodeForTokens(cleanCode);
    
    console.log("Tokens received:");
    console.log(JSON.stringify(tokens, null, 2));
    
    if (tokens.refresh_token) {
      console.log("\n✅ Success! Your refresh token is:");
      console.log(tokens.refresh_token);
      console.log("\nAdd this to your .env.local file:");
      console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      console.log("\n⚠️  No refresh token received. This might happen if:");
      console.log("   - You didn't use 'prompt: consent' in the auth URL");
      console.log("   - The user has already authorized this app before");
      console.log("   - The refresh token was already issued and can't be reissued");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
