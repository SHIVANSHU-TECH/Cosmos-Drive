# Private Access Implementation

This document explains how the private access feature is implemented in the Google Drive Embed Tool.

## Overview

The private access feature uses token-based authentication to control access to the application. Users must provide a valid access token to view private Google Drive files.

## Implementation Details

### Backend

1. **Authentication Middleware** (`backend/middleware/auth.js`):
   - Checks for an `Authorization` header with a Bearer token
   - Validates the token against the `ACCESS_TOKEN` environment variable
   - Adds the token to the request object for use in controllers

2. **Service Layer** (`backend/services/driveService.js`):
   - Supports both public and private access methods
   - Uses Google OAuth2 client for private access with user tokens
   - Uses API key authentication for public access

3. **Controllers** (`backend/controllers/driveController.js`):
   - Determine whether to use public or private access based on the presence of a token
   - Handle authentication errors and return appropriate HTTP status codes

4. **Routes** (`server.js`):
   - Separate endpoints for public and private access:
     - `/api/public/*` - No authentication required
     - `/api/private/*` - Authentication required

### Frontend

1. **Authentication Provider** (`frontend/src/components/AuthProvider.tsx`):
   - Manages authentication state using React Context
   - Stores the access token in localStorage
   - Provides login/logout functions

2. **Login Component** (`frontend/src/components/Login.tsx`):
   - Provides a form for users to enter their access token
   - Validates the token by making a test API request
   - Stores the valid token in the authentication context

3. **API Proxy Routes** (`frontend/src/app/api/*`):
   - Forward requests to the appropriate backend endpoints
   - Include the authorization header when a token is available
   - Handle authentication errors and log out the user if needed

4. **File Browser** (`frontend/src/components/DriveFileBrowser.tsx`):
   - Includes the authorization header in all API requests
   - Handles authentication errors by logging out the user
   - Displays appropriate error messages to the user

## Security Considerations

1. **Token Storage**: The access token is stored in localStorage, which is accessible to JavaScript on the same domain. For production use, consider using more secure storage mechanisms.

2. **Token Validation**: The current implementation uses a simple string comparison. In a production environment, you should implement proper JWT validation or database lookup.

3. **HTTPS**: Always use HTTPS in production to protect the access token in transit.

4. **Token Expiration**: Consider implementing token expiration and refresh mechanisms.

## Environment Variables

### Backend (`.env`)

```
# Google Drive API Key for public access
GOOGLE_API_KEY=your_google_api_key_here

# Server Port
PORT=3001

# Access Token for Private Access
ACCESS_TOKEN=your_secret_access_token_here
```

### Frontend (`.env.local`)

```
# Backend server URL
BACKEND_URL=http://localhost:3001
```

## Usage Flow

1. User navigates to the application
2. If not authenticated, the Login component is displayed
3. User enters their access token
4. Token is validated by making a test API request
5. If valid, token is stored and user is redirected to the file browser
6. All subsequent API requests include the authorization header
7. If an API request returns a 401 or 403 error, the user is logged out