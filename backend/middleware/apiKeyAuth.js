const ApiKeyService = require('../services/apiKeyService');

async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required. Please provide your API key in the X-API-Key header or apiKey query parameter.' 
    });
  }
  
  try {
    const user = await ApiKeyService.getUserByApiKey(apiKey);
    
    if (!user) {
      return res.status(403).json({ 
        error: 'Invalid API key. Please check your API key and try again.' 
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Error authenticating API key:', error);
    return res.status(500).json({ 
      error: 'Authentication error: ' + error.message 
    });
  }
}

module.exports = {
  authenticateApiKey
};