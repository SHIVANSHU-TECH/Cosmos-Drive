// Import required modules
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
console.log('Current working directory:', process.cwd());
console.log('Directory contents:', fs.readdirSync(process.cwd()));

// Try to load .env.local first, then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

console.log('Checking for .env.local at:', envLocalPath);
console.log('.env.local exists:', fs.existsSync(envLocalPath));

console.log('Checking for .env at:', envPath);
console.log('.env exists:', fs.existsSync(envPath));

if (fs.existsSync(envLocalPath)) {
  console.log('Loading .env.local file...');
  const resultLocal = dotenv.config({ path: envLocalPath });
  if (resultLocal.error) {
    console.log('Error loading .env.local file:', resultLocal.error.message);
  } else {
    console.log('.env.local file loaded successfully');
  }
} else {
  console.log('No .env.local file found');
}

// Load .env file as fallback
if (fs.existsSync(envPath)) {
  console.log('Loading .env file...');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.log('Error loading .env file:', result.error.message);
  } else {
    console.log('.env file loaded successfully');
  }
} else {
  console.log('No .env file found');
}

console.log('Environment variables after loading:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('REDIRECT_URI:', process.env.REDIRECT_URI);
console.log('PORT:', process.env.PORT);

// Import controllers
const driveController = require('./backend/controllers/driveController');
const authController = require('./backend/controllers/authController');
const collegexController = require('./backend/controllers/collegexController');

// Import middleware
const { authenticateToken } = require('./backend/middleware/auth');
const { authenticateApiKey } = require('./backend/middleware/apiKeyAuth');

// Import required modules for thumbnail proxy
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GOOGLE_API_KEY;

console.log('API_KEY:', API_KEY ? 'SET' : 'NOT SET');

// Configure CORS to allow requests from CollegeXConnect
const corsOptions = {
  origin: ['http://localhost:3000', 'https://collegexconnect.com', 'https://www.collegexconnect.com', 'https://cosmos-drive.vercel.app'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Add this middleware to handle preflight requests for all routes
app.options('*', cors(corsOptions));

// OAuth2 routes
app.get('/api/auth/url', authController.getAuthUrl);
app.get('/api/auth/callback', authController.handleOAuthCallback);

// Public API routes (no authentication required)
app.get('/api/public/drive/folder/:folderId', driveController.getFiles);
app.get('/api/public/drive/file/:fileId', driveController.getFile);
app.get('/api/public/drive/path/:folderId', driveController.getFolderPath);

// Private API routes (authentication required)
app.get('/api/private/drive/folder/:folderId', authenticateToken, driveController.getFiles);
app.get('/api/private/drive/file/:fileId', authenticateToken, driveController.getFile);
app.get('/api/private/drive/path/:folderId', authenticateToken, driveController.getFolderPath);

// Public thumbnail proxy route (no authentication required)
app.get('/api/public/drive/thumbnail/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('Public thumbnail request for file ID:', fileId);
    
    // Check if API_KEY is available
    if (!API_KEY) {
      console.error('API_KEY is not configured');
      return res.status(500).json({ error: 'Server configuration error: API key not available' });
    }
    
    // Use public drive client
    const drive = google.drive({
      version: 'v3',
      auth: API_KEY
    });
    
    // Get the thumbnail URL
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'thumbnailLink'
    });
    
    const thumbnailLink = response.data.thumbnailLink;
    console.log('Thumbnail link for file ID', fileId, ':', thumbnailLink);
    
    if (!thumbnailLink) {
      console.log('No thumbnail available for file ID:', fileId);
      return res.status(404).json({ error: 'Thumbnail not available' });
    }
    
    // Proxy the thumbnail
    const thumbnailResponse = await fetch(thumbnailLink);
    console.log('Thumbnail fetch response status:', thumbnailResponse.status);
    
    if (!thumbnailResponse.ok) {
      console.log('Failed to fetch thumbnail for file ID:', fileId, 'Status:', thumbnailResponse.status);
      // If we get a 401 or 403, it means the file is not publicly accessible
      if (thumbnailResponse.status === 401 || thumbnailResponse.status === 403) {
        return res.status(403).json({ error: 'File not publicly accessible' });
      }
      return res.status(500).json({ error: 'Failed to fetch thumbnail' });
    }
    
    // Set appropriate headers
    const contentType = thumbnailResponse.headers.get('content-type');
    console.log('Thumbnail content type:', contentType);
    if (contentType) {
      res.set('Content-Type', contentType);
    }
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Handle stream events
    thumbnailResponse.body.on('error', (err) => {
      console.error('Error streaming thumbnail for file ID', fileId, ':', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream thumbnail: ' + err.message });
      }
    });
    
    // Stream the thumbnail data
    thumbnailResponse.body.pipe(res);
  } catch (error) {
    console.error('Error proxying thumbnail for file ID:', req.params.fileId, error);
    
    // Check if it's an authentication error
    if (error.code === 401 || error.code === 403) {
      return res.status(403).json({ error: 'File not publicly accessible' });
    }
    
    // Check if headers have already been sent
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy thumbnail: ' + error.message });
    }
  }
});

