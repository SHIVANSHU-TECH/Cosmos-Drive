const { google } = require('googleapis');

// For public access, we'll use an API key
// You'll need to set this in your .env file
const API_KEY = process.env.GOOGLE_API_KEY;

// OAuth2 client credentials
const OAUTH2_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const OAUTH2_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback';

console.log('Drive service environment variables:');
console.log('GOOGLE_API_KEY:', API_KEY ? 'SET' : 'NOT SET');
console.log('OAUTH2_CLIENT_ID:', OAUTH2_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('OAUTH2_CLIENT_SECRET:', OAUTH2_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('REDIRECT_URI:', REDIRECT_URI);

// Initialize the Drive API client for public access
const publicDrive = google.drive({
  version: 'v3',
  auth: API_KEY
});

// Simple in-memory cache for file metadata (5 minutes cache)
const fileCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Add a timeout function for Google Drive operations
const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
  ]);
};

// Cache management functions
function getCachedData(key) {
  const cached = fileCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  fileCache.delete(key);
  return null;
}

function setCachedData(key, data) {
  fileCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Generate OAuth2 authentication URL
 * @returns {string} - Authentication URL
 */
function generateAuthUrl() {
  // Check if OAuth2 credentials are configured
  console.log('Checking OAuth2 credentials in generateAuthUrl:');
  console.log('OAUTH2_CLIENT_ID:', OAUTH2_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('OAUTH2_CLIENT_SECRET:', OAUTH2_CLIENT_SECRET ? 'SET' : 'NOT SET');
  console.log('REDIRECT_URI:', REDIRECT_URI);
  
  if (!OAUTH2_CLIENT_ID || !OAUTH2_CLIENT_SECRET) {
    const error = new Error('OAuth2 credentials not configured');
    console.error('OAuth2 credentials not configured:', {
      OAUTH2_CLIENT_ID: OAUTH2_CLIENT_ID ? 'SET' : 'NOT SET',
      OAUTH2_CLIENT_SECRET: OAUTH2_CLIENT_SECRET ? 'SET' : 'NOT SET'
    });
    throw error;
  }
  
  const oauth2Client = new google.auth.OAuth2(
    OAUTH2_CLIENT_ID,
    OAUTH2_CLIENT_SECRET,
    REDIRECT_URI
  );
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  });
}

/**
 * Get OAuth2 tokens from authorization code
 * @param {string} code - Authorization code
 * @returns {Promise<Object>} - Tokens object
 */
async function getOAuthTokens(code) {
  // Check if OAuth2 credentials are configured
  if (!OAUTH2_CLIENT_ID || !OAUTH2_CLIENT_SECRET) {
    throw new Error('OAuth2 credentials not configured');
  }
  
  const oauth2Client = new google.auth.OAuth2(
    OAUTH2_CLIENT_ID,
    OAUTH2_CLIENT_SECRET,
    REDIRECT_URI
  );
  
  try {
    console.log('Exchanging code for tokens with Google OAuth service');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Successfully received tokens from Google OAuth service');
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('invalid_grant')) {
      throw new Error('Authorization code has expired or already been used. Please try signing in again.');
    } else if (error.message.includes('fetch failed') || error.code === 'ENOTFOUND') {
      throw new Error('Failed to connect to Google OAuth service. Please check your network connection and try again.');
    } else {
      throw new Error('Failed to exchange authorization code for tokens: ' + error.message);
    }
  }
}

/**
 * Initialize Drive API client with user OAuth credentials
 * @param {string} accessToken - User's OAuth access token
 * @returns {Object} - Authenticated Drive API client
 */
function getAuthenticatedDrive(accessToken) {
  // Check if OAuth2 credentials are configured
  if (!OAUTH2_CLIENT_ID || !OAUTH2_CLIENT_SECRET) {
    throw new Error('OAuth2 credentials not configured');
  }
  
  const client = new google.auth.OAuth2(
    OAUTH2_CLIENT_ID,
    OAUTH2_CLIENT_SECRET,
    REDIRECT_URI
  );
  client.setCredentials({ access_token: accessToken });
  
  return google.drive({
    version: 'v3',
    auth: client
  });
}

/**
 * Fetch files from a specific folder (public access)
 * @param {string} folderId - The ID of the Google Drive folder
 * @param {string} searchTerm - Optional search term to filter files
 * @returns {Promise<Array>} - Array of file objects
 */
