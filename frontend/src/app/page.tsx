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
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    // Check for dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPrefersDark);
    }
  }, []);
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</p>
      </div>
    </div>
  );
}

// Error fallback component
function HomePageError({ error }: { error: string }) {
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    // Check for dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPrefersDark);
    }
  }, []);
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
      <div className={`max-w-md w-full rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${darkMode ? 'bg-red-900' : 'bg-red-100'}`}>
            <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className={`mt-4 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Error</h3>
          <div className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
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
  const [darkMode, setDarkMode] = useState(false);

  // Initialize dark mode
  useEffect(() => {
    // Check for dark mode preference in localStorage or system preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      // Check system preference
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPrefersDark);
    }
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    // Save preference to localStorage
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

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

  // Show loading state while exchanging code
  if (isExchangingCode) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Authenticating with Google...</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, show authentication method selection or login screen
  if (!isAuthenticated) {
    if (!authMethod) {
      return (
        <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
          <div className={`max-w-md w-full rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>Access Google Drive Files</h2>
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Show OAuth error if present */}
            {oauthError && (
              <div className={`mb-4 p-3 rounded text-sm ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`}>
                Error: {oauthError}
              </div>
            )}
            
            <div className="space-y-4">
              <button
                onClick={() => setAuthMethod('oauth')}
                className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-md transition-colors ${
                  darkMode 
                    ? 'border border-gray-600 text-white hover:bg-gray-700' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
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
                className={`w-full py-3 px-4 rounded-md transition-colors font-medium ${
                  darkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Use Access Token
              </button>
            </div>
            
            <div className={`mt-6 p-3 rounded text-sm ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
              <p className="font-medium">Note for Developers:</p>
              <p>If you're seeing access denied errors, make sure to add test users in the Google Cloud Console under "APIs & Services" &gt; "OAuth consent screen" &gt; "Test users".</p>
            </div>
            
            <div className={`mt-4 text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Verifying authentication...</p>
          <button
            onClick={logout}
            className={`mt-4 px-4 py-2 rounded-md transition-colors ${
              darkMode 
                ? 'bg-red-700 text-white hover:bg-red-600' 
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className={`min-h-screen p-2 sm:p-4 md:p-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
          <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Google Drive File Browser</h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            <a 
              href="/api-keys" 
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-md transition-colors text-sm sm:text-base ${
                darkMode 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              API Keys
            </a>
            <a 
              href="/google-tokens" 
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-md transition-colors text-sm sm:text-base ${
                darkMode 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              Google Tokens
            </a>
            <a 
              href="/api-docs" 
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-md transition-colors text-sm sm:text-base ${
                darkMode 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              API Docs
            </a>
            <button
              onClick={logout}
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-md transition-colors text-sm sm:text-base ${
                darkMode 
                  ? 'bg-red-700 text-white hover:bg-red-600' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              Logout
            </button>
          </div>
        </div>
        
        <div className={`mb-4 sm:mb-6 p-3 sm:p-4 md:p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Enter Google Drive Folder ID</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="Enter folder ID or full Google Drive URL"
              className={`flex-1 px-2 py-1 sm:px-3 sm:py-2 rounded-md focus:outline-none focus:ring-2 text-sm sm:text-base ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' 
                  : 'border border-gray-300 focus:ring-blue-500'
              }`}
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
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-md transition-colors text-sm sm:text-base font-medium ${
                darkMode 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Load Folder
            </button>
          </div>
          <p className={`mt-2 text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            To get a folder ID, share the folder and copy the ID from the URL.
            Example: https://drive.google.com/drive/folders/FOLDER_ID
          </p>
        </div>

        {folderId && (
          <div className={`rounded-lg shadow-md overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
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