const ApiKeyService = require('../services/apiKeyService');

async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.query.key;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required. Please provide your API key in the X-API-Key header or apiKey/key query parameter.' 
    });
  }
  
  try {
    // Set a very short timeout for authentication (5 seconds) since we use persistent storage first
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Authentication timed out')), 5000);
    });
    
    // Authenticate the API key with timeout protection
    const userPromise = ApiKeyService.getUserByApiKey(apiKey);
    const user = await Promise.race([userPromise, timeoutPromise]);
    
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
    if (error.message === 'Authentication timed out') {
      return res.status(504).json({ 
        error: 'Authentication timed out. Please try again.' 
      });
    } else {
      return res.status(500).json({ 
        error: 'Authentication error: ' + error.message 
      });
    }
  }
}

module.exports = {
  authenticateApiKey
};