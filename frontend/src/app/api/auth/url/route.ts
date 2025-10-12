import { NextResponse } from 'next/server';

// Proxy to backend server
export async function GET() {
  try {
    // Forward the request to our backend server
    const backendUrlEnv = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    // Remove trailing slash if present
    const cleanBackendUrl = backendUrlEnv.endsWith('/') ? backendUrlEnv.slice(0, -1) : backendUrlEnv;
    const backendUrl = `${cleanBackendUrl}/api/auth/url`;
    
    console.log('Forwarding auth URL request to backend:', backendUrl);
    
    const response = await fetch(backendUrl);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response from backend:', text);
      return NextResponse.json(
        { error: 'Received non-JSON response from backend server' },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying request:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication URL: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}