// Private thumbnail proxy route (authentication required)
app.get('/api/private/drive/thumbnail/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    // Check if OAuth credentials are available
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('OAuth credentials are not configured');
      return res.status(500).json({ error: 'Server configuration error: OAuth credentials not available' });
    }
    
    // Create authenticated drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback'
    );
    oauth2Client.setCredentials({ access_token: token });
    
    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client
    });
    
    // Get the thumbnail URL
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'thumbnailLink'
    });
    
    const thumbnailLink = response.data.thumbnailLink;
    
    if (!thumbnailLink) {
      return res.status(404).json({ error: 'Thumbnail not available' });
    }
    
    // Proxy the thumbnail
    const thumbnailResponse = await fetch(thumbnailLink);
    
    if (!thumbnailResponse.ok) {
      // If we get a 401 or 403, it means there's an issue with the access token
      if (thumbnailResponse.status === 401 || thumbnailResponse.status === 403) {
        return res.status(403).json({ error: 'Access denied to thumbnail' });
      }
      return res.status(500).json({ error: 'Failed to fetch thumbnail' });
    }
    
    // Set appropriate headers
    const contentType = thumbnailResponse.headers.get('content-type');
    if (contentType) {
      res.set('Content-Type', contentType);
    }
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Handle stream events
    thumbnailResponse.body.on('error', (err) => {
      console.error('Error streaming thumbnail:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream thumbnail: ' + err.message });
      }
    });
    
    // Stream the thumbnail data
    thumbnailResponse.body.pipe(res);
  } catch (error) {
    console.error('Error proxying thumbnail:', error);
    
    // Check if it's an authentication error
    if (error.code === 401 || error.code === 403) {
      return res.status(403).json({ error: 'Access denied to thumbnail' });
    }
    
    // Check if headers have already been sent
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy thumbnail: ' + error.message });
    }
  }
});

// Public PDF proxy route (no authentication required for public files)
app.get('/api/public/drive/pdf/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    console.log('Public PDF proxy request for file ID:', fileId);
    
    // Check if API_KEY is available
    if (!API_KEY) {
      console.error('API_KEY is not configured');
      return res.status(500).json({ error: 'Server configuration error: API key not available' });
    }
    
    // Use public drive client
    const drive = google.drive({
      version: 'v3',
      auth: API_KEY
    });
    
    // First, get the file metadata to check if it's a PDF
    console.log('Fetching file metadata for ID:', fileId);
    const metadataResponse = await drive.files.get({
      fileId: fileId,
      fields: 'name, mimeType, webContentLink'
    });
    
    const fileMetadata = metadataResponse.data;
    console.log('File metadata:', fileMetadata);
    
    // Check if it's actually a PDF file
    if (fileMetadata.mimeType !== 'application/pdf') {
      console.log('File is not a PDF:', fileMetadata.mimeType);
      return res.status(400).json({ error: 'File is not a PDF' });
    }
    
    // Set appropriate headers for PDF
    res.set('Content-Type', 'application/pdf');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Use the Google Drive API to get the file content directly as a stream
    console.log('Fetching PDF content directly from Google Drive API');
    const pdfResponse = await drive.files.get(
      {
        fileId: fileId,
        alt: 'media'
      },
      {
        responseType: 'stream'
      }
    );
    
    console.log('Streaming PDF content to client via direct API');
    
    // Handle stream events
    pdfResponse.data.on('error', (err) => {
      console.error('Error streaming PDF:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream PDF: ' + err.message });
      }
    });
    
    // Pipe the PDF stream to the response
    pdfResponse.data.pipe(res);
  } catch (error) {
    console.error('Error proxying public PDF for file ID:', req.params.fileId, error);
    
    // Handle specific error cases
    if (error.code === 404) {
      return res.status(404).json({ error: 'PDF file not found' });
    } else if (error.code === 403) {
      return res.status(403).json({ error: 'Access denied to PDF file. File may not be publicly accessible.' });
    } else if (error.code === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    } else if (error.code === 400) {
      return res.status(400).json({ error: 'Invalid file type. Only PDF files can be previewed.' });
    }
    
    // Check if headers have already been sent
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy PDF: ' + error.message });
    }
  }
});

