const User = require('../models/User');
const crypto = require('crypto');

// Try to import Firebase, but handle the case where it's not available
let firebaseModule;
try {
  firebaseModule = require('../config/firebase');
  console.log('Firebase module loaded successfully');
} catch (error) {
  console.warn('Firebase config module not available:', error.message);
  firebaseModule = { db: null, admin: null };
}

// Check if firebaseModule has the expected properties
const { db, admin } = firebaseModule && typeof firebaseModule === 'object' ? firebaseModule : { db: null, admin: null };

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
    if (db && admin) {
      try {
        console.log(`Attempting to sync user to Firebase: ${email}`);
        await db.ref('users/' + apiKey).set({
          id: user.id,
          email: user.email,
          apiKey: user.apiKey,
          googleAccessToken: user.googleAccessToken,
          googleRefreshToken: user.googleRefreshToken,
          createdAt: user.createdAt.toISOString(),
          lastAccessed: user.lastAccessed.toISOString()
        });
        console.log(`Successfully synced user to Firebase: ${email}`);
      } catch (error) {
        console.error('Failed to save user to Firebase, using in-memory storage:', error.message);
        users.set(apiKey, user);
      }
    } else {
      // Fallback to in-memory storage
      console.log('Firebase not configured, using in-memory storage for user:', email);
      users.set(apiKey, user);
    }
    
    return user;
  }

  // Get user by API key
  static async getUserByApiKey(apiKey) {
    // Handle case where apiKey might be null/undefined
    if (!apiKey) {
      return null;
    }
    
    // If Firebase is configured, get from Realtime Database
    if (db && admin) {
      try {
        console.log(`Attempting to retrieve user from Firebase: ${apiKey ? apiKey.substring(0, 8) : 'null'}...`);
        const snapshot = await db.ref('users/' + apiKey).once('value');
        if (!snapshot.exists()) {
          console.log('User not found in Firebase');
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
        
        console.log(`Successfully retrieved user from Firebase: ${user.email}`);
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
      console.log('Firebase not configured, checking in-memory storage for user');
      const user = users.get(apiKey);
      if (user) {
        user.updateLastAccessed();
      }
      return user;
    }
  }

  // Add Google tokens to user
  static async addGoogleTokensToUser(apiKey, accessToken, refreshToken) {
    // Handle case where apiKey might be null/undefined
    if (!apiKey) {
      return null;
    }
    
    // If Firebase is configured, update in Realtime Database
    if (db && admin) {
      try {
        console.log(`Attempting to update user tokens in Firebase: ${apiKey.substring(0, 8)}...`);
        const snapshot = await db.ref('users/' + apiKey).once('value');
        if (!snapshot.exists()) {
          console.log('User not found in Firebase for token update');
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
        
        console.log(`Successfully updated user tokens in Firebase: ${user.email}`);
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
      console.log('Firebase not configured, updating in-memory storage for user tokens');
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
    if (db && admin) {
      try {
        console.log('Attempting to retrieve all users from Firebase');
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
        
        console.log(`Successfully retrieved ${users.length} users from Firebase`);
        return users;
      } catch (error) {
        console.error('Failed to get all users from Firebase, returning in-memory users:', error.message);
        // Fallback to in-memory storage
        return Array.from(users.values());
      }
    } else {
      // Fallback to in-memory storage
      console.log(`Firebase not configured, returning ${users.size} users from in-memory storage`);
      return Array.from(users.values());
    }
  }

  // Delete a user
  static async deleteUser(apiKey) {
    // Handle case where apiKey might be null/undefined
    if (!apiKey) {
      return false;
    }
    
    // If Firebase is configured, delete from Realtime Database
    if (db && admin) {
      try {
        console.log(`Attempting to delete user from Firebase: ${apiKey.substring(0, 8)}...`);
        await db.ref('users/' + apiKey).remove();
        console.log('Successfully deleted user from Firebase');
        return true;
      } catch (error) {
        console.error('Failed to delete user from Firebase, deleting from in-memory storage:', error.message);
        // Fallback to in-memory storage
        return users.delete(apiKey);
      }
    } else {
      // Fallback to in-memory storage
      console.log('Firebase not configured, deleting user from in-memory storage');
      return users.delete(apiKey);
    }
  }
}

module.exports = ApiKeyService;