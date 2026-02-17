import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  "http://localhost:3000/oauth2callback"
);

(async () => {
  const { tokens } = await oauth2Client.getToken("4/0AfrIepAivVyy8w4RlGaOKwP8Kt4GHKSYVWP1JEUxIs3vfZCQokpcIObCsR7ey1Eh12Osvg&scope=https://www.googleapis.com/auth/drive");
  console.log(tokens);
})();
