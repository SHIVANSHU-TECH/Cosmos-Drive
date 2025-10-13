const driveService = require('../services/driveService');

/**
 * Generate OAuth2 authentication URL
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function getAuthUrl(req, res) {
  try {
    console.log('=== AUTH URL GENERATION STARTED ===');
    console.log('Current working directory:', process.cwd());
    console.log('Environment variables in auth controller:');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('REDIRECT_URI:', process.env.REDIRECT_URI);
    
    // Also check the process.env object directly
    console.log('All env keys:', Object.keys(process.env).filter(key => 
      key.includes('GOOGLE') || key.includes('CLIENT') || key.includes('SECRET')
    ));
    
    const authUrl = driveService.generateAuthUrl();
    console.log('Generated auth URL:', authUrl);
    console.log('=== AUTH URL GENERATION COMPLETED ===');
    res.json({ authUrl });
  } catch (error) {
    console.error('=== ERROR GENERATING AUTH URL ===');
    console.error('Error generating auth URL:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    console.error('=== END ERROR ===');
    
    // More detailed error response
    if (error.message === 'OAuth2 credentials not configured') {
      res.status(500).json({ 
        error: 'OAuth2 is not properly configured. Please check your environment variables.',
        details: {
          GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
          GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
          REDIRECT_URI: process.env.REDIRECT_URI || 'NOT SET'
        }
      });
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
    
    console.log('Exchanging authorization code for tokens:', code);
    
    // Exchange authorization code for tokens
    const tokens = await driveService.getOAuthTokens(code);
    
    console.log('Successfully exchanged code for tokens:', tokens);
    
    // In a real application, you would store these tokens securely
    // For now, we'll just return them to the client
    res.json({ 
      message: 'Authentication successful',
      tokens
    });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message === 'OAuth2 credentials not configured') {
      res.status(500).json({ error: 'OAuth2 is not properly configured. Please check your environment variables.' });
    } else if (error.message.includes('invalid_grant')) {
      res.status(400).json({ error: 'Authorization code has expired or already been used. Please try signing in again.' });
    } else if (error.message.includes('fetch failed')) {
      res.status(500).json({ error: 'Failed to connect to Google OAuth service. Please check your network connection and try again.' });
    } else {
      res.status(500).json({ error: 'Failed to authenticate: ' + error.message });
    }
  }
}

module.exports = {
  getAuthUrl,
  handleOAuthCallback
};