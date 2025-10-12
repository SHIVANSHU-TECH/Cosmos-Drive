'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Login from '@/components/Login';
import OAuthLogin from '@/components/OAuthLogin';
import DriveFileBrowser from '@/components/DriveFileBrowser';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getBackendUrl } from '@/utils/api'; // Import the API utility function

// Loading fallback component
function HomePageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Error fallback component
function HomePageError({ error }: { error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Error</h3>
          <div className="mt-2 text-sm text-gray-500">
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomePageContent() {
  const [folderId, setFolderId] = useState('');
  const { isAuthenticated, logout, token, login } = useAuth();
  const [authMethod, setAuthMethod] = useState<'oauth' | 'token' | null>(null);
  const searchParams = useSearchParams();
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isExchangingCode, setIsExchangingCode] = useState(false);

  // Check for OAuth errors or code in URL parameters
  useEffect(() => {
    const oauthErrorParam = searchParams.get('oauth_error');
    const code = searchParams.get('code');
    
    if (oauthErrorParam) {
      setOauthError(oauthErrorParam);
      // Remove the error parameter from the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle OAuth code exchange
    if (code && !isExchangingCode) {
      setIsExchangingCode(true);
      exchangeCodeForTokens(code);
    }
  }, [searchParams, isExchangingCode]);

  const exchangeCodeForTokens = async (code: string) => {
    try {
      const backendUrl = getBackendUrl();
      const url = `${backendUrl}/api/auth/callback?code=${encodeURIComponent(code)}`;
      
      console.log('Exchanging code for tokens at:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to authenticate: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Save the access token
      if (data.tokens && data.tokens.access_token) {
        login(data.tokens.access_token);
        // Remove the code from the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        throw new Error('No access token received');
      }
    } catch (err) {
      console.error('Error exchanging code for tokens:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setOauthError(errorMessage);
      // Remove the code from the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      setIsExchangingCode(false);
    }
  };

  // If authenticated but no token, logout
  useEffect(() => {
    if (isAuthenticated && !token) {
      logout();
    }
  }, [isAuthenticated, token, logout]);

  // If not authenticated, show authentication method selection or login screen
  if (!isAuthenticated) {
    // Show loading state while exchanging code
    if (isExchangingCode) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Authenticating with Google...</p>
          </div>
        </div>
      );
    }
    
    if (!authMethod) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-center mb-6">Access Google Drive Files</h2>
            
            {/* Show OAuth error if present */}
            {oauthError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                Error: {oauthError}
              </div>
            )}
            
            <div className="space-y-4">
              <button
                onClick={() => setAuthMethod('oauth')}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium">Sign in with Google</span>
              </button>
              
              <button
                onClick={() => setAuthMethod('token')}
                className="w-full py-3 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
              >
                Use Access Token
              </button>
            </div>
            
            <div className="mt-6 p-3 bg-blue-100 text-blue-700 rounded text-sm">
              <p className="font-medium">Note for Developers:</p>
              <p>If you're seeing access denied errors, make sure to add test users in the Google Cloud Console under "APIs & Services" &gt; "OAuth consent screen" &gt; "Test users".</p>
            </div>
            
            <div className="mt-4 text-sm text-gray-600 text-center">
              <p>Choose how you'd like to access your Google Drive files</p>
            </div>
          </div>
        </div>
      );
    }
    
    if (authMethod === 'oauth') {
      return <OAuthLogin />;
    }
    
    if (authMethod === 'token') {
      return <Login />;
    }
  }

  // Show loading state while token is being verified
  if (isAuthenticated && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
          <button
            onClick={logout}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-2 sm:p-4 md:p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Google Drive File Browser</h1>
          <div className="flex gap-2 flex-wrap">
            <a 
              href="/api-keys" 
              className="px-3 py-1 sm:px-4 sm:py-2 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors text-sm sm:text-base"
            >
              API Keys
            </a>
            <a 
              href="/google-tokens" 
              className="px-3 py-1 sm:px-4 sm:py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm sm:text-base"
            >
              Google Tokens
            </a>
            <a 
              href="/api-docs" 
              className="px-3 py-1 sm:px-4 sm:py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-sm sm:text-base"
            >
              API Docs
            </a>
            <button
              onClick={logout}
              className="px-3 py-1 sm:px-4 sm:py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm sm:text-base"
            >
              Logout
            </button>
          </div>
        </div>
        
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 md:p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3">Enter Google Drive Folder ID</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="Enter folder ID or full Google Drive URL"
              className="flex-1 px-2 py-1 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <button
              onClick={() => {
                // Extract folder ID from URL if full URL is provided
                let id = folderId;
                if (folderId.includes('drive.google.com/drive/folders/')) {
                  const match = folderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
                  if (match && match[1]) {
                    id = match[1];
                  }
                }
                // Also remove any query parameters
                if (id.includes('?')) {
                  id = id.split('?')[0];
                }
                setFolderId(id);
              }}
              className="px-3 py-1 sm:px-4 sm:py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm sm:text-base"
            >
              Load Folder
            </button>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-gray-600">
            To get a folder ID, share the folder and copy the ID from the URL.
            Example: https://drive.google.com/drive/folders/FOLDER_ID
          </p>
        </div>

        {folderId && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <DriveFileBrowser initialFolderId={extractFolderId(folderId)} />
          </div>
        )}
      </div>
    </main>
  );
}

// Add this helper function before the component definition
function extractFolderId(input: string): string {
  let id = input;
  // Extract folder ID from URL if full URL is provided
  if (id.includes('drive.google.com/drive/folders/')) {
    const match = id.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      id = match[1];
    }
  }
  
  // Also remove any query parameters
  if (id.includes('?')) {
    id = id.split('?')[0];
  }
  
  return id;
}

// Main component with Suspense boundary
export default function Home() {
  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageContent />
    </Suspense>
  );
}