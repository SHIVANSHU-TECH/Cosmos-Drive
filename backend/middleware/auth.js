// Simple authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  // For OAuth tokens, we can't validate them against a fixed value
  // In a real implementation, you would verify the token with Google's OAuth service
  // For now, we'll accept any token that's not empty as a simple check
  // In production, you should verify the token with Google's OAuth service
  
  // Add the token to the request object for use in controllers
  req.userToken = token;
  
  next();
}

module.exports = {
  authenticateToken
};