'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getAuthUrl } from '@/utils/api';

export default function OAuthLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Getting auth URL...'); // Debug log
      console.log('Process env:', process.env); // Debug log
      const authUrl = await getAuthUrl();
      console.log('Auth URL:', authUrl); // Debug log
      window.location.href = authUrl;
    } catch (err) {
      console.error('Error getting auth URL:', err); // Debug log
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center mb-6">
          <svg className="h-10 w-10 text-primary mr-3" fill="none" viewBox="0 0 48 48">
            <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
          </svg>
          <h2 className="text-2xl font-bold text-foreground">Cosmos Drive</h2>
        </div>
        
        <div className="mb-6">
          <p className="text-foreground/90 text-center mb-4">
            Sign in with your Google account to access your Google Drive files.
          </p>
          
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-md transition-colors ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path fill="#ffffff" d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
            </svg>
            <span className="text-white font-medium">
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </span>
          </button>
        </div>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-foreground/70">Or continue with</span>
          </div>
        </div>
        
        <div className="mt-6">
          <a 
            href="/login" 
            className="w-full block text-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Use Access Token
          </a>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
            Error: {error}
          </div>
        )}
        
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
          <p className="font-medium">Note for Developers:</p>
          <p>If you're seeing access denied errors, make sure to add test users in the Google Cloud Console under "APIs & Services" &gt; "OAuth consent screen" &gt; "Test users".</p>
        </div>
      </div>
    </div>
  );
}