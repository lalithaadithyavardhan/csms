const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes for Google Drive API
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
];

/**
 * Generate authentication URL
 */
const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
  });
};

/**
 * Get tokens from authorization code
 */
const getTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

/**
 * Set credentials for oauth2Client
 */
const setCredentials = (tokens) => {
  oauth2Client.setCredentials(tokens);
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (refreshToken) => {
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
};

/**
 * Get user info from Google
 */
const getUserInfo = async (accessToken) => {
  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: 'v2',
  });

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  const { data } = await oauth2.userinfo.get();
  return data;
};

module.exports = {
  oauth2Client,
  getAuthUrl,
  getTokens,
  setCredentials,
  refreshAccessToken,
  getUserInfo,
  SCOPES,
};
