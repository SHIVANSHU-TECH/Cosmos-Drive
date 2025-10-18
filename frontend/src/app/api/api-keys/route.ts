import { NextResponse } from 'next/server';

// This route is for client-side applications to create API keys
// In a production environment, this should be secured with proper authentication
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    // Remove trailing slash if present
    const cleanBackendUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
    
    console.log('Forwarding API key request to backend:', `${cleanBackendUrl}/api/users/key`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 seconds timeout
    
    const backendResponse = await fetch(`${cleanBackendUrl}/api/users/key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error('Backend API key creation failed:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        data
      });
      return NextResponse.json(
        { error: data.error || 'Failed to create API key' },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error creating API key:', error);
    if (typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out. Please try again.' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
