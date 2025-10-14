// Try to import Firebase, but handle the case where it's not available
let firebaseModule;
try {
  firebaseModule = require('../config/firebase');
} catch (error) {
  console.warn('Firebase module not available');
  firebaseModule = { db: null };
}

const { db } = firebaseModule;

class FirebaseService {
  /**
   * Save user data to Realtime Database
   * @param {string} apiKey - The API key
   * @param {Object} userData - The user data to save
   */
  static async saveUser(apiKey, userData) {
    // If Firebase is not configured, return false
    if (!db) {
      console.warn('Firebase not configured, cannot save user data');
      return false;
    }
    
    try {
      await db.ref('users/' + apiKey).set(userData);
      return true;
    } catch (error) {
      console.error('Error saving user to Realtime Database:', error);
      throw error;
    }
  }

  /**
   * Get user data from Realtime Database
   * @param {string} apiKey - The API key
   * @returns {Object|null} The user data or null if not found
   */
  static async getUser(apiKey) {
    // If Firebase is not configured, return null
    if (!db) {
      console.warn('Firebase not configured, cannot get user data');
      return null;
    }
    
    try {
      const snapshot = await db.ref('users/' + apiKey).once('value');
      if (!snapshot.exists()) {
        return null;
      }
      return snapshot.val();
    } catch (error) {
      console.error('Error getting user from Realtime Database:', error);
      throw error;
    }
  }

  /**
   * Update user data in Realtime Database
   * @param {string} apiKey - The API key
   * @param {Object} userData - The user data to update
   */
  static async updateUser(apiKey, userData) {
    // If Firebase is not configured, do nothing
    if (!db) {
      console.warn('Firebase not configured, cannot update user data');
      return false;
    }
    
    try {
      await db.ref('users/' + apiKey).update(userData);
      return true;
    } catch (error) {
      console.error('Error updating user in Realtime Database:', error);
      throw error;
    }
  }

  /**
   * Delete user from Realtime Database
   * @param {string} apiKey - The API key
   */
  static async deleteUser(apiKey) {
    // If Firebase is not configured, do nothing
    if (!db) {
      console.warn('Firebase not configured, cannot delete user data');
      return false;
    }
    
    try {
      await db.ref('users/' + apiKey).remove();
      return true;
    } catch (error) {
      console.error('Error deleting user from Realtime Database:', error);
      throw error;
    }
  }

  /**
   * Get all users from Realtime Database
   * @returns {Array} Array of user data
   */
  static async getAllUsers() {
    // If Firebase is not configured, return empty array
    if (!db) {
      console.warn('Firebase not configured, cannot get all users');
      return [];
    }
    
    try {
      const snapshot = await db.ref('users').once('value');
      const users = [];
      
      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          const userData = childSnapshot.val();
          users.push({
            apiKey: childSnapshot.key,
            ...userData
          });
        });
      }
      
      return users;
    } catch (error) {
      console.error('Error getting all users from Realtime Database:', error);
      throw error;
    }
  }
}

module.exports = FirebaseService;