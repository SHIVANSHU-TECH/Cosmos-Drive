import { NextResponse } from 'next/server';

// Proxy to backend server for embedded file browser
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');
    const folderId = searchParams.get('folderid');
    const allowDownload = searchParams.get('allowdl') !== 'no';
    
    // Validate required parameters
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required. Please provide your API key in the "key" query parameter.' },
        { status: 400 }
      );
    }
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required. Please provide the folder ID in the "folderid" query parameter.' },
        { status: 400 }
      );
    }
    
    // Forward the request to our backend server with API key in header
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/embed/folder/${folderId}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
    
    const response = await fetch(backendUrl, {
      headers: {
        'X-API-Key': apiKey
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your API key and try again.' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Add download permission to the response
    const result = {
      ...data,
      allowDownload
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error proxying embed request:', error);
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out. Please try again.' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch folder contents' },
      { status: 500 }
    );
  }
}