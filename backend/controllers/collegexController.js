const driveService = require('../services/driveService');
const ApiKeyService = require('../services/apiKeyService');

/**
 * Create a new API key for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createApiKey(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Create a new user with API key
    const user = await ApiKeyService.createUser(email);
    
    res.status(201).json({
      apiKey: user.apiKey,
      email: user.email,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error in createApiKey controller:', error);
    res.status(500).json({ error: 'Failed to create API key: ' + error.message });
  }
}

/**
 * Add Google tokens to a user account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function addGoogleTokens(req, res) {
  try {
    const { accessToken, refreshToken } = req.body;
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required. Please provide your API key in the X-API-Key header.' 
      });
    }
    
    if (!accessToken || !refreshToken) {
      return res.status(400).json({ 
        error: 'Both access token and refresh token are required' 
      });
    }
    
    // Add tokens to user
    const user = await ApiKeyService.addGoogleTokensToUser(apiKey, accessToken, refreshToken);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found for the provided API key' 
      });
    }
    
    res.json({
      message: 'Google tokens added successfully',
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error in addGoogleTokens controller:', error);
    res.status(500).json({ error: 'Failed to add Google tokens: ' + error.message });
  }
}

/**
 * Get files from a folder
 * This endpoint is designed to work with the CollegeXConnect integration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFolderFiles(req, res) {
  try {
    // Get folder ID from params or query
    const folderId = req.params.folderId || req.query.folderId;
    
    // Get API key from header (set by middleware)
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required. Please provide your API key in the X-API-Key header.' 
      });
    }
    
    // Set a very aggressive timeout for the operation (5 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 5000);
    });
    
    // Validate API key
    const userPromise = ApiKeyService.getUserByApiKey(apiKey);
    const user = await Promise.race([userPromise, timeoutPromise]);
    
    if (!user) {
      return res.status(403).json({ 
        error: 'Invalid API key. Please check your API key and try again.' 
      });
    }
    
    console.log('Received request for folder ID:', folderId);
    
    if (!folderId) {
      return res.status(400).json({ error: 'Folder ID is required' });
    }
    
    // Get only the first page of files (most important change)
    let filesResult;
    // If user has Google tokens, use private access, otherwise fall back to public
    if (user.hasGoogleTokens()) {
      console.log('Using private access with user tokens');
      try {
        filesResult = await driveService.getFilesFromFolderPrivate(user.googleAccessToken, folderId);
      } catch (error) {
        console.error('Error fetching files with private access:', error);
        // If private access fails, fall back to public access
        console.log('Falling back to public access');
        filesResult = await driveService.getFilesFromFolderPublic(folderId);
      }
    } else {
      console.log('Using public access (user has no Google tokens)');
      filesResult = await driveService.getFilesFromFolderPublic(folderId);
    }
    
    console.log('Files found:', filesResult.files ? filesResult.files.length : 0);
    
    // Return files with additional metadata
    res.json({
      folderId,
      files: filesResult.files || [],
      nextPageToken: filesResult.nextPageToken,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error in getFolderFiles controller:', error);
    if (error.message === 'Operation timed out') {
      res.status(504).json({ error: 'Request timed out. Google Drive is taking too long to respond. Please try again.' });
    } else {
      // Check if it's an authentication error
      if (error.code === 401 || error.code === 403) {
        return res.status(403).json({ error: 'Access denied. Invalid or missing credentials.' });
      }
      // Check if it's a "not found" error
      if (error.code === 404) {
        return res.status(404).json({ error: 'Folder not found.' });
      }
      res.status(500).json({ error: 'Failed to fetch files: ' + error.message });
    }
  }
}

/**
 * Get files from a folder for embedded view
 * This endpoint is designed to work with the Collegex Drive Embedder URL structure
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFolderForEmbed(req, res) {
  try {
    const { folderId } = req.params;
    
    // Get API key from header (set by frontend proxy)
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required. Please provide your API key in the X-API-Key header.' 
      });
    }
    
    // Set a very aggressive timeout for the operation (4 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 4000);
    });
    
    // Validate API key
    const userPromise = ApiKeyService.getUserByApiKey(apiKey);
    const user = await Promise.race([userPromise, timeoutPromise]);
    
    if (!user) {
      return res.status(403).json({ 
        error: 'Invalid API key. Please check your API key and try again.' 
      });
    }
    
    console.log('Received embed request for folder ID:', folderId);
    
    if (!folderId) {
      return res.status(400).json({ error: 'Folder ID is required' });
    }
    
    // Set a very aggressive timeout for the file fetching operation (3 seconds)
    const fileFetchTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('File fetching timed out')), 3000);
    });
    
    // Get only the first page of files (most important change)
    let filesResult;
    // If user has Google tokens, use private access, otherwise fall back to public
    if (user.hasGoogleTokens()) {
      console.log('Using private access with user tokens');
      try {
        const privateFilesPromise = driveService.getFilesFromFolderPrivate(user.googleAccessToken, folderId);
        filesResult = await Promise.race([privateFilesPromise, fileFetchTimeoutPromise]);
      } catch (error) {
        console.error('Error fetching files with private access:', error);
        // If private access fails, fall back to public access
        console.log('Falling back to public access');
        const publicFilesPromise = driveService.getFilesFromFolderPublic(folderId);
        filesResult = await Promise.race([publicFilesPromise, fileFetchTimeoutPromise]);
      }
    } else {
      console.log('Using public access (user has no Google tokens)');
      const publicFilesPromise = driveService.getFilesFromFolderPublic(folderId);
      filesResult = await Promise.race([publicFilesPromise, fileFetchTimeoutPromise]);
    }
    
    console.log('Files found:', filesResult.files ? filesResult.files.length : 0);
    
    // Return files with additional metadata for embedding
    res.json({
      folderId,
      files: filesResult.files || [],
      nextPageToken: filesResult.nextPageToken,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error in getFolderForEmbed controller:', error);
    if (error.message === 'Operation timed out' || error.message === 'File fetching timed out') {
      res.status(504).json({ error: 'Request timed out. Google Drive is taking too long to respond. Please try again.' });
    } else {
      // Check if it's an authentication error
      if (error.code === 401 || error.code === 403) {
        return res.status(403).json({ error: 'Access denied. Invalid or missing credentials.' });
      }
      // Check if it's a "not found" error
      if (error.code === 404) {
        return res.status(404).json({ error: 'Folder not found.' });
      }
      res.status(500).json({ error: 'Failed to fetch files: ' + error.message });
    }
  }
}

/**
 * Get file details for embedded view
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFileForEmbed(req, res) {
  try {
    const { fileId } = req.params;
    
    // Get API key from header (set by frontend proxy)
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required. Please provide your API key in the X-API-Key header.' 
      });
    }
    
    // Set a timeout for the operation (2 seconds - very aggressive)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 2000);
    });
    
    // Validate API key
    const userPromise = ApiKeyService.getUserByApiKey(apiKey);
    const user = await Promise.race([userPromise, timeoutPromise]);
    
    if (!user) {
      return res.status(403).json({ 
        error: 'Invalid API key. Please check your API key and try again.' 
      });
    }
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    let file;
    // If user has Google tokens, use private access, otherwise fall back to public
    if (user.hasGoogleTokens()) {
      try {
        file = await driveService.getFileDetailsPrivate(user.googleAccessToken, fileId);
      } catch (error) {
        console.error('Error fetching file with private access:', error);
        // If private access fails, fall back to public access
        console.log('Falling back to public access');
        file = await driveService.getFileDetailsPublic(fileId);
      }
    } else {
      file = await driveService.getFileDetailsPublic(fileId);
    }
    
    res.json(file);
  } catch (error) {
    console.error('Error in getFileForEmbed controller:', error);
    if (error.message === 'Operation timed out') {
      res.status(504).json({ error: 'Request timed out. Google Drive is taking too long to respond. Please try again.' });
    } else {
      // Check if it's an authentication error
      if (error.code === 401 || error.code === 403) {
        return res.status(403).json({ error: 'Access denied. Invalid or missing credentials.' });
      }
      // Check if it's a "not found" error
      if (error.code === 404) {
        return res.status(404).json({ error: 'File not found.' });
      }
      res.status(500).json({ error: 'Failed to fetch file details: ' + error.message });
    }
  }
}

module.exports = {
  createApiKey,
  addGoogleTokens,
  getFolderFiles,
  getFolderForEmbed,
  getFileForEmbed
};