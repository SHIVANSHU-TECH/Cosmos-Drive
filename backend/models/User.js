class User {
  constructor(id, email, apiKey, googleAccessToken = null, googleRefreshToken = null) {
    this.id = id;
    this.email = email;
    this.apiKey = apiKey;
    this.googleAccessToken = googleAccessToken;
    this.googleRefreshToken = googleRefreshToken;
    this.createdAt = new Date();
    this.lastAccessed = new Date();
  }

  // Update last accessed time
  updateLastAccessed() {
    this.lastAccessed = new Date();
  }

  // Set Google tokens
  setGoogleTokens(accessToken, refreshToken) {
    this.googleAccessToken = accessToken;
    this.googleRefreshToken = refreshToken;
  }

  // Check if Google tokens are available
  hasGoogleTokens() {
    return this.googleAccessToken && this.googleRefreshToken;
  }
  
  // toJSON method for proper serialization
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      apiKey: this.apiKey,
      googleAccessToken: this.googleAccessToken,
      googleRefreshToken: this.googleRefreshToken,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed
    };
  }
}

module.exports = User;