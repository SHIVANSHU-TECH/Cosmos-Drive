const driveService = require('../services/driveService');

/**
 * Get files from a folder
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFiles(req, res) {
  try {
    const { folderId } = req.params;
    const { search } = req.query; // Get search term from query parameters
    
    console.log('Received request for folder ID:', folderId);
    console.log('Search term:', search);
    
    if (!folderId) {
      return res.status(400).json({ error: 'Folder ID is required' });
    }
    
    // Check if user is authenticated (has access token)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    console.log('Token present:', !!token);
    
    let files;
    if (token) {
      // Use private access with user authentication
      console.log('Using private access with token');
      try {
        files = await driveService.getFilesFromFolderPrivate(token, folderId, search);
      } catch (privateError) {
        console.error('Error with private access, falling back to public access:', privateError);
        // If private access fails, fall back to public access
        files = await driveService.getFilesFromFolderPublic(folderId, search);
      }
    } else {
      // Use public access
      console.log('Using public access');
      files = await driveService.getFilesFromFolderPublic(folderId, search);
    }
    
    console.log('Files found:', files ? files.length : 0);
    res.json(files);
  } catch (error) {
    console.error('Error in getFiles controller:', error);
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
    
    let file;
    if (token) {
      // Use private access with user authentication
      try {
        file = await driveService.getFileDetailsPrivate(token, fileId);
      } catch (privateError) {
        console.error('Error with private access, falling back to public access:', privateError);
        // If private access fails, fall back to public access
        file = await driveService.getFileDetailsPublic(fileId);
      }
    } else {
      // Use public access
      file = await driveService.getFileDetailsPublic(fileId);
    }
    
    res.json(file);
  } catch (error) {
    console.error('Error in getFile controller:', error);
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
    
    let path;
    if (token) {
      // Use private access with user authentication
      try {
        path = await driveService.getFolderPath(token, folderId);
      } catch (privateError) {
        console.error('Error with private access, falling back to public access:', privateError);
        // If private access fails, fall back to public access
        path = await driveService.getFolderPath(null, folderId);
      }
    } else {
      // Use public access
      path = await driveService.getFolderPath(null, folderId);
    }
    
    res.json(path);
  } catch (error) {
    console.error('Error in getFolderPath controller:', error);
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