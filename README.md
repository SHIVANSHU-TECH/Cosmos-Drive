# Google Drive Embed Tool

A tool to embed Google Drive folder contents in a website with a nice UI, similar to Steegle Share but custom for your website.

## Features

- Embed Google Drive (or Shared Drive) folder contents with a nice UI
- Search functionality within folders
- Sort capabilities (by name, date, owner)
- Grid view and table view options with mobile responsiveness
- Folder navigation with hierarchy (breadcrumbs, expand/collapse)
- PDF viewing capabilities
- Private access control with token-based authentication
- OAuth 2.0 authentication with Google accounts
- Embedder functionality for external websites

## Setup

### Backend Setup

1. Create a `.env` file in the root directory based on `.env.example`:
   ```
   # Google Drive API Key
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

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the frontend directory:
   ```
   # Backend server URL
   BACKEND_URL=http://localhost:3001
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

## Authentication

This tool supports two authentication methods:

### OAuth 2.0 Authentication (Recommended)

1. Set up OAuth2 credentials in the Google Cloud Console
2. Add your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the backend `.env` file
3. When accessing the application, select "Sign in with Google"
4. Grant permission to access your Google Drive files
5. You'll be redirected back to the application and can browse your files

### Token-Based Authentication

1. Set up an access token in your backend `.env` file:
   ```
   ACCESS_TOKEN=your_secret_access_token_here
   ```

2. When accessing the application, select "Use Access Token"
3. Enter your access token when prompted
4. You'll have access to private Google Drive files

## Embedder Functionality

This tool includes an embedder feature that allows you to embed Google Drive folder contents on external websites.

### URL Structure

```
https://your-domain.com/embed?key=API_KEY&folderid=FOLDER_ID&allowdl=yes
```

### Parameters

- `key` (required): Your API key for authentication
- `folderid` (required): The Google Drive folder ID to display
- `allowdl` (optional): Set to "no" to disable download buttons (default: "yes")

### Example Usage

```
https://googledriveembedder.collegefam.com/embed?key=ckey_abc123def456&folderid=1qejHdencAoQmCKISAfTpVy4O-UQ-Yqf1&allowdl=no
```

This URL will:
1. Authenticate using the provided API key
2. Display files from the specified Google Drive folder
3. Hide download buttons (due to `allowdl=no`)

See [EMBED_INTEGRATION.md](EMBED_INTEGRATION.md) for detailed documentation on the embedder functionality.

## Usage

1. After starting both the backend and frontend servers, navigate to the frontend URL (typically http://localhost:3000).

2. Choose your preferred authentication method:
   - OAuth 2.0 (Recommended): Sign in with your Google account
   - Token-based: Enter your access token

3. Enter a Google Drive folder ID to view its contents.

4. Use the search and sort features to find specific files.

5. Switch between grid and table views for different browsing experiences.

6. Click on folders to navigate into them, and use the breadcrumb trail to navigate back.

7. For PDF files, you can preview them directly in the browser using the "Preview" button.

## Security

- Keep your access tokens secure and do not share them publicly.
- Access tokens provide access to private Google Drive files.
- In a production environment, consider implementing more robust authentication mechanisms.
- Always use HTTPS in production to protect tokens in transit.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.See [EMBED_INTEGRATION.md](EMBED_INTEGRATION.md) for detailed documentation on the embedder functionality.

## Usage

1. After starting both the backend and frontend servers, navigate to the frontend URL (typically http://localhost:3000).

2. Choose your preferred authentication method:
   - OAuth 2.0 (Recommended): Sign in with your Google account
   - Token-based: Enter your access token

3. Enter a Google Drive folder ID to view its contents.

4. Use the search and sort features to find specific files.

5. Switch between grid and table views for different browsing experiences.

6. Click on folders to navigate into them, and use the breadcrumb trail to navigate back.

7. For PDF files, you can preview them directly in the browser using the "Preview" button.

## Security

- Keep your access tokens secure and do not share them publicly.
- Access tokens provide access to private Google Drive files.
- In a production environment, consider implementing more robust authentication mechanisms.
- Always use HTTPS in production to protect tokens in transit.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request."# Cosmos-Drive" 
"# Cosmos-Drive" 
"# Cosmos-Drive" 
"# Cosmos-Drive" 
