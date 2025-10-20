const driveService = require('../services/driveService');

/**
 * Get files from a folder
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFiles(req, res) {
  try {
    const { folderId } = req.params;
    const { search, pageToken } = req.query; // Get search term and page token from query parameters
    
    console.log('Received request for folder ID:', folderId);
    console.log('Search term:', search);
    console.log('Page token:', pageToken);
    
    if (!folderId) {
      return res.status(400).json({ error: 'Folder ID is required' });
    }
    
    // Check if user is authenticated (has access token)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    console.log('Token present:', !!token);
    
    // Set a very aggressive timeout for the operation (4 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 4000);
    });
    
    let filesResult;
    if (token) {
      // Use private access with user authentication
      console.log('Using private access with token');
      try {
        const privateFilesPromise = driveService.getFilesFromFolderPrivate(token, folderId, search, pageToken);
        filesResult = await Promise.race([privateFilesPromise, timeoutPromise]);
      } catch (privateError) {
        console.error('Error with private access, falling back to public access:', privateError);
        // If private access fails, fall back to public access
        const publicFilesPromise = driveService.getFilesFromFolderPublic(folderId, search, pageToken);
        filesResult = await Promise.race([publicFilesPromise, timeoutPromise]);
      }
    } else {
      // Use public access
      console.log('Using public access');
      const publicFilesPromise = driveService.getFilesFromFolderPublic(folderId, search, pageToken);
      filesResult = await Promise.race([publicFilesPromise, timeoutPromise]);
    }
    
    console.log('Files found:', filesResult.files ? filesResult.files.length : 0);
    res.json(filesResult);
  } catch (error) {
    console.error('Error in getFiles controller:', error);
    // Check if it's a timeout error
    if (error.message === 'Operation timed out') {
      return res.status(504).json({ error: 'Request timed out. Google Drive is taking too long to respond. Please try again.' });
    }
    // Check if it's an authentication error
    if (error.code === 401 || error.code === 403) {
      return res.status(403).json({ error: 'Access denied. Invalid or missing credentials.' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Folder not found.' });
    }
    res.status(500).json({ error: 'Failed to fetch files: ' + error.message });
  }
}

/**
 * Get file details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFile(req, res) {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    // Check if user is authenticated (has access token)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    // Set a timeout for the operation (2 seconds - very aggressive)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 2000);
    });
    
    let file;
    if (token) {
      // Use private access with user authentication
      try {
        const privateFilePromise = driveService.getFileDetailsPrivate(token, fileId);
        file = await Promise.race([privateFilePromise, timeoutPromise]);
      } catch (privateError) {
        console.error('Error with private access, falling back to public access:', privateError);
        // If private access fails, fall back to public access
        const publicFilePromise = driveService.getFileDetailsPublic(fileId);
        file = await Promise.race([publicFilePromise, timeoutPromise]);
      }
    } else {
      // Use public access
      const publicFilePromise = driveService.getFileDetailsPublic(fileId);
      file = await Promise.race([publicFilePromise, timeoutPromise]);
    }
    
    res.json(file);
  } catch (error) {
    console.error('Error in getFile controller:', error);
    // Check if it's a timeout error
    if (error.message === 'Operation timed out') {
      return res.status(504).json({ error: 'Request timed out. Google Drive is taking too long to respond. Please try again.' });
    }
    // Check if it's an authentication error
    if (error.code === 401 || error.code === 403) {
      return res.status(403).json({ error: 'Access denied. Invalid or missing credentials.' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'File not found.' });
    }
    res.status(500).json({ error: 'Failed to fetch file details: ' + error.message });
  }
}

/**
 * Get folder path (breadcrumb trail)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFolderPath(req, res) {
  try {
    const { folderId } = req.params;
    
    if (!folderId) {
      return res.status(400).json({ error: 'Folder ID is required' });
    }
    
    // Check if user is authenticated (has access token)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    // Set a timeout for the operation (3 seconds - very aggressive)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 3000);
    });
    
    let path;
    if (token) {
      // Use private access with user authentication
      try {
        const privatePathPromise = driveService.getFolderPath(token, folderId);
        path = await Promise.race([privatePathPromise, timeoutPromise]);
      } catch (privateError) {
        console.error('Error with private access, falling back to public access:', privateError);
        // If private access fails, fall back to public access
        const publicPathPromise = driveService.getFolderPath(null, folderId);
        path = await Promise.race([publicPathPromise, timeoutPromise]);
      }
    } else {
      // Use public access
      const publicPathPromise = driveService.getFolderPath(null, folderId);
      path = await Promise.race([publicPathPromise, timeoutPromise]);
    }
    
    res.json(path);
  } catch (error) {
    console.error('Error in getFolderPath controller:', error);
    // Check if it's a timeout error
    if (error.message === 'Operation timed out') {
      return res.status(504).json({ error: 'Request timed out. Google Drive is taking too long to respond. Please try again.' });
    }
    // Check if it's an authentication error
    if (error.code === 401 || error.code === 403) {
      return res.status(403).json({ error: 'Access denied. Invalid or missing credentials.' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Folder not found.' });
    }
    res.status(500).json({ error: 'Failed to fetch folder path: ' + error.message });
  }
}

module.exports = {
  getFiles,
  getFile,
  getFolderPath
};