const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Try to import Firebase, but handle the case where it's not available
let firebaseModule;
try {
  firebaseModule = require('../config/firebase');
} catch (error) {
  console.warn('Firebase module not available, using persistent fallback storage');
  firebaseModule = { db: null, admin: null };
}

const { db, admin } = firebaseModule;

// Fallback to in-memory storage if Firebase is not configured
let users = new Map();

// Persistent storage file path
const STORAGE_FILE = path.join(__dirname, '../data/api-keys.json');

// Ensure data directory exists
const ensureDataDirectory = async () => {
  const dataDir = path.dirname(STORAGE_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

// Load users from persistent storage
const loadUsersFromFile = async () => {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(STORAGE_FILE, 'utf8');
    const userData = JSON.parse(data);
    users.clear();
    userData.forEach(user => {
      users.set(user.apiKey, new User(
        user.id,
        user.email,
        user.apiKey,
        user.googleAccessToken,
        user.googleRefreshToken
      ));
    });
    console.log(`Loaded ${users.size} users from persistent storage`);
  } catch (error) {
    console.log('No persistent storage file found or error loading, starting with empty storage');
  }
};

// Save users to persistent storage
const saveUsersToFile = async () => {
  try {
    await ensureDataDirectory();
    const userData = Array.from(users.values()).map(user => ({
      id: user.id,
      email: user.email,
      apiKey: user.apiKey,
      googleAccessToken: user.googleAccessToken,
      googleRefreshToken: user.googleRefreshToken,
      createdAt: user.createdAt.toISOString(),
      lastAccessed: user.lastAccessed.toISOString()
    }));
    await fs.writeFile(STORAGE_FILE, JSON.stringify(userData, null, 2));
    console.log(`Saved ${users.size} users to persistent storage`);
  } catch (error) {
    console.error('Error saving users to persistent storage:', error);
  }
};

// Initialize persistent storage on startup
loadUsersFromFile();

// Periodic sync between Firebase and persistent storage (every 10 minutes)
setInterval(async () => {
  if (db && users.size > 0) {
    try {
      console.log('Performing periodic sync with Firebase...');
      const snapshot = await withTimeoutAndRetry(async () => {
        return await db.ref('users').once('value');
      }, 5000, 1);
      
      if (snapshot.exists()) {
        let updated = false;
        // Update local storage with any changes from Firebase
        snapshot.forEach(childSnapshot => {
          const userData = childSnapshot.val();
          const existingUser = users.get(childSnapshot.key);
          
          if (!existingUser || 
              existingUser.googleAccessToken !== userData.googleAccessToken ||
              existingUser.googleRefreshToken !== userData.googleRefreshToken) {
            // Update or add user from Firebase
            const user = new User(
              userData.id,
              userData.email,
              userData.apiKey,
              userData.googleAccessToken,
              userData.googleRefreshToken
            );
            user.createdAt = new Date(userData.createdAt);
            user.lastAccessed = new Date(userData.lastAccessed);
            users.set(childSnapshot.key, user);
            updated = true;
          }
        });
        
        if (updated) {
          await saveUsersToFile();
          console.log('Periodic sync completed successfully');
        }
      }
    } catch (error) {
      console.warn('Periodic sync failed:', error.message);
    }
  }
}, 10 * 60 * 1000); // 10 minutes

// Add a timeout function for Firebase operations with retry logic
const withTimeoutAndRetry = async (operation, ms = 3000, retries = 2) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await Promise.race([
        operation(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
  ]);
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Firebase operation failed, retrying... (${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1))); // Faster retry with shorter backoff
    }
  }
};

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
    
    // Always save to persistent storage first for immediate availability
    users.set(apiKey, user);
    await saveUsersToFile();
    
    // Try to sync with Firebase in background (non-blocking)
    if (db) {
      this.syncUserToFirebaseOnCreate(user).catch(error => {
        console.warn('Background Firebase sync failed:', error.message);
      });
    }
    
    return user;
  }
  
  // Background sync method for user creation (non-blocking)
  static async syncUserToFirebaseOnCreate(user) {
    if (!db) return;
    
    try {
      await withTimeoutAndRetry(async () => {
        await db.ref('users/' + user.apiKey).set({
          id: user.id,
          email: user.email,
          apiKey: user.apiKey,
          googleAccessToken: user.googleAccessToken,
          googleRefreshToken: user.googleRefreshToken,
          createdAt: user.createdAt.toISOString(),
          lastAccessed: user.lastAccessed.toISOString()
        });
      }, 3000, 2);
      console.log('User synced to Firebase successfully');
    } catch (error) {
      console.warn('Background Firebase sync failed:', error.message);
    }
  }

  // Get user by API key
  static async getUserByApiKey(apiKey) {
    // Always check persistent storage first for fast response
    const user = users.get(apiKey);
    if (user) {
      user.updateLastAccessed();
      // Save to persistent storage immediately
      await saveUsersToFile();
      
      // Try to sync with Firebase in background (non-blocking)
      if (db) {
        this.syncUserToFirebase(user).catch(error => {
          console.warn('Background Firebase sync failed:', error.message);
        });
      }
      
      return user;
    }
    
    // If not found in persistent storage and Firebase is configured, try Firebase
    if (db) {
      try {
        const snapshot = await withTimeoutAndRetry(async () => {
          return await db.ref('users/' + apiKey).once('value');
        }, 5000, 2);
        
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
        
        // Add to persistent storage for future fast access
        users.set(apiKey, user);
        await saveUsersToFile();
        
        return user;
      } catch (error) {
        console.error('Failed to get user from Firebase:', error.message);
        return null;
      }
    }
    
    return null;
  }
  
  // Background sync method (non-blocking)
  static async syncUserToFirebase(user) {
    if (!db) return;
    
    try {
      await withTimeoutAndRetry(async () => {
        await db.ref('users/' + user.apiKey).update({
          lastAccessed: user.lastAccessed.toISOString()
        });
      }, 3000, 1);
    } catch (error) {
      // Silently fail - this is background operation
      console.warn('Background Firebase sync failed:', error.message);
    }
  }

  // Add Google tokens to user
  static async addGoogleTokensToUser(apiKey, accessToken, refreshToken) {
    // Check persistent storage first
    let user = users.get(apiKey);
    if (!user) {
      return null;
    }
    
    // Update tokens in persistent storage immediately
    user.setGoogleTokens(accessToken, refreshToken);
    user.updateLastAccessed();
    await saveUsersToFile();
    
    // Try to sync with Firebase in background (non-blocking)
    if (db) {
      this.syncGoogleTokensToFirebase(apiKey, accessToken, refreshToken).catch(error => {
        console.warn('Background Firebase sync failed:', error.message);
      });
    }
    
    return user;
  }
  
  // Background sync method for Google tokens (non-blocking)
  static async syncGoogleTokensToFirebase(apiKey, accessToken, refreshToken) {
    if (!db) return;
    
    try {
      await withTimeoutAndRetry(async () => {
        await db.ref('users/' + apiKey).update({
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
          lastAccessed: new Date().toISOString()
        });
      }, 3000, 2);
      console.log('Google tokens synced to Firebase successfully');
    } catch (error) {
      console.warn('Background Firebase sync failed:', error.message);
    }
  }

  // Get all users (for admin purposes)
  static async getAllUsers() {
    // If Firebase is configured, get all from Realtime Database
    if (db) {
      try {
        const snapshot = await withTimeoutAndRetry(async () => {
          return await db.ref('users').once('value');
        }, 8000, 3);
        
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
        console.error('Failed to get all users from Firebase after retries, returning persistent storage users:', error.message);
        // Fallback to persistent storage
        return Array.from(users.values());
      }
    } else {
      // Fallback to persistent storage
      return Array.from(users.values());
    }
  }

  // Delete a user
  static async deleteUser(apiKey) {
    // If Firebase is configured, delete from Realtime Database
    if (db) {
      try {
        await withTimeoutAndRetry(async () => {
          await db.ref('users/' + apiKey).remove();
        }, 5000, 3);
        
        // Also remove from persistent storage
        const deleted = users.delete(apiKey);
        await saveUsersToFile();
        return deleted;
      } catch (error) {
        console.error('Failed to delete user from Firebase after retries, deleting from persistent storage:', error.message);
        // Fallback to persistent storage
        const deleted = users.delete(apiKey);
        await saveUsersToFile();
        return deleted;
      }
    } else {
      // Fallback to persistent storage
      const deleted = users.delete(apiKey);
      await saveUsersToFile();
      return deleted;
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