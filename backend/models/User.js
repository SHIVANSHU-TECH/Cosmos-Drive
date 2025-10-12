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
}

module.exports = User;