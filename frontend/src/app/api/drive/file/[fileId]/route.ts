import { NextResponse } from 'next/server';

// Proxy to backend server
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    // Await params properly
    const { fileId } = await params;
    
    // Get the authorization header from the incoming request
    const authHeader = request.headers.get('authorization');
    
    // Determine if we should use public or private endpoint
    const endpoint = authHeader ? 'private' : 'public';
    
    // Forward the request to our backend server
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/${endpoint}/drive/file/${fileId}`;
    
    const response = await fetch(backendUrl, {
      headers: {
        'Authorization': authHeader || ''
      }
    });
    
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { error: 'Authentication failed. Please log in again.' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file details' },
      { status: 500 }
    );
  }
}