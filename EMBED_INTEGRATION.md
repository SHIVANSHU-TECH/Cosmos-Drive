# CollegeXConnect Drive Embedder Integration

This document explains how to use the Google Drive Embedder functionality for CollegeXConnect.

## URL Structure

The embedder uses the following URL structure:

```
https://your-domain.com/embed?key=API_KEY&folderid=FOLDER_ID&allowdl=yes
```

### Parameters

- `key` (required): Your API key for authentication
- `folderid` (required): The Google Drive folder ID to display
- `allowdl` (optional): Set to "no" to disable download buttons (default: "yes")

## Example Usage

```
https://googledriveembedder.collegefam.com/embed?key=ckey_abc123def456&folderid=1qejHdencAoQmCKISAfTpVy4O-UQ-Yqf1&allowdl=no
```

This URL will:
1. Authenticate using the provided API key
2. Display files from the specified Google Drive folder
3. Hide download buttons (due to `allowdl=no`)

## How It Works

1. The embed page extracts parameters from the URL
2. It makes a request to the backend API with the API key
3. The backend validates the API key and fetches files from Google Drive
4. Files are displayed in a clean, responsive interface
5. Download buttons are shown/hidden based on the `allowdl` parameter

## API Key Management

To generate an API key:

1. Visit your application's API key management page
2. Create a new API key
3. Associate Google OAuth tokens with your API key (optional but recommended for private folders)

## Customization

The embed interface is designed to be responsive and work on both desktop and mobile devices. The styling uses Tailwind CSS classes for a clean, modern appearance.

## Security

- All API requests are authenticated using API keys
- Private folders require associated Google OAuth tokens
- Download permissions can be controlled via the `allowdl` parameter