// PDF proxy route (authentication required)
app.get('/api/private/drive/pdf/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    console.log('PDF proxy request for file ID:', fileId);
    
    if (!token) {
      console.log('No token provided for PDF proxy');
      return res.status(401).json({ error: 'Access token required' });
    }
    
    // Check if OAuth credentials are available
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('OAuth credentials are not configured');
      return res.status(500).json({ error: 'Server configuration error: OAuth credentials not available' });
    }
    
    // Create authenticated drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback'
    );
    oauth2Client.setCredentials({ access_token: token });
    
    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client
    });
    
    // First, get the file metadata to check if it's a PDF
    console.log('Fetching file metadata for ID:', fileId);
    const metadataResponse = await drive.files.get({
      fileId: fileId,
      fields: 'name, mimeType, webContentLink'
    });
    
    const fileMetadata = metadataResponse.data;
    console.log('File metadata:', fileMetadata);
    
    // Check if it's actually a PDF file
    if (fileMetadata.mimeType !== 'application/pdf') {
      console.log('File is not a PDF:', fileMetadata.mimeType);
      return res.status(400).json({ error: 'File is not a PDF' });
    }
    
    // Set appropriate headers for PDF
    res.set('Content-Type', 'application/pdf');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Use the Google Drive API to get the file content directly as a stream
    console.log('Fetching PDF content directly from Google Drive API');
    const pdfResponse = await drive.files.get(
      {
        fileId: fileId,
        alt: 'media'
      },
      {
        responseType: 'stream'
      }
    );
    
    console.log('Streaming PDF content to client via direct API');
    
    // Handle stream events
    pdfResponse.data.on('error', (err) => {
      console.error('Error streaming PDF:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream PDF: ' + err.message });
      }
    });
    
    // Pipe the PDF stream to the response
    pdfResponse.data.pipe(res);
  } catch (error) {
    console.error('Error proxying PDF for file ID:', req.params.fileId, error);
    
    // Handle specific error cases
    if (error.code === 404) {
      return res.status(404).json({ error: 'PDF file not found' });
    } else if (error.code === 403) {
      return res.status(403).json({ error: 'Access denied to PDF file' });
    } else if (error.code === 401) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }
    
    // Check if headers have already been sent
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy PDF: ' + error.message });
    }
  }
});

// CollegeXConnect API routes
app.get('/folder', authenticateApiKey, collegexController.getFolderFiles);
app.get('/folder/:folderId', authenticateApiKey, collegexController.getFolderFiles);

// CollegeXConnect Embed API routes
app.get('/api/embed/folder/:folderId', authenticateApiKey, collegexController.getFolderForEmbed);
app.get('/api/embed/file/:fileId', authenticateApiKey, collegexController.getFileForEmbed);

// User management routes
app.post('/api/users/key', collegexController.createApiKey);
app.post('/api/users/tokens', authenticateApiKey, collegexController.addGoogleTokens);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Cosmos Drive API running!',
    endpoints: {
      'GET /folder?driveUrl=<GoogleDriveFolderLink>': 'Get PDF files from a Google Drive folder (requires API key)',
      'GET /folder/<folderId>': 'Get PDF files from a Google Drive folder by ID (requires API key)',
      'POST /api/users/key': 'Create a new API key for a user',
      'POST /api/users/tokens': 'Add Google tokens to a user account (requires API key)',
      'GET /api/files': 'Get files by Google Drive URL with optional filters (branch, sem, subject)',
      'GET /api/public/drive/folder/:folderId': 'Get files from a public folder',
      'GET /api/public/drive/file/:fileId': 'Get details of a public file',
      'GET /api/public/drive/path/:folderId': 'Get folder path for breadcrumb navigation',
      'GET /api/public/drive/thumbnail/:fileId': 'Get thumbnail for a public file',
      'GET /api/private/drive/folder/:folderId': 'Get files from a private folder (requires authentication)',
      'GET /api/private/drive/file/:fileId': 'Get details of a private file (requires authentication)',
      'GET /api/private/drive/path/:folderId': 'Get folder path for breadcrumb navigation (requires authentication)',
      'GET /api/private/drive/thumbnail/:fileId': 'Get thumbnail for a private file (requires authentication)',
      'GET /api/private/drive/pdf/:fileId': 'Get PDF content (requires authentication)',
      'GET /api/auth/url': 'Get OAuth2 authentication URL',
      'GET /api/auth/callback': 'Handle OAuth2 callback'
    }
  });
});

// Add a test endpoint to verify OAuth2 credentials
app.get('/api/diag/oauth', async (req, res) => {
  try {
    console.log('Testing OAuth2 credentials...');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('REDIRECT_URI:', process.env.REDIRECT_URI);
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({
        error: 'OAuth2 credentials not configured',
        details: {
          GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
          GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
          REDIRECT_URI: process.env.REDIRECT_URI || 'NOT SET'
        }
      });
    }
    
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI
    );
    
    // Just test that we can create the client
    res.json({
      status: 'OAuth2 credentials are properly configured',
      clientId: process.env.GOOGLE_CLIENT_ID,
      redirectUri: process.env.REDIRECT_URI
    });
  } catch (error) {
    console.error('Error testing OAuth2 credentials:', error);
    res.status(500).json({
      error: 'Failed to test OAuth2 credentials',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Add a diagnostic endpoint to check environment variables
app.get('/api/diag/env', (req, res) => {
  res.json({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
    REDIRECT_URI: process.env.REDIRECT_URI,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT
  });
});
