'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get the authorization code and error from the URL
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      const errorMessage = `OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`;
      setError(errorMessage);
      // Redirect to home page with error
      router.push(`/?oauth_error=${encodeURIComponent(errorMessage)}`);
      return;
    }
    
    if (code) {
      // Redirect to home page which will handle the code exchange
      router.push(`/?code=${encodeURIComponent(code)}`);
    } else {
      // No code, redirect to home
      router.push('/');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Authenticating with Google...</p>
        {error && <p className="mt-2 text-red-500">Error: {error}</p>}
      </div>
    </div>
  );
}