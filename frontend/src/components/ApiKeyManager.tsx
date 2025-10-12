'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function ApiKeyManager() {
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { token } = useAuth();

  const createApiKey = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setApiKey(data.apiKey);
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to create API key');
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
        <h2 className="text-2xl font-bold text-foreground mb-6">API Key Management</h2>
        
        {!success ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-foreground"
                placeholder="Enter your email address"
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
                {error}
              </div>
            )}
            
            <button
              onClick={createApiKey}
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-primary text-white hover:bg-primary/80'
              }`}
            >
              {loading ? 'Creating API Key...' : 'Create API Key'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
              <h3 className="font-bold mb-2">API Key Created Successfully!</h3>
              <p className="mb-4">Please save this API key securely. You won't be able to see it again.</p>
              
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono text-sm break-all">
                {apiKey}
              </div>
            </div>
            
            <button
              onClick={() => {
                setSuccess(false);
                setApiKey('');
                setEmail('');
              }}
              className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors"
            >
              Create Another API Key
            </button>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
          <h3 className="font-bold mb-2">How to use your API key:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Save your API key in a secure location</li>
            <li>Include it in requests using the X-API-Key header</li>
            <li>For private folders, you'll also need to add Google OAuth tokens</li>
          </ol>
        </div>
      </div>
    </div>
  );
}