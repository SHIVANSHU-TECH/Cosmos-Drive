import { NextResponse } from 'next/server';

// This route is for client-side applications to manage Google tokens
// In a production environment, this should be secured with proper authentication
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, accessToken, refreshToken } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Both access token and refresh token are required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const backendResponse = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/users/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ accessToken, refreshToken }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to add Google tokens' },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding Google tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}