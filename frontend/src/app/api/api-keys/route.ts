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
    
    const backendResponse = await fetch(`${cleanBackendUrl}/api/users/key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

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
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}