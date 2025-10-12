'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function Login() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      setError('Please enter an access token');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Validate the token by making a test request to the backend
      const response = await fetch('/api/private/drive/folder/root', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        login(token);
      } else if (response.status === 401 || response.status === 403) {
        setError('Invalid access token. Please check your token and try again.');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to validate token. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
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
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="token" className="block text-sm font-medium text-foreground mb-1">
              Access Token
            </label>
            <input
              type="password"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-foreground"
              placeholder="Enter your access token"
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className={`w-full py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-primary text-white hover:bg-primary/80'
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Validating...' : 'Access Files'}
          </button>
        </form>
        
        <div className="mt-6 text-sm text-foreground/90">
          <p className="mb-2">To generate an access token:</p>
          <ol className="list-decimal list-inside space-y-1 mb-3 text-foreground/80">
            <li>Go to the Google Cloud Console</li>
            <li>Create or select a project</li>
            <li>Enable the Google Drive API</li>
            <li>Create credentials (OAuth client ID or API key)</li>
          </ol>
          <p className="mb-2">For testing purposes, you can also use the OAuth 2.0 flow by clicking "Sign in with Google" on the main page.</p>
          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
            <p className="font-medium">Note for Developers:</p>
            <p>If you're seeing access denied errors, make sure to add test users in the Google Cloud Console under "APIs & Services" &gt; "OAuth consent screen" &gt; "Test users".</p>
          </div>
          <p className="mt-3 text-xs text-foreground/50">
            Note: This token provides access to private Google Drive files. Keep it secure.
          </p>
        </div>
      </div>
    </div>
  );
}