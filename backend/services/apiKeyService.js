const User = require('../models/User');
const crypto = require('crypto');

// Try to import Firebase, but handle the case where it's not available
let firebaseModule;
try {
  firebaseModule = require('../config/firebase');
} catch (error) {
  console.warn('Firebase module not available, using in-memory storage');
  firebaseModule = { db: null, admin: null };
}

const { db, admin } = firebaseModule;

// Fallback to in-memory storage if Firebase is not configured
let users = new Map();

class ApiKeyService {
  // Generate a new API key
  static generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create a new user with API key
  static async createUser(email) {
    const apiKey = this.generateApiKey();
    const userId = crypto.randomBytes(16).toString('hex');
    const user = new User(userId, email, apiKey);
    
    // If Firebase is configured, save to Realtime Database
    if (db) {
      try {
        await db.ref('users/' + apiKey).set({
          id: user.id,
          email: user.email,
          apiKey: user.apiKey,
          googleAccessToken: user.googleAccessToken,
          googleRefreshToken: user.googleRefreshToken,
          createdAt: user.createdAt.toISOString(),
          lastAccessed: user.lastAccessed.toISOString()
        });
      } catch (error) {
        console.error('Failed to save user to Firebase, using in-memory storage:', error.message);
        users.set(apiKey, user);
      }
    } else {
      // Fallback to in-memory storage
      users.set(apiKey, user);
    }
    
    return user;
  }

  // Get user by API key
  static async getUserByApiKey(apiKey) {
    // If Firebase is configured, get from Realtime Database
    if (db) {
      try {
        const snapshot = await db.ref('users/' + apiKey).once('value');
        if (!snapshot.exists()) {
          return null;
        }
        
        const userData = snapshot.val();
        const user = new User(
          userData.id,
          userData.email,
          userData.apiKey,
          userData.googleAccessToken,
          userData.googleRefreshToken
        );
        user.createdAt = new Date(userData.createdAt);
        user.lastAccessed = new Date(userData.lastAccessed);
        
        // Update last accessed time
        user.updateLastAccessed();
        await db.ref('users/' + apiKey).update({
          lastAccessed: user.lastAccessed.toISOString()
        });
        
        return user;
      } catch (error) {
        console.error('Failed to get user from Firebase, checking in-memory storage:', error.message);
        // Fallback to in-memory storage
        const user = users.get(apiKey);
        if (user) {
          user.updateLastAccessed();
        }
        return user;
      }
    } else {
      // Fallback to in-memory storage
      const user = users.get(apiKey);
      if (user) {
        user.updateLastAccessed();
      }
      return user;
    }
  }

  // Add Google tokens to user
  static async addGoogleTokensToUser(apiKey, accessToken, refreshToken) {
    // If Firebase is configured, update in Realtime Database
    if (db) {
      try {
        const snapshot = await db.ref('users/' + apiKey).once('value');
        if (!snapshot.exists()) {
          return null;
        }
        
        const userData = snapshot.val();
        const user = new User(
          userData.id,
          userData.email,
          userData.apiKey,
          accessToken,
          refreshToken
        );
        user.createdAt = new Date(userData.createdAt);
        user.lastAccessed = new Date(userData.lastAccessed);
        
        // Update tokens in Realtime Database
        await db.ref('users/' + apiKey).update({
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
          lastAccessed: user.lastAccessed.toISOString()
        });
        
        return user;
      } catch (error) {
        console.error('Failed to update user in Firebase, updating in-memory storage:', error.message);
        // Fallback to in-memory storage
        const user = users.get(apiKey);
        if (user) {
          user.setGoogleTokens(accessToken, refreshToken);
          user.updateLastAccessed();
        }
        return user;
      }
    } else {
      // Fallback to in-memory storage
      const user = users.get(apiKey);
      if (user) {
        user.setGoogleTokens(accessToken, refreshToken);
        user.updateLastAccessed();
      }
      return user;
    }
  }

  // Get all users (for admin purposes)
  static async getAllUsers() {
    // If Firebase is configured, get all from Realtime Database
    if (db) {
      try {
        const snapshot = await db.ref('users').once('value');
        const users = [];
        
        if (snapshot.exists()) {
          snapshot.forEach(childSnapshot => {
            const userData = childSnapshot.val();
            const user = new User(
              userData.id,
              userData.email,
              userData.apiKey,
              userData.googleAccessToken,
              userData.googleRefreshToken
            );
            user.createdAt = new Date(userData.createdAt);
            user.lastAccessed = new Date(userData.lastAccessed);
            users.push(user);
          });
        }
        
        return users;
      } catch (error) {
        console.error('Failed to get all users from Firebase, returning in-memory users:', error.message);
        // Fallback to in-memory storage
        return Array.from(users.values());
      }
    } else {
      // Fallback to in-memory storage
      return Array.from(users.values());
    }
  }

  // Delete a user
  static async deleteUser(apiKey) {
    // If Firebase is configured, delete from Realtime Database
    if (db) {
      try {
        await db.ref('users/' + apiKey).remove();
        return true;
      } catch (error) {
        console.error('Failed to delete user from Firebase, deleting from in-memory storage:', error.message);
        // Fallback to in-memory storage
        return users.delete(apiKey);
      }
    } else {
      // Fallback to in-memory storage
      return users.delete(apiKey);
    }
  }
  
  // Get files for a user by API key
  static async getFilesForUser(apiKey, folderId) {
    const user = await this.getUserByApiKey(apiKey);
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