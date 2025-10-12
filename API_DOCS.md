# Cosmos Drive API Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
   - [User Management](#user-management)
   - [File Browsing](#file-browsing)
   - [Thumbnails](#thumbnails)
   - [PDF Content](#pdf-content)
3. [Frontend API Routes](#frontend-api-routes)
4. [Usage Examples](#usage-examples)

## Authentication

The Cosmos Drive API supports multiple authentication methods:

1. **Public Access**: For publicly shared Google Drive files
2. **Token Authentication**: Using Google OAuth2 access tokens
3. **API Key Authentication**: For programmatic access to private resources

### API Key Authentication

To access private Google Drive folders, users must create an API key and associate it with their Google OAuth tokens.

#### Creating an API Key

```bash
curl -X POST http://localhost:3001/api/users/key \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

Response:
```json
{
  "apiKey": "ckey_abc123def456ghi789jkl012"
}
```

#### Adding Google Tokens to an API Key

```bash
curl -X POST http://localhost:3001/api/users/tokens \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ckey_abc123def456ghi789jkl012" \
  -d '{
    "accessToken": "ya29.a0AfH6SMC...",
    "refreshToken": "1//0e..."
  }'
```

## API Endpoints

### User Management

#### Create API Key
- **POST** `/api/users/key`
- **Description**: Create a new API key for a user
- **Body**: `{ "email": "user@example.com" }`
- **Response**: `{ "apiKey": "ckey_abc123def456ghi789jkl012" }`

#### Add Google Tokens
- **POST** `/api/users/tokens`
- **Description**: Associate Google OAuth tokens with an API key
- **Headers**: `X-API-Key: ckey_abc123def456ghi789jkl012`
- **Body**: `{ "accessToken": "ya29.a0AfH6SMC...", "refreshToken": "1//0e..." }`
- **Response**: `{ "message": "Tokens added successfully" }`

### File Browsing

#### Get Files from Public Folder
- **GET** `/api/public/drive/folder/:folderId`
- **Description**: Get files from a publicly shared Google Drive folder
- **Parameters**: `folderId` - Google Drive folder ID
- **Response**: JSON array of file objects

#### Get Files from Private Folder
- **GET** `/api/private/drive/folder/:folderId`
- **Description**: Get files from a private Google Drive folder
- **Parameters**: `folderId` - Google Drive folder ID
- **Headers**: `Authorization: Bearer ACCESS_TOKEN`
- **Response**: JSON array of file objects

#### Get File Details
- **GET** `/api/public/drive/file/:fileId`
- **GET** `/api/private/drive/file/:fileId`
- **Description**: Get details of a specific file
- **Parameters**: `fileId` - Google Drive file ID
- **Headers** (private): `Authorization: Bearer ACCESS_TOKEN`
- **Response**: JSON object with file details

#### Get Folder Path
- **GET** `/api/public/drive/path/:folderId`
- **GET** `/api/private/drive/path/:folderId`
- **Description**: Get the path breadcrumbs for a folder
- **Parameters**: `folderId` - Google Drive folder ID
- **Headers** (private): `Authorization: Bearer ACCESS_TOKEN`
- **Response**: JSON array of folder path objects

### Thumbnails

#### Get Public File Thumbnail
- **GET** `/api/public/drive/thumbnail/:fileId`
- **Description**: Get thumbnail for a publicly shared file
- **Parameters**: `fileId` - Google Drive file ID
- **Response**: Image data

#### Get Private File Thumbnail
- **GET** `/api/private/drive/thumbnail/:fileId`
- **Description**: Get thumbnail for a private file
- **Parameters**: `fileId` - Google Drive file ID
- **Headers**: `Authorization: Bearer ACCESS_TOKEN`
- **Response**: Image data

### PDF Content

#### Get PDF Content
- **GET** `/api/private/drive/pdf/:fileId`
- **Description**: Get PDF content for a private file
- **Parameters**: `fileId` - Google Drive file ID
- **Headers**: `Authorization: Bearer ACCESS_TOKEN`
- **Response**: PDF file data

## Frontend API Routes

These routes are accessible via the Next.js frontend and provide the same functionality as the backend API routes, but with additional client-side convenience features.

### API Key Management
- **POST** `/api/api-keys`
- **Description**: Create a new API key (proxies to backend)
- **Body**: `{ "email": "user@example.com" }`
- **Response**: `{ "apiKey": "ckey_abc123def456ghi789jkl012" }`

### Google Token Management
- **POST** `/api/google-tokens`
- **Description**: Add Google tokens to an API key (proxies to backend)
- **Body**: `{ "apiKey": "ckey_abc123def456ghi789jkl012", "accessToken": "...", "refreshToken": "..." }`
- **Response**: `{ "message": "Tokens added successfully" }`

## Web Pages

The following web pages are available for user interaction:

### Home Page
- **URL**: `/`
- **Description**: Main page with Google Drive file browser and authentication options

### API Key Management
- **URL**: `/api-keys`
- **Description**: Page for creating and managing API keys

### Google Token Management
- **URL**: `/google-tokens`
- **Description**: Page for adding Google OAuth tokens to API keys

### API Documentation
- **URL**: `/api-docs`
- **Description**: Comprehensive API documentation

## Usage Examples

### JavaScript/Node.js Example

```javascript
// Create an API key
async function createApiKey(email) {
  const response = await fetch('/api/api-keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  const data = await response.json();
  return data.apiKey;
}

// Add Google tokens to an API key
async function addGoogleTokens(apiKey, accessToken, refreshToken) {
  const response = await fetch('/api/google-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ accessToken, refreshToken }),
  });
  
  return await response.json();
}

// Get files from a folder using API key authentication
async function getFolderFiles(folderId, apiKey) {
  const response = await fetch(`http://localhost:3001/folder/${folderId}`, {
    headers: {
      'X-API-Key': apiKey,
    },
  });
  
  return await response.json();
}
```

### cURL Examples

```bash
# Create an API key
curl -X POST http://localhost:3000/api/api-keys \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Add Google tokens
curl -X POST http://localhost:3000/api/google-tokens \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ckey_abc123def456ghi789jkl012" \
  -d '{
    "accessToken": "ya29.a0AfH6SMC...",
    "refreshToken": "1//0e..."
  }'

# Get files using API key
curl -H "X-API-Key: ckey_abc123def456ghi789jkl012" \
  http://localhost:3001/folder/1jONzBCcN3aVE5xK9iler48GRt14v33_6
```

### CollegeXConnect Integration

```javascript
// Example integration with CollegeXConnect
const API_KEY = 'your_api_key_here';
const FOLDER_ID = '1jONzBCcN3aVE5xK9iler48GRt14v33_6';

// Fetch PDF files from a Google Drive folder
fetch(`http://localhost:3001/folder/${FOLDER_ID}`, {
  headers: {
    'X-API-Key': API_KEY
  }
})
.then(response => response.json())
.then(data => {
  console.log('Files:', data.files);
  // Display files in your application
})
.catch(error => {
  console.error('Error fetching files:', error);
});
```