async function getFilesFromFolderPublic(folderId, searchTerm = '') {
  try {
    // Check cache first
    const cacheKey = `public_${folderId}_${searchTerm}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('Returning cached data for folder:', folderId);
      return cachedData;
    }
    
    let query = `'${folderId}' in parents and trashed = false`;
    
    // Add search term to query if provided
    if (searchTerm) {
      query += ` and name contains '${searchTerm}'`;
    }
    
    // Add timeout to Google Drive operation (8 seconds for better performance)
    const response = await withTimeout(publicDrive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, iconLink, owners(displayName, emailAddress), permissions, parents)',
      orderBy: 'name'
    }), 8000);
    
    const files = response.data.files || [];
    
    // Cache the results
    setCachedData(cacheKey, files);
    
    return files;
  } catch (error) {
    console.error('Error fetching files from folder (public):', error);
    
    // Provide more specific error messages
    if (error.code === 404) {
      throw new Error('Folder not found. Please check the folder ID and ensure it is publicly accessible.');
    } else if (error.code === 403) {
      throw new Error('Access denied to folder. The folder may not be publicly shared or the API key may not have sufficient permissions.');
    } else if (error.code === 401) {
      throw new Error('Invalid API key. Please check your API key configuration.');
    }
    
    throw error;
  }
}

/**
 * Fetch files from a specific folder (private access with user authentication)
 * @param {string} accessToken - User's OAuth access token
 * @param {string} folderId - The ID of the Google Drive folder
 * @param {string} searchTerm - Optional search term to filter files
 * @returns {Promise<Array>} - Array of file objects
 */
async function getFilesFromFolderPrivate(accessToken, folderId, searchTerm = '') {
  try {
    // Check cache first
    const cacheKey = `private_${folderId}_${accessToken.substring(0, 10)}_${searchTerm}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('Returning cached data for private folder:', folderId);
      return cachedData;
    }
    
    const drive = getAuthenticatedDrive(accessToken);
    
    let query = `'${folderId}' in parents and trashed = false`;
    
    // Add search term to query if provided
    if (searchTerm) {
      query += ` and name contains '${searchTerm}'`;
    }
    
    // Add timeout to Google Drive operation (8 seconds for better performance)
    const response = await withTimeout(drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, iconLink, owners(displayName, emailAddress), permissions, parents)',
      orderBy: 'name'
    }), 8000);
    
    const files = response.data.files || [];
    
    // Cache the results
    setCachedData(cacheKey, files);
    
    return files;
  } catch (error) {
    console.error('Error fetching files from folder (private):', error);
    throw error;
  }
}

/**
 * Get file details (public access)
 * @param {string} fileId - The ID of the Google Drive file
 * @returns {Promise<Object>} - File object with details
 */
async function getFileDetailsPublic(fileId) {
  try {
    // Add timeout to Google Drive operation (10 seconds)
    const response = await withTimeout(publicDrive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, iconLink, parents, owners(displayName, emailAddress), permissions'
    }), 10000);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching file details (public):', error);
    throw error;
  }
}

/**
 * Get file details (private access with user authentication)
 * @param {string} accessToken - User's OAuth access token
 * @param {string} fileId - The ID of the Google Drive file
 * @returns {Promise<Object>} - File object with details
 */
async function getFileDetailsPrivate(accessToken, fileId) {
  try {
    const drive = getAuthenticatedDrive(accessToken);
    
    // Add timeout to Google Drive operation (10 seconds)
    const response = await withTimeout(drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, iconLink, parents, owners(displayName, emailAddress), permissions'
    }), 10000);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching file details (private):', error);
    throw error;
  }
}

/**
 * Get folder path (breadcrumb trail) - works for both public and private
 * @param {string} accessToken - User's OAuth access token (optional for public access)
 * @param {string} folderId - The ID of the Google Drive folder
 * @returns {Promise<Array>} - Array of folder objects representing the path
 */
async function getFolderPath(accessToken, folderId) {
  try {
    // Use authenticated client if access token is provided, otherwise use public client
    const drive = accessToken ? getAuthenticatedDrive(accessToken) : publicDrive;
    
    const path = [];
    let currentId = folderId;
    
    // Keep going up the hierarchy until we reach the root or a limit
    while (currentId && path.length < 10) { // Limit to prevent infinite loops
      // Add timeout to Google Drive operation (5 seconds)
      const response = await withTimeout(drive.files.get({
        fileId: currentId,
        fields: 'id, name, parents'
      }), 5000);
      
      const folder = response.data;
      path.unshift({
        id: folder.id,
        name: folder.name
      });
      
      // Move to parent
      currentId = folder.parents && folder.parents.length > 0 ? folder.parents[0] : null;
      
      // Break if we've reached the root
      if (!currentId) break;
    }
    
    return path;
  } catch (error) {
    console.error('Error fetching folder path:', error);
    throw error;
  }
}

/**
 * Get public PDF content
 * @param {string} fileId - The ID of the Google Drive PDF file
 * @returns {Promise<Buffer>} - PDF content as buffer
 */
async function getPublicPdfContent(fileId) {
  try {
    // Add timeout to Google Drive operation (15 seconds)
    const response = await withTimeout(publicDrive.files.get(
      {
        fileId: fileId,
        alt: 'media'
      },
      {
        responseType: 'stream'
      }
    ), 15000);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching public PDF content:', error);
    
    // Provide more specific error messages
    if (error.code === 404) {
      throw new Error('PDF file not found. Please check the file ID and ensure it is publicly accessible.');
    } else if (error.code === 403) {
      throw new Error('Access denied to PDF file. The file may not be publicly shared or the API key may not have sufficient permissions.');
    } else if (error.code === 401) {
      throw new Error('Invalid API key. Please check your API key configuration.');
    } else if (error.code === 400) {
      throw new Error('Invalid file type. Only PDF files can be previewed.');
    }
    
    throw error;
  }
}

module.exports = {
  getFilesFromFolderPublic,
  getFilesFromFolderPrivate,
  getFileDetailsPublic,
  getFileDetailsPrivate,
  getFolderPath,
  generateAuthUrl,
  getOAuthTokens,
  getPublicPdfContent
};
