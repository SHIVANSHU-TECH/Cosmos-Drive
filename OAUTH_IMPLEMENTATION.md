# OAuth 2.0 Implementation

This document explains how the OAuth 2.0 authentication is implemented in the Google Drive Embed Tool.

## Overview

The OAuth 2.0 implementation allows users to authenticate with their Google accounts directly, providing a more secure and user-friendly experience compared to sharing access tokens.

## Implementation Details

### Backend

1. **Service Layer** (`backend/services/driveService.js`):
   - Added functions for generating OAuth2 authentication URLs
   - Added functions for exchanging authorization codes for tokens
   - Enhanced authenticated Drive client initialization

2. **Authentication Controller** (`backend/controllers/authController.js`):
   - Handles generating authentication URLs
   - Processes OAuth2 callbacks and exchanges codes for tokens

3. **Routes** (`server.js`):
   - Added new endpoints for OAuth2 flow:
     - `/api/auth/url` - Generate authentication URL
     - `/api/auth/callback` - Handle OAuth2 callback

### Frontend

1. **OAuth Login Component** (`frontend/src/components/OAuthLogin.tsx`):
   - Provides a "Sign in with Google" button
   - Handles the OAuth2 flow in the frontend
   - Exchanges authorization codes for tokens

2. **Main Page** (`frontend/src/app/page.tsx`):
   - Updated to show authentication method selection
   - Supports both OAuth2 and token-based authentication

3. **Callback Page** (`frontend/src/app/auth/callback/page.tsx`):
   - Handles the redirect from Google OAuth2
   - Processes the authorization code

## Environment Variables

### Backend (`.env`)

```
# Google Drive API Key for public access
GOOGLE_API_KEY=your_google_api_key_here

# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
REDIRECT_URI=http://localhost:3000/auth/callback

# Server Port
PORT=3001

# Access Token for Private Access (simple token auth)
ACCESS_TOKEN=your_secret_access_token_here
```

## OAuth2 Flow

1. User visits the application and selects "Sign in with Google"
2. Application requests an authentication URL from the backend
3. User is redirected to Google's OAuth2 consent screen
4. User grants permission to access their Google Drive files
5. Google redirects back to the application with an authorization code
6. Application exchanges the authorization code for access tokens
7. Access token is stored and used for subsequent API requests

## Security Considerations

1. **Token Storage**: Access tokens are stored in localStorage, which is accessible to JavaScript on the same domain. For production use, consider using more secure storage mechanisms like HttpOnly cookies.

2. **Token Refresh**: The current implementation doesn't handle token refresh. In a production environment, you should implement proper token refresh mechanisms.

3. **HTTPS**: Always use HTTPS in production to protect tokens in transit.

4. **Redirect URI**: Ensure the redirect URI is properly configured in the Google Cloud Console and matches the application's callback endpoint.

## Google Cloud Console Setup

To use OAuth2 authentication, you need to set up credentials in the Google Cloud Console:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Create OAuth2 credentials:
   - Application type: Web application
   - Authorized redirect URIs: Add your redirect URI (e.g., http://localhost:3000/auth/callback)
5. Copy the Client ID and Client Secret to your `.env` file

## Usage Flow

1. User navigates to the application
2. User selects "Sign in with Google"
3. User is redirected to Google's OAuth2 consent screen
4. User grants permission
5. User is redirected back to the application
6. Application exchanges the authorization code for tokens
7. User can now access their Google Drive files