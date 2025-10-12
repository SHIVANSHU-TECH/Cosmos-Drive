const User = require('../models/User');
const crypto = require('crypto');

// In-memory storage for users (in production, use a database)
const users = new Map();

class ApiKeyService {
  // Generate a new API key
  static generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create a new user with API key
  static createUser(email) {
    const apiKey = this.generateApiKey();
    const userId = crypto.randomBytes(16).toString('hex');
    const user = new User(userId, email, apiKey);
    users.set(apiKey, user);
    return user;
  }

  // Get user by API key
  static getUserByApiKey(apiKey) {
    const user = users.get(apiKey);
    if (user) {
      user.updateLastAccessed();
    }
    return user;
  }

  // Add Google tokens to user
  static addGoogleTokensToUser(apiKey, accessToken, refreshToken) {
    const user = users.get(apiKey);
    if (user) {
      user.setGoogleTokens(accessToken, refreshToken);
      return user;
    }
    return null;
  }

  // Get all users (for admin purposes)
  static getAllUsers() {
    return Array.from(users.values());
  }

  // Delete a user
  static deleteUser(apiKey) {
    return users.delete(apiKey);
  }
  
  // Get files for a user by API key
  static async getFilesForUser(apiKey, folderId) {
    const user = this.getUserByApiKey(apiKey);
    if (!user) {
      throw new Error('Invalid API key');
    }
    
    // Return user info and folder ID for the frontend to handle
    return {
      user: {
        id: user.id,
        email: user.email
      },
      folderId
    };
  }
}

module.exports = ApiKeyService;