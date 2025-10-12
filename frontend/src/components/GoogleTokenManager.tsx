'use client';

import { useState } from 'react';

export default function GoogleTokenManager() {
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const addGoogleTokens = async () => {
    if (!apiKey) {
      setError('Please enter your API key');
      return;
    }
    
    if (!accessToken || !refreshToken) {
      setError('Please enter both access token and refresh token');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/google-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ accessToken, refreshToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Clear the form
        setAccessToken('');
        setRefreshToken('');
      } else {
        setError(data.error || 'Failed to add Google tokens');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">Google Token Management</h2>
        
        {!success ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-foreground mb-1">
                API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-foreground"
                placeholder="Enter your API key"
                disabled={loading}
              />
            </div>
            
            <div>
              <label htmlFor="accessToken" className="block text-sm font-medium text-foreground mb-1">
                Google Access Token
              </label>
              <input
                type="password"
                id="accessToken"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-foreground"
                placeholder="Enter your Google access token"
                disabled={loading}
              />
            </div>
            
            <div>
              <label htmlFor="refreshToken" className="block text-sm font-medium text-foreground mb-1">
                Google Refresh Token
              </label>
              <input
                type="password"
                id="refreshToken"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-foreground"
                placeholder="Enter your Google refresh token"
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
                {error}
              </div>
            )}
            
            <button
              onClick={addGoogleTokens}
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-primary text-white hover:bg-primary/80'
              }`}
            >
              {loading ? 'Adding Tokens...' : 'Add Google Tokens'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
              <h3 className="font-bold mb-2">Google Tokens Added Successfully!</h3>
              <p>Your Google tokens have been associated with your API key.</p>
              <p className="mt-2">You can now access your private Google Drive folders using the Cosmos Drive API.</p>
            </div>
            
            <button
              onClick={() => {
                setSuccess(false);
                setAccessToken('');
                setRefreshToken('');
              }}
              className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors"
            >
              Add More Tokens
            </button>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
          <h3 className="font-bold mb-2">How to get Google tokens:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Complete the OAuth 2.0 flow in your application</li>
            <li>Extract the access token and refresh token from the OAuth response</li>
            <li>Enter them here to associate them with your API key</li>
          </ol>
        </div>
      </div>
    </div>
  );
}