const driveService = require('../services/driveService');

/**
 * Generate OAuth2 authentication URL
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function getAuthUrl(req, res) {
  try {
    const authUrl = driveService.generateAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    if (error.message === 'OAuth2 credentials not configured') {
      res.status(500).json({ error: 'OAuth2 is not properly configured. Please check your environment variables.' });
    } else {
      res.status(500).json({ error: 'Failed to generate authentication URL: ' + error.message });
    }
  }
}

/**
 * Handle OAuth2 callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleOAuthCallback(req, res) {
  try {
    const { code, error } = req.query;
    
    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error);
      return res.status(400).json({ 
        error: 'OAuth authorization failed: ' + error,
        description: req.query.error_description || 'Unknown error'
      });
    }
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // Exchange authorization code for tokens
    const tokens = await driveService.getOAuthTokens(code);
    
    // In a real application, you would store these tokens securely
    // For now, we'll just return them to the client
    res.json({ 
      message: 'Authentication successful',
      tokens
    });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    if (error.message === 'OAuth2 credentials not configured') {
      res.status(500).json({ error: 'OAuth2 is not properly configured. Please check your environment variables.' });
    } else if (error.message.includes('invalid_grant')) {
      res.status(400).json({ error: 'Authorization code has expired or already been used. Please try signing in again.' });
    } else {
      res.status(500).json({ error: 'Failed to authenticate: ' + error.message });
    }
  }
}

module.exports = {
  getAuthUrl,
  handleOAuthCallback
};